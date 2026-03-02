export type ToolType = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'select'

export interface Point {
  x: number
  y: number
}

export interface Room {
  id: string
  name: string
  ownerId: string
  participants: string[]
  createdAt: string
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
