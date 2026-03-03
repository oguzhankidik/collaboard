import type { Server } from 'socket.io'
import type { AuthenticatedSocket } from '../middleware/authMiddleware'
import type { ChatMessage } from '../types'

const MAX_MESSAGE_LENGTH = 500
const MAX_HISTORY = 50

export function registerChatHandlers(
  io: Server,
  socket: AuthenticatedSocket,
  roomMessages: Map<string, ChatMessage[]>,
): void {
  socket.on('chat:send', (payload: { roomId: string; message: string }) => {
    const { roomId, message } = payload

    if (!message || typeof message !== 'string') return
    const trimmed = message.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return
    if (!socket.rooms.has(roomId)) return

    const msg: ChatMessage = {
      userId: socket.userId,
      userName: socket.userName,
      message: trimmed,
      timestamp: Date.now(),
    }

    const history = roomMessages.get(roomId) ?? []
    history.push(msg)
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY)
    roomMessages.set(roomId, history)

    io.to(roomId).emit('chat:message', msg)
  })
}
