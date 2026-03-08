import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { DrawElement, Point } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { BOARD_SIZE } from '@/constants'

const boundsCache = new Map<string, { x: number; y: number; w: number; h: number }>()

function computeBounds(element: DrawElement): { x: number; y: number; w: number; h: number } {
  if (element.type === 'text' && element.points.length > 0) {
    const fontSize = element.strokeWidth * 8 + 12
    const approxWidth = Math.max((element.text?.length ?? 5) * fontSize * 0.6, 20)
    const { x, y } = element.points[0]
    return { x, y: y - fontSize, w: approxWidth, h: fontSize * 1.2 }
  }
  if (element.points.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const xs = element.points.map((p) => p.x)
  const ys = element.points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function getElementBounds(element: DrawElement): { x: number; y: number; w: number; h: number } {
  return boundsCache.get(element.id) ?? computeBounds(element)
}

export function cacheElementBounds(element: DrawElement): void {
  boundsCache.set(element.id, computeBounds(element))
}

export function invalidateBounds(id: string): void {
  boundsCache.delete(id)
}

export function clearBoundsCache(): void {
  boundsCache.clear()
}

export function hitTestElement(element: DrawElement, point: Point): boolean {
  const PAD = Math.max(element.strokeWidth, 8)
  const { x, y, w, h } = getElementBounds(element)
  return point.x >= x - PAD && point.x <= x + w + PAD && point.y >= y - PAD && point.y <= y + h + PAD
}

export function useCanvas(
  staticCanvasRef: Ref<HTMLCanvasElement | null>,
  activeCanvasRef: Ref<HTMLCanvasElement | null>,
) {
  const staticCtx = ref<CanvasRenderingContext2D | null>(null)
  const activeCtx = ref<CanvasRenderingContext2D | null>(null)

  function getStaticCtx(): CanvasRenderingContext2D {
    if (!staticCtx.value) throw new Error('Static canvas not initialized')
    return staticCtx.value
  }

  function getActiveCtx(): CanvasRenderingContext2D {
    if (!activeCtx.value) throw new Error('Active canvas not initialized')
    return activeCtx.value
  }

  function resize() {
    const sc = staticCanvasRef.value
    const ac = activeCanvasRef.value
    if (!sc || !ac) return
    const { width, height } = sc.getBoundingClientRect()
    sc.width = width
    sc.height = height
    ac.width = width
    ac.height = height
  }

  function isInViewport(el: DrawElement, canvas: HTMLCanvasElement): boolean {
    if (el.points.length === 0) return false
    if (el.type === 'fill') return true
    const store = useCanvasStore()
    const bounds = getElementBounds(el)
    const PAD = el.strokeWidth
    const vx = store.panX
    const vy = store.panY
    const vw = canvas.width / store.zoom
    const vh = canvas.height / store.zoom
    return (
      bounds.x + bounds.w + PAD >= vx &&
      bounds.x - PAD <= vx + vw &&
      bounds.y + bounds.h + PAD >= vy &&
      bounds.y - PAD <= vy + vh
    )
  }

  function applyViewTransform(c: CanvasRenderingContext2D) {
    const store = useCanvasStore()
    c.scale(store.zoom, store.zoom)
    c.translate(-store.panX, -store.panY)
  }

  function drawBoardBorder(c: CanvasRenderingContext2D) {
    const half = BOARD_SIZE / 2
    c.save()
    c.strokeStyle = 'rgba(150, 140, 255, 0.35)'
    c.lineWidth = 3 / useCanvasStore().zoom
    c.setLineDash([12 / useCanvasStore().zoom, 8 / useCanvasStore().zoom])
    c.strokeRect(-half, -half, BOARD_SIZE, BOARD_SIZE)
    c.restore()
  }

  function redrawStatic(elements: DrawElement[], selectedId?: string | null) {
    const canvas = staticCanvasRef.value
    if (!canvas) return
    const c = getStaticCtx()
    c.clearRect(0, 0, canvas.width, canvas.height)
    c.save()
    applyViewTransform(c)
    drawBoardBorder(c)
    for (const el of elements) {
      if (isInViewport(el, canvas)) {
        drawElement(c, el)
      }
    }
    if (selectedId) {
      const sel = elements.find((e) => e.id === selectedId)
      if (sel) drawSelectionBox(c, sel)
    }
    c.restore()
  }

  function redrawActive(
    currentEl: DrawElement | null,
    remoteInProgress?: Map<string, DrawElement>,
  ) {
    const canvas = activeCanvasRef.value
    if (!canvas) return
    const c = getActiveCtx()
    c.clearRect(0, 0, canvas.width, canvas.height)
    c.save()
    applyViewTransform(c)
    if (remoteInProgress) {
      for (const el of remoteInProgress.values()) {
        drawElement(c, el)
      }
    }
    if (currentEl) drawElement(c, currentEl)
    c.restore()
  }

  function redrawActiveAll(
    elements: DrawElement[],
    currentEl: DrawElement | null,
    selectedId?: string | null,
  ) {
    const canvas = activeCanvasRef.value
    if (!canvas) return
    const c = getActiveCtx()
    c.clearRect(0, 0, canvas.width, canvas.height)
    c.save()
    applyViewTransform(c)
    drawBoardBorder(c)
    for (const el of elements) {
      if (isInViewport(el, canvas)) {
        drawElement(c, el)
      }
    }
    if (currentEl) drawElement(c, currentEl)
    if (selectedId) {
      const sel = elements.find((e) => e.id === selectedId)
      if (sel) drawSelectionBox(c, sel)
    }
    c.restore()
  }

  function canvasPoint(e: PointerEvent): Point {
    const canvas = activeCanvasRef.value!
    const rect = canvas.getBoundingClientRect()
    const store = useCanvasStore()
    return {
      x: (e.clientX - rect.left) / store.zoom + store.panX,
      y: (e.clientY - rect.top) / store.zoom + store.panY,
    }
  }

  onMounted(() => {
    const sc = staticCanvasRef.value
    const ac = activeCanvasRef.value
    if (!sc || !ac) return
    staticCtx.value = sc.getContext('2d')
    activeCtx.value = ac.getContext('2d')
    resize()
    window.addEventListener('resize', resize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resize)
  })

  function captureSnapshot(): string {
    const sc = staticCanvasRef.value
    if (!sc) return ''
    const temp = document.createElement('canvas')
    temp.width = sc.width
    temp.height = sc.height
    const ctx = temp.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#0f0f1a'
    ctx.fillRect(0, 0, temp.width, temp.height)
    ctx.drawImage(sc, 0, 0)
    return temp.toDataURL('image/png')
  }

  return { canvasPoint, resize, redrawStatic, redrawActive, redrawActiveAll, captureSnapshot }
}

export function drawElement(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, element: DrawElement) {
  c.save()
  c.strokeStyle = element.color
  c.lineWidth = element.strokeWidth
  c.lineCap = 'round'
  c.lineJoin = 'round'

  switch (element.type) {
    case 'pen':
      drawPen(c, element.points)
      break
    case 'eraser':
      c.globalCompositeOperation = 'destination-out'
      c.strokeStyle = 'rgba(0,0,0,1)'
      c.fillStyle = 'rgba(0,0,0,1)'
      drawEraser(c, element.points, element.strokeWidth)
      break
    case 'rect':
      drawRect(c, element.points)
      break
    case 'circle':
      drawCircle(c, element.points)
      break
    case 'arrow':
      drawArrow(c, element.points)
      break
    case 'line':
      drawLine(c, element.points)
      break
    case 'text':
      drawText(c, element)
      break
    case 'fill':
      drawFill(c, element)
      break
    default:
      break
  }
  c.restore()
}

function drawSelectionBox(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, element: DrawElement) {
  const { x, y, w, h } = getElementBounds(element)
  const PAD = 6
  c.save()
  c.strokeStyle = '#3b82f6'
  c.lineWidth = 1.5
  c.setLineDash([5, 3])
  c.strokeRect(x - PAD, y - PAD, w + PAD * 2, h + PAD * 2)
  c.restore()
}

function drawPen(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  c.beginPath()
  c.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    c.lineTo(points[i].x, points[i].y)
  }
  c.stroke()
}

function drawRect(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  const [start, end] = [points[0], points[points.length - 1]]
  c.beginPath()
  c.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
}

function drawCircle(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  const [start, end] = [points[0], points[points.length - 1]]
  const rx = (end.x - start.x) / 2
  const ry = (end.y - start.y) / 2
  const cx = start.x + rx
  const cy = start.y + ry
  c.beginPath()
  c.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
  c.stroke()
}

function drawLine(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  const from = points[0]
  const to = points[points.length - 1]
  c.beginPath()
  c.moveTo(from.x, from.y)
  c.lineTo(to.x, to.y)
  c.stroke()
}

function drawArrow(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  const from = points[0]
  const to = points[points.length - 1]
  const headLen = 14
  const angle = Math.atan2(to.y - from.y, to.x - from.x)

  c.beginPath()
  c.moveTo(from.x, from.y)
  c.lineTo(to.x, to.y)
  c.stroke()

  c.beginPath()
  c.moveTo(to.x, to.y)
  c.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6))
  c.moveTo(to.x, to.y)
  c.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6))
  c.stroke()
}

function drawEraser(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, points: Point[], size: number) {
  const r = size / 2
  if (points.length === 1) {
    c.beginPath()
    c.arc(points[0].x, points[0].y, r, 0, Math.PI * 2)
    c.fill()
    return
  }
  c.lineWidth = size
  drawPen(c, points)
  // Fill circles at endpoints to avoid gaps
  c.beginPath()
  c.arc(points[0].x, points[0].y, r, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.arc(points[points.length - 1].x, points[points.length - 1].y, r, 0, Math.PI * 2)
  c.fill()
}

function drawText(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, element: DrawElement) {
  if (!element.text || element.points.length === 0) return
  const { x, y } = element.points[0]
  c.font = `${element.strokeWidth * 8 + 12}px sans-serif`
  c.fillStyle = element.color
  c.fillText(element.text, x, y)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '')
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  }
}

function floodFillImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fillR: number,
  fillG: number,
  fillB: number,
  tolerance: number,
): void {
  const startPos = startY * width + startX
  const si = startPos * 4
  const tR = data[si], tG = data[si + 1], tB = data[si + 2], tA = data[si + 3]

  if (tR === fillR && tG === fillG && tB === fillB && tA === 255) return

  const visited = new Uint8Array(width * height)
  const stack: number[] = [startPos]
  const MAX_PIXELS = 4_000_000
  let filled = 0

  while (stack.length > 0 && filled < MAX_PIXELS) {
    const pos = stack.pop()!
    if (visited[pos]) continue
    visited[pos] = 1

    const i = pos * 4
    if (
      Math.abs(data[i]     - tR) > tolerance ||
      Math.abs(data[i + 1] - tG) > tolerance ||
      Math.abs(data[i + 2] - tB) > tolerance ||
      Math.abs(data[i + 3] - tA) > tolerance
    ) continue

    data[i] = fillR; data[i + 1] = fillG; data[i + 2] = fillB; data[i + 3] = 255
    filled++

    const x = pos % width
    const y = Math.floor(pos / width)
    if (x > 0)          stack.push(pos - 1)
    if (x < width - 1)  stack.push(pos + 1)
    if (y > 0)          stack.push(pos - width)
    if (y < height - 1) stack.push(pos + width)
  }
}

function drawFill(c: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, element: DrawElement): void {
  const seed = element.points[0]
  if (!seed) return
  const store = useCanvasStore()
  const canvas = c.canvas

  const px = Math.round((seed.x - store.panX) * store.zoom)
  const py = Math.round((seed.y - store.panY) * store.zoom)
  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return

  const imageData = c.getImageData(0, 0, canvas.width, canvas.height)
  const { r, g, b } = hexToRgb(element.color)
  floodFillImageData(imageData.data, canvas.width, canvas.height, px, py, r, g, b, 30)
  c.putImageData(imageData, 0, 0)
}
