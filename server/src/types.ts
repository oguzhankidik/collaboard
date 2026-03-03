export type ToolType = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'select'

export type RoomStatus = 'waiting' | 'started'

export interface Point {
  x: number
  y: number
}

export interface Participant {
  id: string
  name: string
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
