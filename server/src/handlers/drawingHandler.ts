import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { DrawElement } from '../types'
import { BoardModel } from '../models/Board'

export function registerDrawingHandlers(io: Server, socket: AuthenticatedSocket): void {
  socket.on('draw:start', (element: DrawElement) => {
    // Broadcast to all others in the same rooms
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', element)
    }
  })

  socket.on('draw:update', (element: DrawElement) => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', element)
    }
  })

  socket.on('draw:end', async (element: DrawElement) => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', element)

      // Persist only on draw:end
      try {
        await BoardModel.findOneAndUpdate(
          { roomId },
          { $push: { elements: element } },
          { upsert: true, new: true },
        )
      } catch {
        // Non-fatal: drawing is still broadcast even if persistence fails
      }
    }
  })
}
