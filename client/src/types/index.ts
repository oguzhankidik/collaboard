export type ToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'select' | 'hand' | 'fill'

export type GameMode = 'collaborative' | 'draw-the-word' | 'collaborative-story'

export type RoomStatus = 'waiting' | 'word-entry' | 'started' | 'review' | 'results' | 'story-results'

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
  gameMode?: GameMode
}

export interface ChatMessage {
  userId: string
  userName: string
  message: string
  timestamp: number
}

// GuestUser removed — guests now use Firebase Anonymous Auth (user.isAnonymous === true)
// export interface GuestUser {
//   uid: string
//   displayName: string
//   isGuest: true
// }

export interface PlayerScore {
  userId: string
  userName: string
  totalScore: number
  voteCount: number
}

export interface StoryTurn {
  turnIndex: number
  userId: string
  userName: string
  canvasData: string
}

export interface StoryBoard {
  originUserId: string
  originUserName: string
  turns: StoryTurn[]
}

export interface StoryBoardInfo {
  round: number
  totalRounds: number
  boardOriginUserId: string
  boardOriginUserName: string
  canvasData: string
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
  'room:settings_changed': (payload: { roomId: string; settings: RoomSettings }) => void
  'room:stop': (roomId: string) => void
  'room:close': (roomId: string) => void
  'chat:send': (payload: { roomId: string; message: string }) => void
  'board:clear': (roomId: string) => void
  // Game mode events (Client → Server)
  'game:set-word': (payload: { roomId: string; word: string }) => void
  'game:submit-snapshot': (payload: { roomId: string; canvasData: string }) => void
  'game:vote': (payload: { roomId: string; targetUserId: string; score: number }) => void
  'story:submit-snapshot': (payload: { roomId: string; canvasData: string }) => void

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
  'room:settings_updated': (settings: RoomSettings) => void
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
  'story:board-received': (info: StoryBoardInfo) => void
  'story:round-started': (payload: { startedAt: number }) => void
  'story:snapshot-request': () => void
  'story:results': (boards: StoryBoard[]) => void
}
