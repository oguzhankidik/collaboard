import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawElement, ToolType, Point } from '@/types'
import { ZOOM_MIN, ZOOM_MAX, BOARD_SIZE } from '@/constants'

export const DEFAULT_ERASER_SIZE = 16

export const useCanvasStore = defineStore('canvas', () => {
  const elements = ref<DrawElement[]>([])
  const activeTool = ref<ToolType>('pen')
  const activeColor = ref('#000000')
  const activeStrokeWidth = ref(2)
  const activeEraserSize = ref(DEFAULT_ERASER_SIZE)
  const history = ref<DrawElement[][]>([])
  const redoStack = ref<DrawElement[][]>([])

  // Viewport state
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  function setZoom(z: number) {
    zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))
  }

  function setPan(x: number, y: number) {
    const half = BOARD_SIZE / 2
    panX.value = Math.min(half, Math.max(-half, x))
    panY.value = Math.min(half, Math.max(-half, y))
  }

  function resetView() {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
  }

  function setElements(list: DrawElement[]) {
    elements.value = list
  }

  function addElement(element: DrawElement) {
    history.value.push([...elements.value])
    redoStack.value = []
    elements.value.push(element)
  }

  function removeElement(id: string) {
    elements.value = elements.value.filter((e) => e.id !== id)
  }

  function updateElement(element: DrawElement) {
    const idx = elements.value.findIndex((e) => e.id === element.id)
    if (idx !== -1) {
      elements.value[idx] = element
    } else {
      elements.value.push(element)
    }
  }

  function undo() {
    if (history.value.length === 0) return
    redoStack.value.push([...elements.value])
    elements.value = history.value.pop()!
  }

  function redo() {
    if (redoStack.value.length === 0) return
    history.value.push([...elements.value])
    elements.value = redoStack.value.pop()!
  }

  function snapshotHistory() {
    history.value.push(elements.value.map((e) => ({ ...e, points: [...e.points] })))
    redoStack.value = []
  }

  function moveElement(id: string, newPoints: Point[]) {
    const idx = elements.value.findIndex((e) => e.id === id)
    if (idx === -1) return
    elements.value[idx] = { ...elements.value[idx], points: newPoints }
  }

  function setActiveTool(tool: ToolType) {
    activeTool.value = tool
  }

  function setActiveColor(color: string) {
    activeColor.value = color
  }

  function setActiveStrokeWidth(width: number) {
    activeStrokeWidth.value = width
  }

  function setActiveEraserSize(size: number) {
    activeEraserSize.value = size
  }

  function clearHistory() {
    history.value = []
    redoStack.value = []
  }

  return {
    elements,
    activeTool,
    activeColor,
    activeStrokeWidth,
    activeEraserSize,
    history,
    redoStack,
    zoom,
    panX,
    panY,
    setElements,
    addElement,
    removeElement,
    updateElement,
    snapshotHistory,
    moveElement,
    undo,
    redo,
    setActiveTool,
    setActiveColor,
    setActiveStrokeWidth,
    setActiveEraserSize,
    clearHistory,
    setZoom,
    setPan,
    resetView,
  }
})
