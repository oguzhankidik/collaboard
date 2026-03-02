import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { Point } from '../types'

// Cursor colour palette — deterministic per userId
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

export function registerCursorHandlers(socket: AuthenticatedSocket): void {
  socket.on('cursor:move', (position: Point) => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue
      socket.to(roomId).emit('cursor:remote', {
        userId: socket.userId,
        userName: socket.userName,
        color: colorForUser(socket.userId),
        position,
      })
    }
  })
}
