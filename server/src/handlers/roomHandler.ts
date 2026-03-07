import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import { RoomModel } from '../models/Room'
import { BoardModel } from '../models/Board'
import type { Room, RoomStatus, ChatMessage, RoomSettings } from '../types'

const MAX_PARTICIPANTS = 20
const VALID_TIMER_DURATIONS_MS = new Set([0, 300_000, 600_000, 900_000, 1_800_000, 3_600_000])
const ROOM_DELETION_GRACE_MS = 15_000

function cancelRoomTimer(roomId: string, roomTimers: Map<string, ReturnType<typeof setTimeout>>): void {
  const h = roomTimers.get(roomId)
  if (h !== undefined) {
    clearTimeout(h)
    roomTimers.delete(roomId)
  }
}

function startRoomTimer(
  io: Server,
  roomId: string,
  durationMs: number,
  roomStatuses: Map<string, RoomStatus>,
  roomTimers: Map<string, ReturnType<typeof setTimeout>>,
  useMemory: () => boolean,
): void {
  cancelRoomTimer(roomId, roomTimers)
  const handle = setTimeout(async () => {
    roomTimers.delete(roomId)
    roomStatuses.set(roomId, 'waiting')
    if (!useMemory()) {
      try {
        await RoomModel.updateOne({ id: roomId }, { status: 'waiting' })
        await BoardModel.updateOne({ roomId }, { $set: { elements: [] } })
      } catch {
        // Ignore DB errors on timer expiry
      }
    }
    io.to(roomId).emit('room:time_up')
  }, durationMs)
  roomTimers.set(roomId, handle)
}

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
  useMemory: () => boolean,
): Promise<void> {
  cancelRoomTimer(roomId, roomTimers)
  roomDeletionTimers.delete(roomId)
  lobbyParticipants.delete(roomId)
  roomStatuses.delete(roomId)
  roomMessages.delete(roomId)
  roomSettings.delete(roomId)
  roomSessionStartAt.delete(roomId)

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
  useMemory: () => boolean,
): Promise<void> {
  // Determine current owner before removing participant
  let currentOwnerId: string | undefined
  if (useMemory()) {
    currentOwnerId = memoryRooms.find((r) => r.id === roomId)?.ownerId
  } else {
    const doc = await RoomModel.findOne({ id: roomId })
    currentOwnerId = doc?.ownerId
  }

  // Remove from participant map
  const names = lobbyParticipants.get(roomId)
  names?.delete(userId)

  // Remove from DB participants list
  if (!useMemory()) {
    await RoomModel.updateOne({ id: roomId }, { $pull: { participants: userId } })
  }

  // Notify remaining participants
  io.to(roomId).emit('user:left', userId)

  const remaining = [...(names?.keys() ?? [])]

  if (remaining.length === 0) {
    // Last person left — wait before deleting to allow page-refresh reconnects
    const handle = setTimeout(() => {
      deleteRoom(roomId, memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers, useMemory)
    }, ROOM_DELETION_GRACE_MS)
    roomDeletionTimers.set(roomId, handle)
  } else if (currentOwnerId === userId) {
    // Host left and others remain — transfer to earliest joined participant
    const newOwnerId = remaining[0]

    if (useMemory()) {
      const room = memoryRooms.find((r) => r.id === roomId)
      if (room) room.ownerId = newOwnerId
    } else {
      await RoomModel.updateOne({ id: roomId }, { ownerId: newOwnerId })
    }

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
  useMemory: () => boolean,
): void {
  socket.on('room:join', async (roomId: string) => {
    try {
      // Prevent joining a second room while already in one
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

      // Cancel pending deletion if this room was counting down
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

      // Track participant name in lobby map
      const names = lobbyParticipants.get(roomId) ?? new Map<string, string>()
      names.set(socket.userId, socket.userName)
      lobbyParticipants.set(roomId, names)

      // Get room status
      const status = roomStatuses.get(roomId) ?? (room.status ?? 'waiting')

      // Send lobby state to joining user (enriched with settings + sessionStartedAt)
      const participants = [...names.entries()].map(([id, name]) => ({ id, name }))
      socket.emit('room:lobby', {
        participants,
        status,
        ownerId: room.ownerId,
        settings: roomSettings.get(roomId) ?? { timerDurationMs: 0 },
        sessionStartedAt: status === 'started' ? roomSessionStartAt.get(roomId) : undefined,
      })

      // Send chat history to joining user
      socket.emit('chat:history', roomMessages.get(roomId) ?? [])

      // Send current board state
      if (useMemory()) {
        socket.emit('room:state', [])
      } else {
        const board = await BoardModel.findOne({ roomId })
        socket.emit('room:state', board?.elements ?? [])
      }

      // Notify others
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

      // Validate timer duration
      if (!VALID_TIMER_DURATIONS_MS.has(settings.timerDurationMs)) return

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
      const startedAt = Date.now()
      roomSessionStartAt.set(roomId, startedAt)
      roomStatuses.set(roomId, 'started')

      if (!useMemory()) {
        await RoomModel.updateOne({ id: roomId }, { status: 'started' })
      }

      io.to(roomId).emit('room:started', { settings, startedAt })

      if (settings.timerDurationMs > 0) {
        startRoomTimer(io, roomId, settings.timerDurationMs, roomStatuses, roomTimers, useMemory)
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

      // Notify everyone first, then clean up immediately (explicit close)
      io.to(roomId).emit('room:closed')
      await deleteRoom(roomId, memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers, useMemory)
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
      roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers, useMemory,
    )
    ack?.()
  })

  socket.on('disconnecting', async () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      await handleParticipantLeave(
        io, socket.userId, roomId,
        memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
        roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers, useMemory,
      )
    }
  })
}
