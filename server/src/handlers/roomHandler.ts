import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import { RoomModel } from '../models/Room'
import { BoardModel } from '../models/Board'

const MAX_PARTICIPANTS = 20

export function registerRoomHandlers(io: Server, socket: AuthenticatedSocket): void {
  socket.on('room:join', async (roomId: string) => {
    try {
      const room = await RoomModel.findOne({ id: roomId })
      if (!room) {
        socket.emit('error', { message: 'Room not found' })
        return
      }

      if (room.participants.length >= MAX_PARTICIPANTS && !room.participants.includes(socket.userId)) {
        socket.emit('error', { message: 'Room is full' })
        return
      }

      await socket.join(roomId)

      if (!room.participants.includes(socket.userId)) {
        room.participants.push(socket.userId)
        await room.save()
      }

      // Send current board state to the joining user
      const board = await BoardModel.findOne({ roomId })
      socket.emit('room:state', board?.elements ?? [])

      // Notify others
      socket.to(roomId).emit('user:joined', {
        id: socket.userId,
        name: socket.userName,
      })
    } catch {
      socket.emit('error', { message: 'Failed to join room' })
    }
  })

  socket.on('room:leave', async (roomId: string) => {
    await socket.leave(roomId)
    await RoomModel.updateOne({ id: roomId }, { $pull: { participants: socket.userId } })
    io.to(roomId).emit('user:left', socket.userId)
  })

  socket.on('disconnecting', async () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      await RoomModel.updateOne({ id: roomId }, { $pull: { participants: socket.userId } })
      io.to(roomId).emit('user:left', socket.userId)
    }
  })
}
