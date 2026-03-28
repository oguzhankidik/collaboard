import 'dotenv/config'
import express from 'express'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import cors from 'cors'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { verifySocketToken, type AuthenticatedSocket } from './middleware/authMiddleware'
import { requireAuth, type AuthRequest } from './middleware/requireAuth'
import { registerRoomHandlers } from './handlers/roomHandler'
import { registerDrawingHandlers } from './handlers/drawingHandler'
import { registerCursorHandlers } from './handlers/cursorHandler'
import { registerChatHandlers } from './handlers/chatHandler'
import { registerGameHandlers } from './handlers/gameHandler'
import { registerStoryHandlers } from './handlers/storyHandler'
import { RoomModel } from './models/Room'
import { BoardModel } from './models/Board'
import type { Room, RoomStatus, ChatMessage, RoomSettings, StoryTurn } from './types'

const PORT = Number(process.env.PORT ?? 3000)
const IS_DEV = process.env.NODE_ENV !== 'production'
const CLIENT_URL = (process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')
const ALLOWED_ORIGINS = IS_DEV ? [CLIENT_URL, 'http://localhost:5173'] : [CLIENT_URL]
const MONGODB_URI = process.env.MONGODB_URI ?? ''

const memoryRooms: Room[] = []
const lobbyParticipants = new Map<string, Map<string, string>>()
const roomStatuses = new Map<string, RoomStatus>()
const roomMessages = new Map<string, ChatMessage[]>()
const roomSettings = new Map<string, RoomSettings>()
const roomTimers = new Map<string, ReturnType<typeof setTimeout>>()
const roomSessionStartAt = new Map<string, number>()
const roomDeletionTimers = new Map<string, ReturnType<typeof setTimeout>>()

const roomOwners = new Map<string, string>()
const roomGameWords = new Map<string, string>()
const roomSnapshots = new Map<string, Map<string, string>>()
const roomSnapshotTimers = new Map<string, ReturnType<typeof setTimeout>>()
const roomVotes = new Map<string, Map<string, Map<string, number>>>()
const roomSlideTimers = new Map<string, ReturnType<typeof setTimeout>>()

const storyPlayerOrder   = new Map<string, string[]>()
const storyRound         = new Map<string, number>()
const storyBoardHistory  = new Map<string, Map<string, StoryTurn[]>>()
const storyPending       = new Map<string, Map<string, string | null>>()
const storySnapshotTimer = new Map<string, ReturnType<typeof setTimeout>>()
const userSockets        = new Map<string, string>()

const useMemory = () => !MONGODB_URI

const app = express()
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/rooms', async (_req, res) => {
  const liveCount = (roomId: string) => lobbyParticipants.get(roomId)?.size ?? 0

  if (useMemory()) {
    const rooms = [...memoryRooms]
      .filter(r => !r.isPrivate)
      .reverse()
      .map(r => ({
        ...r,
        participants: Array(liveCount(r.id)).fill(''),
        gameMode: roomSettings.get(r.id)?.gameMode ?? 'collaborative',
      }))
    res.json(rooms)
    return
  }
  try {
    const rooms = await RoomModel.find({ isPrivate: { $ne: true } }).sort({ createdAt: -1 }).limit(50)
    res.json(rooms.map(r => ({
      ...r.toObject(),
      participants: Array(liveCount(r.id)).fill(''),
      gameMode: roomSettings.get(r.id)?.gameMode ?? 'collaborative',
    })))
  } catch {
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

app.post('/rooms', requireAuth, async (req, res) => {
  const ownerId = (req as AuthRequest).uid
  const { name, isPrivate = false } = req.body as { name?: string; isPrivate?: boolean }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const trimmedName = name.trim().slice(0, 100)

  if (useMemory()) {
    const room: Room = {
      id: nanoid(),
      name: trimmedName,
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
    const room = await RoomModel.create({ id: nanoid(), name: trimmedName, ownerId, participants: [], isPrivate })
    res.status(201).json(room)
  } catch {
    res.status(500).json({ error: 'Failed to create room' })
  }
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
})

io.use(verifySocketToken)

io.on('connection', (socket) => {
  const authSocket = socket as AuthenticatedSocket
  console.log(`[socket] connected: ${authSocket.userId} (${authSocket.userName})`)

  userSockets.set(authSocket.userId, authSocket.id)

  registerRoomHandlers(
    io, authSocket,
    memoryRooms, lobbyParticipants, roomStatuses, roomMessages,
    roomSettings, roomTimers, roomSessionStartAt, roomDeletionTimers,
    roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
    roomVotes, roomSlideTimers,
    storyPlayerOrder, storyRound, storyBoardHistory, storyPending, storySnapshotTimer,
    userSockets, useMemory,
  )
  registerDrawingHandlers(io, authSocket, roomSettings)
  registerCursorHandlers(authSocket, roomSettings)
  registerChatHandlers(io, authSocket, roomMessages)
  registerGameHandlers(
    io, authSocket,
    lobbyParticipants, roomStatuses, roomSettings,
    roomOwners, roomGameWords, roomSnapshots, roomSnapshotTimers,
    roomVotes, roomSlideTimers, roomTimers, useMemory,
  )
  registerStoryHandlers(
    io, authSocket,
    lobbyParticipants, roomStatuses, roomSettings,
    storyPlayerOrder, storyRound, storyBoardHistory, storyPending, storySnapshotTimer,
    roomTimers, userSockets, useMemory,
  )

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${authSocket.userId}`)
    userSockets.delete(authSocket.userId)
  })
})

async function start() {
  if (!MONGODB_URI) {
    console.warn('[mongo] MONGODB_URI not set — skipping database connection')
  } else {
    await mongoose.connect(MONGODB_URI)
    console.log('[mongo] connected')

    const STALE_ROOM_TTL_MS = 24 * 60 * 60 * 1000
    const cutoff = new Date(Date.now() - STALE_ROOM_TTL_MS)
    const staleRooms = await RoomModel.find({ updatedAt: { $lt: cutoff } }, { id: 1 })
    if (staleRooms.length > 0) {
      const staleIds = staleRooms.map((r) => r.id as string)
      await RoomModel.deleteMany({ updatedAt: { $lt: cutoff } })
      await BoardModel.deleteMany({ roomId: { $in: staleIds } })
      console.log(`[mongo] deleted ${staleRooms.length} stale room(s)`)
    }

    await RoomModel.updateMany({}, { $set: { participants: [] } }, { timestamps: false })
    console.log('[mongo] cleared stale participants on startup')
  }

  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('[server] startup error:', err)
  process.exit(1)
})
