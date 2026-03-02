<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { DrawElement, Point } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useCanvas, hitTestElement } from '@/composables/useCanvas'
import { useSocket } from '@/composables/useSocket'
import { CURSOR_THROTTLE_MS } from '@/constants'
import CursorOverlay from './CursorOverlay.vue'
import ToolBar from './ToolBar.vue'

const route = useRoute()
const roomId = route.params.roomId as string

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const { redrawAll, drawElement, canvasPoint, drawSelectionBox } = useCanvas(canvasRef)
const { socket, connected, connect } = useSocket()

// Drawing state
const isDrawing = ref(false)
const currentElement = ref<DrawElement | null>(null)
let lastCursorEmit = 0
let lastDrawEmit = 0

// Select & move state
const selectedElementId = ref<string | null>(null)
const isDragging = ref(false)
const isHoveringElement = ref(false)
let dragStart: Point | null = null
let dragOriginPoints: Point[] = []
let hasMovedDuringDrag = false

// rAF render loop
let animFrameId: number | null = null

function scheduleRender() {
  if (animFrameId !== null) return
  animFrameId = requestAnimationFrame(() => {
    animFrameId = null
    redrawAll(canvasStore.elements)
    if (currentElement.value) drawElement(currentElement.value)
    if (selectedElementId.value) {
      const sel = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (sel) drawSelectionBox(sel)
    }
  })
}

// --- Socket setup ---
onMounted(async () => {
  await connect()

  if (!socket.value) return

  socket.value.emit('room:join', roomId)

  socket.value.on('room:state', (elements: DrawElement[]) => {
    canvasStore.setElements(elements)
    redrawAll(canvasStore.elements)
  })

  socket.value.on('draw:remote', (element: DrawElement) => {
    canvasStore.updateElement(element)
    redrawAll(canvasStore.elements)
  })
})

watch(
  () => canvasStore.elements,
  () => {
    redrawAll(canvasStore.elements)
    if (selectedElementId.value) {
      const el = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (el) drawSelectionBox(el)
    }
  },
  { deep: true },
)

watch(
  () => canvasStore.activeTool,
  () => {
    selectedElementId.value = null
    isHoveringElement.value = false
    redrawAll(canvasStore.elements)
  },
)

// --- Drawing events ---
function onPointerDown(e: MouseEvent) {
  if (canvasStore.activeTool === 'select') {
    const point = canvasPoint(e)
    const hit = [...canvasStore.elements].reverse().find((el) => hitTestElement(el, point))
    selectedElementId.value = hit?.id ?? null
    if (hit) {
      isDragging.value = true
      dragStart = point
      dragOriginPoints = hit.points.map((p) => ({ ...p }))
      hasMovedDuringDrag = false
    }
    redrawAll(canvasStore.elements)
    if (hit) drawSelectionBox(hit)
    return
  }

  if (canvasStore.activeTool === 'text') {
    handleText(e)
    return
  }

  const point = canvasPoint(e)
  const userId = authStore.user?.uid ?? ''
  const element: DrawElement = {
    id: crypto.randomUUID(),
    type: canvasStore.activeTool,
    points: [point],
    color: canvasStore.activeColor,
    strokeWidth: canvasStore.activeStrokeWidth,
    userId,
    createdAt: Date.now(),
  }

  isDrawing.value = true
  currentElement.value = element
  socket.value?.emit('draw:start', element)
}

function onPointerMove(e: MouseEvent) {
  const now = Date.now()
  const point = canvasPoint(e)

  // Cursor broadcast — always throttled
  if (now - lastCursorEmit >= CURSOR_THROTTLE_MS) {
    lastCursorEmit = now
    socket.value?.emit('cursor:move', point)
  }

  if (canvasStore.activeTool === 'select') {
    isHoveringElement.value = canvasStore.elements.some((el) => hitTestElement(el, point))

    if (isDragging.value && dragStart && selectedElementId.value) {
      if (!hasMovedDuringDrag) {
        canvasStore.snapshotHistory()
        hasMovedDuringDrag = true
      }
      const dx = point.x - dragStart.x
      const dy = point.y - dragStart.y
      const newPoints = dragOriginPoints.map((p) => ({ x: p.x + dx, y: p.y + dy }))
      const el = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (el) {
        canvasStore.updateElement({ ...el, points: newPoints })
        scheduleRender()
      }
    }
    return
  }

  if (!isDrawing.value || !currentElement.value) return

  const el = currentElement.value

  if (el.type === 'pen') {
    el.points.push(point)
  } else {
    el.points = [el.points[0], point]
  }

  scheduleRender()

  // Draw update — throttled to 16ms
  if (now - lastDrawEmit >= 16) {
    lastDrawEmit = now
    socket.value?.emit('draw:update', { ...el, points: [...el.points] })
  }
}

function onPointerUp() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }

  if (canvasStore.activeTool === 'select') {
    if (isDragging.value && selectedElementId.value && hasMovedDuringDrag) {
      const el = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (el) socket.value?.emit('draw:end', el)
    }
    isDragging.value = false
    dragStart = null
    dragOriginPoints = []
    hasMovedDuringDrag = false
    return
  }

  if (!isDrawing.value || !currentElement.value) return

  const el = { ...currentElement.value, points: [...currentElement.value.points] }
  isDrawing.value = false
  currentElement.value = null
  canvasStore.addElement(el)
  socket.value?.emit('draw:end', el)
}

function handleText(e: MouseEvent) {
  const text = window.prompt('Enter text:')
  if (!text) return

  const point = canvasPoint(e)
  const element: DrawElement = {
    id: crypto.randomUUID(),
    type: 'text',
    points: [point],
    color: canvasStore.activeColor,
    strokeWidth: canvasStore.activeStrokeWidth,
    text,
    userId: authStore.user?.uid ?? '',
    createdAt: Date.now(),
  }

  canvasStore.addElement(element)
  redrawAll(canvasStore.elements)
  socket.value?.emit('draw:end', element)
}
</script>

<template>
  <div class="relative w-full h-full bg-white overflow-hidden">
    <ToolBar />

    <canvas
      ref="canvasRef"
      class="absolute inset-0 w-full h-full"
      :class="
        canvasStore.activeTool !== 'select'
          ? 'cursor-crosshair'
          : isDragging
            ? 'cursor-grabbing'
            : isHoveringElement
              ? 'cursor-grab'
              : 'cursor-default'
      "
      @mousedown="onPointerDown"
      @mousemove="onPointerMove"
      @mouseup="onPointerUp"
      @mouseleave="onPointerUp"
    />

    <CursorOverlay :socket="socket" />

    <div v-if="!connected" class="absolute top-2 right-2 text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
      Disconnected
    </div>
  </div>
</template>
