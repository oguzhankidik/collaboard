import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import { RoomModel } from '../models/Room'
import { BoardModel } from '../models/Board'
import type { Room, RoomStatus } from '../types'

const MAX_PARTICIPANTS = 20

export function registerRoomHandlers(
  io: Server,
  socket: AuthenticatedSocket,
  memoryRooms: Room[],
  lobbyParticipants: Map<string, Map<string, string>>,
  roomStatuses: Map<string, RoomStatus>,
  useMemory: () => boolean,
): void {
  socket.on('room:join', async (roomId: string) => {
    try {
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

      // Send lobby state to joining user
      const participants = [...names.entries()].map(([id, name]) => ({ id, name }))
      socket.emit('room:lobby', { participants, status, ownerId: room.ownerId })

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

  socket.on('room:start', async (roomId: string) => {
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

      roomStatuses.set(roomId, 'started')

      if (!useMemory()) {
        await RoomModel.updateOne({ id: roomId }, { status: 'started' })
      }

      io.to(roomId).emit('room:started')
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

      roomStatuses.set(roomId, 'waiting')

      if (!useMemory()) {
        await RoomModel.updateOne({ id: roomId }, { status: 'waiting' })
      }

      io.to(roomId).emit('room:stopped')
    } catch {
      // Silently ignore
    }
  })

  socket.on('room:leave', async (roomId: string) => {
    await socket.leave(roomId)

    const names = lobbyParticipants.get(roomId)
    names?.delete(socket.userId)

    if (!useMemory()) {
      await RoomModel.updateOne({ id: roomId }, { $pull: { participants: socket.userId } })
    }

    io.to(roomId).emit('user:left', socket.userId)
  })

  socket.on('disconnecting', async () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue

      const names = lobbyParticipants.get(roomId)
      names?.delete(socket.userId)

      if (!useMemory()) {
        await RoomModel.updateOne({ id: roomId }, { $pull: { participants: socket.userId } })
      }

      io.to(roomId).emit('user:left', socket.userId)
    }
  })
}
