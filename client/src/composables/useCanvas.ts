import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import type { DrawElement, Point } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'

export function getElementBounds(element: DrawElement): { x: number; y: number; w: number; h: number } {
  if (element.type === 'text' && element.points.length > 0) {
    const fontSize = element.strokeWidth * 8 + 12
    const approxWidth = Math.max((element.text?.length ?? 5) * fontSize * 0.6, 20)
    const { x, y } = element.points[0]
    return { x, y: y - fontSize, w: approxWidth, h: fontSize * 1.2 }
  }
  const xs = element.points.map((p) => p.x)
  const ys = element.points.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function hitTestElement(element: DrawElement, point: Point): boolean {
  const PAD = Math.max(element.strokeWidth, 8)
  const { x, y, w, h } = getElementBounds(element)
  return point.x >= x - PAD && point.x <= x + w + PAD && point.y >= y - PAD && point.y <= y + h + PAD
}

export function useCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const ctx = ref<CanvasRenderingContext2D | null>(null)

  function resize() {
    const canvas = canvasRef.value
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width
    canvas.height = height
    redrawAll([])
  }

  function getContext(): CanvasRenderingContext2D {
    if (!ctx.value) throw new Error('Canvas context not initialized')
    return ctx.value
  }

  function clear() {
    const canvas = canvasRef.value
    if (!canvas) return
    getContext().clearRect(0, 0, canvas.width, canvas.height)
  }

  function drawElement(element: DrawElement) {
    const c = getContext()
    c.save()
    c.strokeStyle = element.color
    c.lineWidth = element.strokeWidth
    c.lineCap = 'round'
    c.lineJoin = 'round'

    switch (element.type) {
      case 'pen':
        drawPen(c, element.points)
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
      case 'text':
        drawText(c, element)
        break
      default:
        break
    }
    c.restore()
  }

  function redrawAll(
    elements: DrawElement[],
    currentEl?: DrawElement | null,
    selectedId?: string | null,
  ) {
    const store = useCanvasStore()
    const c = getContext()
    clear()
    c.save()
    c.scale(store.zoom, store.zoom)
    c.translate(-store.panX, -store.panY)
    for (const el of elements) {
      drawElement(el)
    }
    if (currentEl) drawElement(currentEl)
    if (selectedId) {
      const sel = elements.find((e) => e.id === selectedId)
      if (sel) drawSelectionBox(sel)
    }
    c.restore()
  }

  function drawSelectionBox(element: DrawElement) {
    const c = getContext()
    const { x, y, w, h } = getElementBounds(element)
    const PAD = 6
    c.save()
    c.strokeStyle = '#3b82f6'
    c.lineWidth = 1.5
    c.setLineDash([5, 3])
    c.strokeRect(x - PAD, y - PAD, w + PAD * 2, h + PAD * 2)
    c.restore()
  }

  function canvasPoint(e: MouseEvent | TouchEvent): Point {
    const canvas = canvasRef.value!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const store = useCanvasStore()
    return {
      x: (clientX - rect.left) / store.zoom + store.panX,
      y: (clientY - rect.top) / store.zoom + store.panY,
    }
  }

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    ctx.value = canvas.getContext('2d')
    resize()
    window.addEventListener('resize', resize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resize)
  })

  return { ctx, drawElement, redrawAll, clear, canvasPoint, resize, drawSelectionBox }
}

// --- Drawing helpers ---

function drawPen(c: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  c.beginPath()
  c.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    c.lineTo(points[i].x, points[i].y)
  }
  c.stroke()
}

function drawRect(c: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return
  const [start, end] = [points[0], points[points.length - 1]]
  c.beginPath()
  c.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
}

function drawCircle(c: CanvasRenderingContext2D, points: Point[]) {
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

function drawArrow(c: CanvasRenderingContext2D, points: Point[]) {
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

function drawText(c: CanvasRenderingContext2D, element: DrawElement) {
  if (!element.text || element.points.length === 0) return
  const { x, y } = element.points[0]
  c.font = `${element.strokeWidth * 8 + 12}px sans-serif`
  c.fillStyle = element.color
  c.fillText(element.text, x, y)
}
