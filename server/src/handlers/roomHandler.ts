import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import { RoomModel } from '../models/Room'
import { BoardModel } from '../models/Board'
import type { Room, RoomStatus, ChatMessage, RoomSettings, GameMode } from '../types'
import { cancelRoomTimer, startRoomTimer } from '../lib/timerUtils'
import { triggerReview } from './gameHandler'

const MAX_PARTICIPANTS = 20
const VALID_TIMER_DURATIONS_MS = new Set([0, 300_000, 600_000, 900_000, 1_800_000, 3_600_000])
const VALID_GAME_MODES = new Set<GameMode>(['collaborative', 'draw-the-word'])
const ROOM_DELETION_GRACE_MS = 15_000
const DEFAULT_SETTINGS: RoomSettings = { timerDurationMs: 0, gameMode: 'collaborative' }

async function deleteRoom(
  roomId: string,
  memoryRooms: Room[],
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  roomMessages: Map<string, ChatMessage[]>,
  roomSettings: Map<string, RoomSettings>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSessionStartAt: Map<string, number>,
  roomDeletionTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomOwners: Map<string, string>,
  roomGameWords: Map<string, string>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  useMemory: () => boolean,
): Promise<void> {
  cancelRoomTimer(roomId, roomTimers)
  roomDeletionTimers.delete(roomId)
  lobbyParticipants.delete(roomId)
  roomStatuses.delete(roomId)
  roomMessages.delete(roomId)
  roomSettings.delete(roomId)
  roomSessionStartAt.delete(roomId)
  roomOwners.delete(roomId)
  roomGameWords.delete(roomId)
  roomSnapshots.delete(roomId)
  roomVotes.delete(roomId)

  const snapshotTimer = roomSnapshotTimers.get(roomId)
  if (snapshotTimer !== undefined) {
    clearTimeout(snapshotTimer)
    roomSnapshotTimers.delete(roomId)
  }
  const slideTimer = roomSlideTimers.get(roomId)
  if (slideTimer !== undefined) {
    clearTimeout(slideTimer)
    roomSlideTimers.delete(roomId)
  }

  if (useMemory()) {
    const idx = memoryRooms.findIndex((r) => r.id === roomId)
    if (idx !== -1) memoryRooms.splice(idx, 1)
  } else {
    await RoomModel.deleteOne({ id: roomId })
    await BoardModel.deleteOne({ roomId })
  }
}

async function handleParticipantLeave(
  io: Server,
  userId: string,
  roomId: string,
  memoryRooms: Room[],
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  roomMessages: Map<string, ChatMessage[]>,
  roomSettings: Map<string, RoomSettings>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSessionStartAt: Map<string, number>,
  roomDeletionTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomOwners: Map<string, string>,
  roomGameWords: Map<string, string>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  useMemory: () => boolean,
): Promise<void> {
  let currentOwnerId: string | undefined
  if (useMemory()) {
    currentOwnerId = memoryRooms.find((r) => r.id === roomId)?.ownerId
  } else {
    const doc = await RoomModel.findOne({ id: roomId })
    currentOwnerId = doc?.ownerId
  }

  const names = lobbyParticipants.get(roomId)
  names?.delete(userId)

  if (!useMemory()) {
    await RoomModel.updateOne({ id: roomId }, { $pull: { participants: userId } })
  }

  io.to(roomId).emit('user:left', userId)

  const remaining = [...(names?.keys() ?? [])]

  if (remaining.length === 0) {
    const handle = setTimeout(() => {
      deleteRoom(
        roomId, memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers,
        roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
        roomVotes, roomSlideTimers, useMemory,
      )
    }, ROOM_DELETION_GRACE_MS)
    roomDeletionTimers.set(roomId, handle)
  } else if (currentOwnerId === userId) {
    const newOwnerId = remaining[0]

    if (useMemory()) {
      const room = memoryRooms.find((r) => r.id === roomId)
      if (room) room.ownerId = newOwnerId
    } else {
      await RoomModel.updateOne({ id: roomId }, { ownerId: newOwnerId })
    }

    roomOwners.set(roomId, newOwnerId)
    io.to(roomId).emit('room:host_changed', newOwnerId)
  }
}

export function registerRoomHandlers(
  io: Server,
  socket: AuthenticatedSocket,
  memoryRooms: Room[],
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  roomMessages: Map<string, ChatMessage[]>,
  roomSettings: Map<string, RoomSettings>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSessionStartAt: Map<string, number>,
  roomDeletionTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomOwners: Map<string, string>,
  roomGameWords: Map<string, string>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  useMemory: () => boolean,
): void {
  socket.on('room:join', async (roomId: string) => {
    try {
      const currentRooms = [...socket.rooms].filter((r) => r !== socket.id)
      if (currentRooms.length > 0 && !currentRooms.includes(roomId)) {
        socket.emit('error', { message: 'You are already in another room' })
        return
      }

      let room: Room | null = null

      if (useMemory()) {
        room = memoryRooms.find((r) => r.id === roomId) ?? null
      } else {
        const doc = await RoomModel.findOne({ id: roomId })
        if (doc) {
          room = {
            id: doc.id,
            name: doc.name,
            ownerId: doc.ownerId,
            participants: doc.participants,
            createdAt: doc.createdAt?.toISOString() ?? '',
            status: (doc.status as RoomStatus) ?? 'waiting',
            isPrivate: (doc.isPrivate as boolean) ?? false,
          }
        }
      }

      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (
        room.participants.length >= MAX_PARTICIPANTS &&
        !room.participants.includes(socket.userId)
      ) {
        socket.emit('error', { message: 'Room is full' })
        return
      }

      const deletionHandle = roomDeletionTimers.get(roomId)
      if (deletionHandle !== undefined) {
        clearTimeout(deletionHandle)
        roomDeletionTimers.delete(roomId)
      }

      await socket.join(roomId)

      if (!useMemory()) {
        if (!room.participants.includes(socket.userId)) {
          await RoomModel.updateOne({ id: roomId }, { $addToSet: { participants: socket.userId } })
        }
      }

      const names = lobbyParticipants.get(roomId) ?? new Map<string, string>()
      names.set(socket.userId, socket.userName)
      lobbyParticipants.set(roomId, names)

      // Track owner in fast-lookup map
      roomOwners.set(roomId, room.ownerId)

      const status = roomStatuses.get(roomId) ?? (room.status ?? 'waiting')
      const participants = [...names.entries()].map(([id, name]) => ({ id, name }))

      socket.emit('room:lobby', {
        participants,
        status,
        ownerId: room.ownerId,
        settings: roomSettings.get(roomId) ?? DEFAULT_SETTINGS,
        sessionStartedAt: status === 'started' ? roomSessionStartAt.get(roomId) : undefined,
      })

      socket.emit('chat:history', roomMessages.get(roomId) ?? [])

      // In DTW mode during active game phases, don't send shared board state
      const settings = roomSettings.get(roomId) ?? DEFAULT_SETTINGS
      const isDtw = settings.gameMode === 'draw-the-word'
      const isActiveGame = status === 'started' || status === 'word-entry' || status === 'review' || status === 'results'

      if (isDtw && isActiveGame) {
        socket.emit('room:state', [])
      } else if (useMemory()) {
        socket.emit('room:state', [])
      } else {
        const board = await BoardModel.findOne({ roomId })
        socket.emit('room:state', board?.elements ?? [])
      }

      socket.to(roomId).emit('user:joined', {
        id: socket.userId,
        name: socket.userName,
      })
    } catch {
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  socket.on('room:start', async (payload: { roomId: string; settings: RoomSettings }) => {
    try {
      const { roomId, settings } = payload

      if (!VALID_TIMER_DURATIONS_MS.has(settings.timerDurationMs)) return
      if (!VALID_GAME_MODES.has(settings.gameMode)) return

      let ownerId: string | undefined

      if (useMemory()) {
        const room = memoryRooms.find((r) => r.id === roomId)
        ownerId = room?.ownerId
      } else {
        const doc = await RoomModel.findOne({ id: roomId })
        ownerId = doc?.ownerId
      }

      if (!ownerId || ownerId !== socket.userId) return

      roomSettings.set(roomId, settings)

      if (settings.gameMode === 'draw-the-word') {
        // Transition to word-entry phase — host must submit the word before game starts
        roomStatuses.set(roomId, 'word-entry')
        if (!useMemory()) {
          await RoomModel.updateOne({ id: roomId }, { status: 'word-entry' })
        }
        // Notify host to show word-entry UI; others see "waiting for host"
        socket.emit('game:word-entry')
        socket.to(roomId).emit('room:status_changed', 'word-entry')
      } else {
        // Collaborative mode — start immediately
        const startedAt = Date.now()
        roomSessionStartAt.set(roomId, startedAt)
        roomStatuses.set(roomId, 'started')

        if (!useMemory()) {
          await RoomModel.updateOne({ id: roomId }, { status: 'started' })
        }

        io.to(roomId).emit('room:started', { settings, startedAt })

        if (settings.timerDurationMs > 0) {
          startRoomTimer(roomId, settings.timerDurationMs, roomTimers, async () => {
            roomStatuses.set(roomId, 'waiting')
            if (!useMemory()) {
              try {
                await RoomModel.updateOne({ id: roomId }, { status: 'waiting' })
                await BoardModel.updateOne({ roomId }, { $set: { elements: [] } })
              } catch {
                // Non-fatal
              }
            }
            io.to(roomId).emit('room:time_up')
          })
        }
      }
    } catch {
      // Silently ignore
    }
  })

  socket.on('room:stop', async (roomId: string) => {
    try {
      let ownerId: string | undefined

      if (useMemory()) {
        const room = memoryRooms.find((r) => r.id === roomId)
        ownerId = room?.ownerId
      } else {
        const doc = await RoomModel.findOne({ id: roomId })
        ownerId = doc?.ownerId
      }

      if (!ownerId || ownerId !== socket.userId) return

      cancelRoomTimer(roomId, roomTimers)

      // Cancel review/slideshow timers too
      const snapshotTimer = roomSnapshotTimers.get(roomId)
      if (snapshotTimer !== undefined) {
        clearTimeout(snapshotTimer)
        roomSnapshotTimers.delete(roomId)
      }
      const slideTimer = roomSlideTimers.get(roomId)
      if (slideTimer !== undefined) {
        clearTimeout(slideTimer)
        roomSlideTimers.delete(roomId)
      }

      // Clear game state
      roomGameWords.delete(roomId)
      roomSnapshots.delete(roomId)
      roomVotes.delete(roomId)

      roomStatuses.set(roomId, 'waiting')

      if (!useMemory()) {
        await RoomModel.updateOne({ id: roomId }, { status: 'waiting' })
        await BoardModel.updateOne({ roomId }, { $set: { elements: [] } })
      }

      io.to(roomId).emit('room:stopped')
    } catch {
      // Silently ignore
    }
  })

  socket.on('room:close', async (roomId: string) => {
    try {
      let ownerId: string | undefined

      if (useMemory()) {
        const room = memoryRooms.find((r) => r.id === roomId)
        ownerId = room?.ownerId
      } else {
        const doc = await RoomModel.findOne({ id: roomId })
        ownerId = doc?.ownerId
      }

      if (!ownerId || ownerId !== socket.userId) return

      io.to(roomId).emit('room:closed')
      await deleteRoom(
        roomId, memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers,
        roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
        roomVotes, roomSlideTimers, useMemory,
      )
    } catch {
      // Silently ignore
    }
  })

  socket.on('board:clear', async (roomId: string) => {
    try {
      let ownerId: string | undefined

      if (useMemory()) {
        const room = memoryRooms.find((r) => r.id === roomId)
        ownerId = room?.ownerId
      } else {
        const doc = await RoomModel.findOne({ id: roomId })
        ownerId = doc?.ownerId
      }

      if (!ownerId || ownerId !== socket.userId) return

      if (!useMemory()) {
        await BoardModel.updateOne({ roomId }, { $set: { elements: [] } })
      }

      io.to(roomId).emit('board:cleared')
    } catch {
      // Silently ignore
    }
  })

  socket.on('room:leave', async (roomId: string, ack?: () => void) => {
    await socket.leave(roomId)
    await handleParticipantLeave(
      io, socket.userId, roomId,
      memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
      roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers,
      roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
      roomVotes, roomSlideTimers, useMemory,
    )
    ack?.()
  })

  socket.on('disconnecting', async () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      await handleParticipantLeave(
        io, socket.userId, roomId,
        memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers,
        roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
        roomVotes, roomSlideTimers, useMemory,
      )
    }
  })
}

export function buildTriggerReviewForRoom(
  io: Server,
  roomId: string,
  lobbyParticipants: Map<string, Map<string, string>>,
  roomVotes: Map<string, Map<string, Map<string, number>>>,
  roomSlideTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSnapshotTimers: Map<string, ReturnType<typeof setTimeout>>,
  roomSnapshots: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  useMemory: () => boolean,
): () => void {
  return () =>
    triggerReview(
      io, roomId, lobbyParticipants, roomVotes, roomSlideTimers,
      roomSnapshotTimers, roomSnapshots, roomStatuses, useMemory,
    )
}
