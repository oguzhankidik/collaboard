import { io, Socket } from 'socket.io-client'
import { auth } from './firebase'

let socket: Socket | null = null

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket

  const firebaseToken = await auth.currentUser?.getIdToken()
  const authPayload = firebaseToken
    ? { token: firebaseToken }
    : {
        guestId: sessionStorage.getItem('guest_id') ?? '',
        guestName: sessionStorage.getItem('guest_name') ?? '',
      }

  socket = io(import.meta.env.VITE_SOCKET_URL as string, {
    auth: authPayload,
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
