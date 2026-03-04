import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { DrawElement } from '../types'
import { BoardModel } from '../models/Board'
import { RateLimiter } from '../lib/rateLimiter'

// Max 120 draw events per second per user
const drawLimiter = new RateLimiter(120, 1000)

const VALID_TYPES = new Set(['pen', 'rect', 'circle', 'arrow', 'text', 'select', 'eraser'])
const MAX_POINTS = 10_000
const MAX_TEXT_LENGTH = 1_000
const MAX_COLOR_LENGTH = 20

function isValidElement(el: unknown): el is DrawElement {
  if (!el || typeof el !== 'object') return false
  const e = el as Record<string, unknown>
  if (typeof e.id !== 'string' || !e.id) return false
  if (!VALID_TYPES.has(e.type as string)) return false
  if (!Array.isArray(e.points) || e.points.length > MAX_POINTS) return false
  if (typeof e.color !== 'string' || e.color.length > MAX_COLOR_LENGTH) return false
  if (typeof e.strokeWidth !== 'number' || e.strokeWidth < 0 || e.strokeWidth > 100) return false
  if (e.text !== undefined && (typeof e.text !== 'string' || e.text.length > MAX_TEXT_LENGTH)) return false
  return true
}

export function registerDrawingHandlers(_io: Server, socket: AuthenticatedSocket): void {
  socket.on('disconnect', () => drawLimiter.remove(socket.userId))
  socket.on('draw:start', (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    if (!isValidElement(element)) return
    const trusted = { ...element, userId: socket.userId }
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', trusted)
    }
  })

  socket.on('draw:update', (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    if (!isValidElement(element)) return
    const trusted = { ...element, userId: socket.userId }
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('draw:remote', trusted)
    }
  })

  socket.on('draw:end', async (element: DrawElement) => {
    if (!drawLimiter.allow(socket.userId)) return
    if (!isValidElement(element)) return
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
