import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DrawElement, ToolType, Point } from '@/types'

export const useCanvasStore = defineStore('canvas', () => {
  const elements = ref<DrawElement[]>([])
  const activeTool = ref<ToolType>('pen')
  const activeColor = ref('#000000')
  const activeStrokeWidth = ref(2)
  const history = ref<DrawElement[][]>([])
  const redoStack = ref<DrawElement[][]>([])

  function setElements(list: DrawElement[]) {
    elements.value = list
  }

  function addElement(element: DrawElement) {
    history.value.push([...elements.value])
    redoStack.value = []
    elements.value.push(element)
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

  return {
    elements,
    activeTool,
    activeColor,
    activeStrokeWidth,
    history,
    redoStack,
    setElements,
    addElement,
    updateElement,
    snapshotHistory,
    moveElement,
    undo,
    redo,
    setActiveTool,
    setActiveColor,
    setActiveStrokeWidth,
  }
})
