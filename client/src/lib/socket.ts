import { io, Socket } from 'socket.io-client'
import { auth } from './firebase'

let socket: Socket | null = null

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket

  const user = auth.currentUser
  const firebaseToken = await user?.getIdToken(user.isAnonymous ?? false)

  socket = io(import.meta.env.VITE_SOCKET_URL as string, {
    auth: { token: firebaseToken ?? '' },
    autoConnect: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  })

  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
