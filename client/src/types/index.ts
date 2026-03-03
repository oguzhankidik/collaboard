export type ToolType = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'select'

export type RoomStatus = 'waiting' | 'started'

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

export interface LobbyState {
  participants: Participant[]
  status: RoomStatus
  ownerId: string
}

export interface Room {
  id: string
  name: string
  ownerId: string
  participants: string[]
  createdAt: string
  status?: RoomStatus
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

export interface SocketEvents {
  // Client → Server
  'draw:start': (element: DrawElement) => void
  'draw:update': (element: DrawElement) => void
  'draw:end': (element: DrawElement) => void
  'cursor:move': (position: Point) => void
  'room:join': (roomId: string) => void
  'room:leave': (roomId: string) => void
  'room:start': (roomId: string) => void
  'room:stop': (roomId: string) => void
  'room:close': (roomId: string) => void
  'chat:send': (payload: { roomId: string; message: string }) => void
  'board:clear': (roomId: string) => void

  // Server → Client
  'draw:remote': (element: DrawElement) => void
  'cursor:remote': (cursor: RemoteCursor) => void
  'room:state': (elements: DrawElement[]) => void
  'room:lobby': (state: LobbyState) => void
  'room:started': () => void
  'room:stopped': () => void
  'room:closed': () => void
  'room:host_changed': (newOwnerId: string) => void
  'user:joined': (user: { id: string; name: string }) => void
  'user:left': (userId: string) => void
  'chat:message': (msg: ChatMessage) => void
  'chat:history': (messages: ChatMessage[]) => void
  'board:cleared': () => void
}
