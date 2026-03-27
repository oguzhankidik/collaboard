import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { RoomStatus, RoomSettings, StoryTurn, StoryBoard } from '../types'
import { cancelRoomTimer, startRoomTimer } from '../lib/timerUtils'

const SNAPSHOT_TIMEOUT_MS = 8_000
const ROUND_TRANSITION_MS = 3_000  // must match client countdown duration

interface StoryMaps {
  lobbyParticipants: Map<string, Map<string, string>>
  roomStatuses: Map<string, RoomStatus>
  roomSettings: Map<string, RoomSettings>
  storyPlayerOrder: Map<string, string[]>
  storyRound: Map<string, number>
  storyBoardHistory: Map<string, Map<string, StoryTurn[]>>
  storyPending: Map<string, Map<string, string | null>>
  storySnapshotTimer: Map<string, ReturnType<typeof setTimeout>>
  roomTimers: Map<string, ReturnType<typeof setTimeout>>
  userSockets: Map<string, string>
  useMemory: () => boolean
}

export function startStoryRound(io: Server, roomId: string, maps: StoryMaps): void {
  const playerOrder = maps.storyPlayerOrder.get(roomId)
  if (!playerOrder || playerOrder.length === 0) return

  const round = maps.storyRound.get(roomId) ?? 0
  const N = playerOrder.length

  if (round >= N) {
    endStoryGame(io, roomId, maps)
    return
  }

  const names = maps.lobbyParticipants.get(roomId) ?? new Map<string, string>()
  const totalRounds = N

  for (let i = 0; i < N; i++) {
    const playerId = playerOrder[i]
    const boardOriginIndex = (i - round + N) % N
    const boardOriginUserId = playerOrder[boardOriginIndex]
    const boardOriginUserName = names.get(boardOriginUserId) ?? 'Unknown'

    const boardTurns = maps.storyBoardHistory.get(roomId)?.get(boardOriginUserId) ?? []
    const lastTurn = boardTurns[boardTurns.length - 1]
    const canvasData = lastTurn?.canvasData ?? ''

    const socketId = maps.userSockets.get(playerId)
    if (socketId) {
      io.to(socketId).emit('story:board-received', {
        round,
        totalRounds,
        boardOriginUserId,
        boardOriginUserName,
        canvasData,
      })
    }
  }

  const settings = maps.roomSettings.get(roomId)
  const durationMs = settings?.timerDurationMs ?? 0

  if (durationMs > 0) {
    setTimeout(() => {
      const startedAt = Date.now()
      io.to(roomId).emit('story:round-started', { startedAt })
      startRoomTimer(roomId, durationMs, maps.roomTimers, () => {
        requestStorySnapshots(io, roomId, maps)
      })
    }, ROUND_TRANSITION_MS)
  }
}

export function requestStorySnapshots(io: Server, roomId: string, maps: StoryMaps): void {
  const playerOrder = maps.storyPlayerOrder.get(roomId)
  if (!playerOrder) return

  const pending = new Map<string, string | null>(playerOrder.map((uid) => [uid, null]))
  maps.storyPending.set(roomId, pending)

  for (const playerId of playerOrder) {
    const socketId = maps.userSockets.get(playerId)
    if (socketId) {
      io.to(socketId).emit('story:snapshot-request')
    }
  }

  const fallback = setTimeout(() => {
    maps.storySnapshotTimer.delete(roomId)
    finalizeTurnSnapshots(io, roomId, maps)
  }, SNAPSHOT_TIMEOUT_MS)

  maps.storySnapshotTimer.set(roomId, fallback)
}

export function finalizeTurnSnapshots(io: Server, roomId: string, maps: StoryMaps): void {
  const playerOrder = maps.storyPlayerOrder.get(roomId)
  if (!playerOrder) return

  const round = maps.storyRound.get(roomId) ?? 0
  const N = playerOrder.length
  const names = maps.lobbyParticipants.get(roomId) ?? new Map<string, string>()
  const pending = maps.storyPending.get(roomId) ?? new Map<string, string | null>()

  for (let i = 0; i < N; i++) {
    const playerId = playerOrder[i]
    const boardOriginIndex = (i - round + N) % N
    const boardOriginUserId = playerOrder[boardOriginIndex]
    const userName = names.get(playerId) ?? 'Unknown'
    const canvasData = pending.get(playerId) ?? ''

    const boardHistory = maps.storyBoardHistory.get(roomId)
    if (boardHistory) {
      const turns = boardHistory.get(boardOriginUserId) ?? []
      turns.push({ turnIndex: round, userId: playerId, userName, canvasData })
      boardHistory.set(boardOriginUserId, turns)
    }
  }

  maps.storyPending.delete(roomId)
  maps.storyRound.set(roomId, round + 1)

  startStoryRound(io, roomId, maps)
}

export function endStoryGame(io: Server, roomId: string, maps: StoryMaps): void {
  cancelRoomTimer(roomId, maps.roomTimers)

  const timer = maps.storySnapshotTimer.get(roomId)
  if (timer !== undefined) {
    clearTimeout(timer)
    maps.storySnapshotTimer.delete(roomId)
  }

  const names = maps.lobbyParticipants.get(roomId) ?? new Map<string, string>()
  const boardHistory = maps.storyBoardHistory.get(roomId) ?? new Map<string, StoryTurn[]>()
  const boards: StoryBoard[] = []

  for (const [originUserId, turns] of boardHistory.entries()) {
    boards.push({
      originUserId,
      originUserName: names.get(originUserId) ?? 'Unknown',
      turns,
    })
  }

  maps.roomStatuses.set(roomId, 'story-results')
  io.to(roomId).emit('story:results', boards)

  maps.storyPlayerOrder.delete(roomId)
  maps.storyRound.delete(roomId)
  maps.storyBoardHistory.delete(roomId)
  maps.storyPending.delete(roomId)
}

export function registerStoryHandlers(
  io: Server,
  socket: AuthenticatedSocket,
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  roomSettings: Map<string, RoomSettings>,
  storyPlayerOrder: Map<string, string[]>,
  storyRound: Map<string, number>,
  storyBoardHistory: Map<string, Map<string, StoryTurn[]>>,
  storyPending: Map<string, Map<string, string | null>>,
  storySnapshotTimer: Map<string, ReturnType<typeof setTimeout>>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  userSockets: Map<string, string>,
  useMemory: () => boolean,
): void {
  const maps: StoryMaps = {
    lobbyParticipants,
    roomStatuses,
    roomSettings,
    storyPlayerOrder,
    storyRound,
    storyBoardHistory,
    storyPending,
    storySnapshotTimer,
    roomTimers,
    userSockets,
    useMemory,
  }

  socket.on('story:submit-snapshot', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return
    const p = payload as Record<string, unknown>
    const roomId = p.roomId
    const canvasData = p.canvasData
    if (typeof roomId !== 'string' || !roomId) return
    if (typeof canvasData !== 'string') return
    if (canvasData && !canvasData.startsWith('data:image/')) return

    const pending = maps.storyPending.get(roomId)
    if (!pending) return
    if (!pending.has(socket.userId)) return
    if (pending.get(socket.userId) !== null) return

    pending.set(socket.userId, canvasData)

    const allSubmitted = [...pending.values()].every((v) => v !== null)
    if (allSubmitted) {
      const timer = maps.storySnapshotTimer.get(roomId)
      if (timer !== undefined) {
        clearTimeout(timer)
        maps.storySnapshotTimer.delete(roomId)
      }
      finalizeTurnSnapshots(io, roomId, maps)
    }
  })
}
