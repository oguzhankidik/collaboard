export type ToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'arrow' | 'line' | 'text' | 'select' | 'fill'

export type GameMode = 'collaborative' | 'draw-the-word' | 'collaborative-story'

export type RoomStatus = 'waiting' | 'word-entry' | 'started' | 'review' | 'results' | 'story-results'

export interface RoomSettings {
  timerDurationMs: number  // 0 = no timer
  gameMode: GameMode
}

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
