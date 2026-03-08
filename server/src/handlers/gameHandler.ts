import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { RoomStatus, RoomSettings, PlayerScore } from '../types'
import { RoomModel } from '../models/Room'
import { startRoomTimer } from '../lib/timerUtils'

const MAX_WORD_LENGTH = 100
const SNAPSHOT_TIMEOUT_MS = 10_000
const SLIDE_DURATION_MS = 5_000

function startSlideshow(
  io: Server,
  roomId: string,
  snapshots: Map<string, string>,
  lobbyParticipants: Map<string, Map<string, string>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomStatuses: Map<string, RoomStatus>,
  useMemory: () => boolean,
): void {
  const names = lobbyParticipants.get(roomId) ?? new Map<string, string>()
  const players = [...snapshots.entries()].map(([userId, canvasData]) => ({
    userId,
    userName: names.get(userId) ?? 'Unknown',
    canvasData,
  }))
  const total = players.length

  if (total === 0) {
    roomStatuses.set(roomId, 'results')
    if (!useMemory()) {
      RoomModel.updateOne({ id: roomId }, { status: 'results' }).catch(() => {})
    }
    io.to(roomId).emit('game:results', [])
    return
  }

  let index = 0
  roomStatuses.set(roomId, 'review')
  if (!useMemory()) {
    RoomModel.updateOne({ id: roomId }, { status: 'review' }).catch(() => {})
  }

  function sendNext(): void {
    if (index >= total) {
      const votes = roomVotes.get(roomId) ?? new Map<string, Map<string, number>>()
      const scores: PlayerScore[] = players
        .map((p) => {
          let totalScore = 0
          let voteCount = 0
          for (const [, targetVotes] of votes) {
            const score = targetVotes.get(p.userId)
            if (score !== undefined) {
              totalScore += score
              voteCount++
            }
          }
          return { userId: p.userId, userName: p.userName, totalScore, voteCount }
        })
        .sort((a, b) => b.totalScore - a.totalScore)

      roomStatuses.set(roomId, 'results')
      if (!useMemory()) {
        RoomModel.updateOne({ id: roomId }, { status: 'results' }).catch(() => {})
      }
      io.to(roomId).emit('game:results', scores)
      roomSlideTimers.delete(roomId)
      return
    }

    const player = players[index]
    io.to(roomId).emit('game:slide', {
      userId: player.userId,
      userName: player.userName,
      canvasData: player.canvasData,
      slideIndex: index,
      total,
    })
    index++
    const handle = setTimeout(sendNext, SLIDE_DURATION_MS)
    roomSlideTimers.set(roomId, handle)
  }

  sendNext()
}

export function triggerReview(
  io: Server,
  roomId: string,
  lobbyParticipants: Map<string, Map<string, string>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  useMemory: () => boolean,
): void {
  const names = lobbyParticipants.get(roomId) ?? new Map<string, string>()
  const participants = [...names.entries()].map(([id, name]) => ({ id, name }))

  roomVotes.set(roomId, new Map())
  roomSnapshots.set(roomId, new Map())

  io.to(roomId).emit('game:review-start', participants)

  const handle = setTimeout(() => {
    roomSnapshotTimers.delete(roomId)
    const snapshots = roomSnapshots.get(roomId) ?? new Map<string, string>()
    startSlideshow(io, roomId, snapshots, lobbyParticipants, roomVotes, roomSlideTimers, roomStatuses, useMemory)
  }, SNAPSHOT_TIMEOUT_MS)
  roomSnapshotTimers.set(roomId, handle)
}

export function registerGameHandlers(
  io: Server,
  socket: AuthenticatedSocket,
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  roomSettings: Map<string, RoomSettings>,
  roomOwners: Map<string, string>,
  roomGameWords: Map<string, string>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  useMemory: () => boolean,
): void {
  socket.on('game:set-word', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const roomId = p.roomId
    const word = p.word
    if (typeof roomId !== 'string' || !roomId) return
    if (typeof word !== 'string' || !word.trim() || word.length > MAX_WORD_LENGTH) return
    if (roomOwners.get(roomId) !== socket.userId) return
    if (roomStatuses.get(roomId) !== 'word-entry') return

    const trimmed = word.trim()
    roomGameWords.set(roomId, trimmed)

    const settings = roomSettings.get(roomId) ?? { timerDurationMs: 0, gameMode: 'draw-the-word' as const }
    const startedAt = Date.now()
    roomStatuses.set(roomId, 'started')

    if (!useMemory()) {
      try {
        await RoomModel.updateOne({ id: roomId }, { status: 'started' })
      } catch {
        // Non-fatal
      }
    }

    io.to(roomId).emit('room:started', { settings, startedAt })
    io.to(roomId).emit('game:word-prompt', trimmed)

    if (settings.timerDurationMs > 0) {
      startRoomTimer(roomId, settings.timerDurationMs, roomTimers, () => {
        triggerReview(
          io, roomId, lobbyParticipants, roomVotes, roomSlideTimers,
          roomSnapshotTimers, roomSnapshots, roomStatuses, useMemory,
        )
      })
    }
  })

  socket.on('game:submit-snapshot', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const roomId = p.roomId
    const canvasData = p.canvasData
    if (typeof roomId !== 'string' || !roomId) return
    if (typeof canvasData !== 'string' || !canvasData) return
    if (!canvasData.startsWith('data:image/')) return

    const snapshots = roomSnapshots.get(roomId)
    if (!snapshots) return  // triggerReview not called yet

    snapshots.set(socket.userId, canvasData)

    const participants = lobbyParticipants.get(roomId)
    if (participants && snapshots.size >= participants.size) {
      const snapshotTimer = roomSnapshotTimers.get(roomId)
      if (snapshotTimer !== undefined) {
        clearTimeout(snapshotTimer)
        roomSnapshotTimers.delete(roomId)
      }
      startSlideshow(io, roomId, snapshots, lobbyParticipants, roomVotes, roomSlideTimers, roomStatuses, useMemory)
    }
  })

  socket.on('game:vote', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const roomId = p.roomId
    const targetUserId = p.targetUserId
    const score = p.score
    if (typeof roomId !== 'string' || !roomId) return
    if (typeof targetUserId !== 'string' || !targetUserId) return
    if (typeof score !== 'number' || score < 1 || score > 5 || !Number.isInteger(score)) return
    if (targetUserId === socket.userId) return
    if (roomStatuses.get(roomId) !== 'review') return

    const votes = roomVotes.get(roomId)
    if (!votes) return

    const voterMap = votes.get(socket.userId) ?? new Map<string, number>()
    voterMap.set(targetUserId, score)
    votes.set(socket.userId, voterMap)
  })
}
