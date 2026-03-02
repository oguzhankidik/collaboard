export type ToolType = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'select'

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

export interface Room {
  id: string
  name: string
  ownerId: string
  participants: string[]
  createdAt: string
}

export interface SocketEvents {
  // Client → Server
  'draw:start': (element: DrawElement) => void
  'draw:update': (element: DrawElement) => void
  'draw:end': (element: DrawElement) => void
  'cursor:move': (position: Point) => void
  'room:join': (roomId: string) => void
  'room:leave': (roomId: string) => void

  // Server → Client
  'draw:remote': (element: DrawElement) => void
  'cursor:remote': (cursor: RemoteCursor) => void
  'room:state': (elements: DrawElement[]) => void
  'user:joined': (user: { id: string; name: string }) => void
  'user:left': (userId: string) => void
}
