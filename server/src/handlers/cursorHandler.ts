import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { Point, RoomSettings } from '../types'
import { RateLimiter } from '../lib/rateLimiter'

// Max 40 cursor events per second per user (client throttles to 30ms already)
const cursorLimiter = new RateLimiter(40, 1000)

const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
]

function colorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

export function registerCursorHandlers(socket: AuthenticatedSocket, roomSettings: Map<string, RoomSettings>): void {
  socket.on('disconnect', () => cursorLimiter.remove(socket.userId))

  socket.on('cursor:move', (position: Point) => {
    if (!cursorLimiter.allow(socket.userId)) return
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      if (roomSettings.get(roomId)?.gameMode !== 'collaborative') continue
      socket.to(roomId).emit('cursor:remote', {
        userId: socket.userId,
        userName: socket.userName,
        color: colorForUser(socket.userId),
        position,
      })
    }
  })
}
