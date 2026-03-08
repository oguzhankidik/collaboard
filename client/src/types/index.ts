export type ToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'select' | 'hand' | 'fill'

export type GameMode = 'collaborative' | 'draw-the-word'

export type RoomStatus = 'waiting' | 'word-entry' | 'started' | 'review' | 'results'

export interface Point {
  x: number
  y: number
}

export interface DrawElement {
  id: string
  type: ToolType
  points: Point[]
  color: string
  strokeWidth: number
  text?: string
  userId: string
  createdAt: number
}

export interface RemoteCursor {
  userId: string
  userName: string
  color: string
  position: Point
}

export interface Participant {
  id: string
  name: string
}

export interface RoomSettings {
  timerDurationMs: number  // 0 = no timer
  gameMode: GameMode
}

export interface LobbyState {
  participants: Participant[]
  status: RoomStatus
  ownerId: string
  settings: RoomSettings
  sessionStartedAt?: number  // epoch ms, only when status === 'started'
}

export interface Room {
  id: string
  name: string
  ownerId: string
  participants: string[]
  createdAt: string
  status?: RoomStatus
  isPrivate: boolean
}

export interface ChatMessage {
  userId: string
  userName: string
  message: string
  timestamp: number
}

export interface GuestUser {
  uid: string
  displayName: string
  isGuest: true
}

export interface PlayerScore {
  userId: string
  userName: string
  totalScore: number
  voteCount: number
}

export interface GameSlide {
  userId: string
  userName: string
  canvasData: string
  slideIndex: number
  total: number
}

export interface SocketEvents {
  // Client → Server
  'draw:start': (element: DrawElement) => void
  'draw:update': (element: DrawElement) => void
  'draw:end': (element: DrawElement) => void
  'draw:remove': (elementId: string) => void
  'cursor:move': (position: Point) => void
  'room:join': (roomId: string) => void
  'room:leave': (roomId: string) => void
  'room:start': (payload: { roomId: string; settings: RoomSettings }) => void
  'room:stop': (roomId: string) => void
  'room:close': (roomId: string) => void
  'chat:send': (payload: { roomId: string; message: string }) => void
  'board:clear': (roomId: string) => void
  // Game mode events (Client → Server)
  'game:set-word': (payload: { roomId: string; word: string }) => void
  'game:submit-snapshot': (payload: { roomId: string; canvasData: string }) => void
  'game:vote': (payload: { roomId: string; targetUserId: string; score: number }) => void

  // Server → Client
  'draw:remote': (element: DrawElement) => void
  'draw:committed': (element: DrawElement) => void
  'draw:removed': (elementId: string) => void
  'cursor:remote': (cursor: RemoteCursor) => void
  'room:state': (elements: DrawElement[]) => void
  'room:lobby': (state: LobbyState) => void
  'room:started': (payload: { settings: RoomSettings; startedAt: number }) => void
  'room:time_up': () => void
  'room:stopped': () => void
  'room:closed': () => void
  'room:host_changed': (newOwnerId: string) => void
  'room:status_changed': (status: RoomStatus) => void
  'user:joined': (user: { id: string; name: string }) => void
  'user:left': (userId: string) => void
  'chat:message': (msg: ChatMessage) => void
  'chat:history': (messages: ChatMessage[]) => void
  'board:cleared': () => void
  // Game mode events (Server → Client)
  'game:word-entry': () => void
  'game:word-prompt': (word: string) => void
  'game:review-start': (players: Participant[]) => void
  'game:slide': (data: GameSlide) => void
  'game:results': (scores: PlayerScore[]) => void
}
