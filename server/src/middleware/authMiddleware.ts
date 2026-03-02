import type { Socket } from 'socket.io'
import { admin, hasCredentials } from '../lib/firebase-admin'

export interface AuthenticatedSocket extends Socket {
  userId: string
  userName: string
  userEmail: string
}

export async function verifySocketToken(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  // Skip auth in dev mode when no Firebase credentials are configured
  if (!hasCredentials) {
    const authSocket = socket as AuthenticatedSocket
    authSocket.userId = socket.id
    authSocket.userName = 'Dev User'
    authSocket.userEmail = 'dev@localhost'
    next()
    return
  }

  const token = socket.handshake.auth['token'] as string | undefined

  if (!token) {
    next(new Error('Authentication token missing'))
    return
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token)
    const authSocket = socket as AuthenticatedSocket
    authSocket.userId = decoded.uid
    authSocket.userName = decoded.name ?? 'Anonymous'
    authSocket.userEmail = decoded.email ?? ''
    next()
  } catch {
    next(new Error('Invalid authentication token'))
  }
}
