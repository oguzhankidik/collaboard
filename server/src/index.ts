import 'dotenv/config'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { verifySocketToken, type AuthenticatedSocket } from './middleware/authMiddleware'
import { registerRoomHandlers } from './handlers/roomHandler'
import { registerDrawingHandlers } from './handlers/drawingHandler'
import { registerCursorHandlers } from './handlers/cursorHandler'
import { registerChatHandlers } from './handlers/chatHandler'
import { RoomModel } from './models/Room'
import type { Room, RoomStatus, ChatMessage } from './types'

const PORT = Number(process.env.PORT ?? 3000)
const CLIENT_URL = (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const MONGODB_URI = process.env.MONGODB_URI ?? ''

// In-memory fallback used when MongoDB is not configured
const memoryRooms: Room[] = []
const lobbyParticipants = new Map<string, Map<string, string>>()
const roomStatuses = new Map<string, RoomStatus>()
const roomMessages = new Map<string, ChatMessage[]>()
const useMemory = () => !MONGODB_URI

// Express app
const app = express()
app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173'], credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// REST: list rooms
app.get('/rooms', async (_req, res) => {
  if (useMemory()) {
    res.json([...memoryRooms].filter(r => !r.isPrivate).reverse())
    return
  }
  try {
    const rooms = await RoomModel.find({ isPrivate: { $ne: true } }).sort({ createdAt: -1 }).limit(50)
    res.json(rooms)
  } catch {
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

// REST: create room
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

app.post('/rooms', async (req, res) => {
  const { name, ownerId, isPrivate = false } = req.body as { name?: string; ownerId?: string; isPrivate?: boolean }
  if (!name || !ownerId) {
    res.status(400).json({ error: 'name and ownerId are required' })
    return
  }

  if (UUID_RE.test(ownerId)) {
    res.status(403).json({ error: 'Guest users cannot create rooms' })
    return
  }

  if (useMemory()) {
    const room: Room = {
      id: nanoid(),
      name,
      ownerId,
      participants: [],
      createdAt: new Date().toISOString(),
      status: 'waiting' as RoomStatus,
      isPrivate,
    }
    memoryRooms.push(room)
    res.status(201).json(room)
    return
  }

  try {
    const room = await RoomModel.create({ id: nanoid(), name, ownerId, participants: [], isPrivate })
    res.status(201).json(room)
  } catch {
    res.status(500).json({ error: 'Failed to create room' })
  }
})

// HTTP + Socket.io server
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: [CLIENT_URL, 'http://localhost:5173'], methods: ['GET', 'POST'] },
})

// Auth middleware on every socket connection
io.use(verifySocketToken)

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket
  console.log(`[socket] connected: ${authSocket.userId} (${authSocket.userName})`)

  registerRoomHandlers(io, authSocket, memoryRooms, lobbyParticipants, roomStatuses, roomMessages, useMemory)
  registerDrawingHandlers(io, authSocket)
  registerCursorHandlers(authSocket)
  registerChatHandlers(io, authSocket, roomMessages)

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${authSocket.userId}`)
  })
})

// MongoDB + start
async function start() {
  if (!MONGODB_URI) {
    console.warn('[mongo] MONGODB_URI not set — skipping database connection')
  } else {
    await mongoose.connect(MONGODB_URI)
    console.log('[mongo] connected')
  }

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] startup error:', err)
  process.exit(1)
})
