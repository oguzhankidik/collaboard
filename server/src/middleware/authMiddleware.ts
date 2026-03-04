import type { Socket } from 'socket.io'
import { admin, hasCredentials } from '../lib/firebase-admin'

export interface AuthenticatedSocket extends Socket {
  userId: string
  userName: string
  userEmail: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function verifySocketToken(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  // In production, refuse connections if Firebase credentials are missing
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

  const { token, guestId, guestName } = socket.handshake.auth as {
    token?: string
    guestId?: string
    guestName?: string
  }

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
  } else if (guestId && typeof guestName === 'string' && guestName.trim()) {
    if (!UUID_RE.test(guestId)) {
      next(new Error('Invalid guest ID'))
      return
    }
    const authSocket = socket as AuthenticatedSocket
    authSocket.userId = guestId
    authSocket.userName = guestName.trim().slice(0, 50)
    authSocket.userEmail = ''
    next()
  } else {
    next(new Error('Authentication required'))
  }
}
