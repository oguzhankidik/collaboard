export const CURSOR_THROTTLE_MS = 30
export const DRAW_UPDATE_THROTTLE_MS = 16
export const MAX_PARTICIPANTS = 20
export const DEFAULT_COLOR = '#000000'
export const DEFAULT_STROKE_WIDTH = 2
export const STROKE_WIDTHS = [1, 2, 4, 8, 16] as const
export const ERASER_SIZES = [8, 16, 32, 64] as const

export const ZOOM_MIN = 0.25
export const ZOOM_MAX = 4.0
export const ZOOM_STEP = 0.25
export const ZOOM_WHEEL_FACTOR = 1.1

export const BOARD_SIZE = 8000  // world units; board spans ±BOARD_SIZE/2 in both axes

export const MINIMAP_W = 200
export const MINIMAP_H = 200
export const MINIMAP_PADDING = 50   // world-space padding around content bounds

export const TIMER_OPTIONS_MS = [0, 10_000, 60_000, 120_000, 180_000, 300_000, 600_000]  // 0 = None
export const TIMER_WARN_YELLOW_MS = 60_000
export const TIMER_WARN_RED_MS = 15_000
export const VALID_TIMER_DURATIONS_MS = new Set([0, 10_000, 60_000, 120_000, 180_000, 300_000, 600_000])
