import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { DrawElement } from '../types'
import { BoardModel } from '../models/Board'
import { RateLimiter } from '../lib/rateLimiter'

// Max 120 draw events per second per user
const drawLimiter = new RateLimiter(120, 1000)

export function registerDrawingHandlers(_io: Server, socket: AuthenticatedSocket): void {
  socket.on('disconnect', () => drawLimiter.remove(socket.userId))
  socket.on('draw:start', (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    const trusted = { ...element, userId: socket.userId }
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', trusted)
    }
  })

  socket.on('draw:update', (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    const trusted = { ...element, userId: socket.userId }
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', trusted)
    }
  })

  socket.on('draw:end', async (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    const trusted = { ...element, userId: socket.userId }
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', trusted)

      // Persist only on draw:end
      try {
        await BoardModel.findOneAndUpdate(
          { roomId },
          { $push: { elements: trusted } },
          { upsert: true, new: true },
        )
      } catch {
        // Non-fatal: drawing is still broadcast even if persistence fails
      }
    }
  })

}
