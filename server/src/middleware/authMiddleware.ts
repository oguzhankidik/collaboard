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
  if (!hasCredentials) {
    if (process.env.NODE_ENV === 'production') {
      next(new Error('Server misconfiguration: auth credentials not set'))
      return
    }
    const authSocket = socket as AuthenticatedSocket
    authSocket.userId = socket.id
    authSocket.userName = 'Dev User'
    authSocket.userEmail = 'dev@localhost'
    next()
    return
  }

  const { token } = socket.handshake.auth as { token?: string }

  if (token) {
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
  } else {
    next(new Error('Authentication required'))
  }
}
