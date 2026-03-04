import { ref } from 'vue'
import type { Ref } from 'vue'
import { nanoid } from 'nanoid'
import type { DrawElement } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { useCanvas } from './useCanvas'
import { DRAW_UPDATE_THROTTLE_MS } from '@/constants'

export function useDrawing(
  canvasRef: Ref<HTMLCanvasElement | null>,
  emit: (event: string, payload: DrawElement) => void,
) {
  const canvasStore = useCanvasStore()
  const { drawElement, redrawAll, canvasPoint } = useCanvas(canvasRef)

  const isDrawing = ref(false)
  const currentElement = ref<DrawElement | null>(null)
  let lastEmitTime = 0

  function startDrawing(e: MouseEvent | TouchEvent) {
    if (canvasStore.activeTool === 'select') return

    const point = canvasPoint(e)
    const element: DrawElement = {
      id: nanoid(),
      type: canvasStore.activeTool,
      points: [point],
      color: canvasStore.activeColor,
      strokeWidth: canvasStore.activeStrokeWidth,
      userId: '',
      createdAt: Date.now(),
    }

    isDrawing.value = true
    currentElement.value = element
    canvasStore.updateElement(element)
    emit('draw:start', element)
  }

  function continueDrawing(e: MouseEvent | TouchEvent) {
    if (!isDrawing.value || !currentElement.value) return

    const point = canvasPoint(e)
    const el = currentElement.value

    if (el.type === 'pen') {
      el.points.push(point)
    } else {
      el.points = [el.points[0], point]
    }

    redrawAll(canvasStore.elements)
    drawElement(el)

    const now = Date.now()
    if (now - lastEmitTime >= DRAW_UPDATE_THROTTLE_MS) {
      lastEmitTime = now
      emit('draw:update', { ...el, points: [...el.points] })
    }
  }

  function endDrawing() {
    if (!isDrawing.value || !currentElement.value) return

    const el = currentElement.value
    canvasStore.addElement({ ...el, points: [...el.points] })
    redrawAll(canvasStore.elements)

    emit('draw:end', { ...el, points: [...el.points] })

    isDrawing.value = false
    currentElement.value = null
  }

  function handleTextInput(e: MouseEvent, userId: string) {
    if (canvasStore.activeTool !== 'text') return

    const point = canvasPoint(e)
    const text = window.prompt('Enter text:')
    if (!text) return

    const element: DrawElement = {
      id: nanoid(),
      type: 'text',
      points: [point],
      color: canvasStore.activeColor,
      strokeWidth: canvasStore.activeStrokeWidth,
      text,
      userId,
      createdAt: Date.now(),
    }

    canvasStore.addElement(element)
    redrawAll(canvasStore.elements)
    emit('draw:end', element)
  }

  return { isDrawing, startDrawing, continueDrawing, endDrawing, handleTextInput }
}
