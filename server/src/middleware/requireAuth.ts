import type { Request, Response, NextFunction } from 'express'
import { admin, hasCredentials } from '../lib/firebase-admin'

export interface AuthRequest extends Request {
  uid: string
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!hasCredentials) {
    // Dev mode: allow requests without auth
    ;(req as AuthRequest).uid = 'dev-user'
    next()
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    ;(req as AuthRequest).uid = decoded.uid
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
