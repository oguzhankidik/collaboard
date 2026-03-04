<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Socket } from 'socket.io-client'
import type { DrawElement, Point } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useCanvas, hitTestElement } from '@/composables/useCanvas'
import { CURSOR_THROTTLE_MS, ZOOM_MIN, ZOOM_MAX, ZOOM_WHEEL_FACTOR } from '@/constants'
import CursorOverlay from './CursorOverlay.vue'
import ToolBar from './ToolBar.vue'
import ParticipantPanel from './ParticipantPanel.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const props = defineProps<{ socket: Socket | null }>()

const route = useRoute()
const roomId = route.params.roomId as string

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const { redrawAll, canvasPoint, drawSelectionBox } = useCanvas(canvasRef)

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

// Pan state
const isPanning = ref(false)
const panStartScreen = ref<Point>({ x: 0, y: 0 })
const panStartOffset = ref<Point>({ x: 0, y: 0 })

// rAF render loop
let animFrameId: number | null = null

function scheduleRender() {
  if (animFrameId !== null) return
  animFrameId = requestAnimationFrame(() => {
    animFrameId = null
    redrawAll(canvasStore.elements, currentElement.value, selectedElementId.value)
  })
}

// --- Socket setup ---
onMounted(() => {
  props.socket?.on('draw:remote', (element: DrawElement) => {
    canvasStore.updateElement(element)
    redrawAll(canvasStore.elements, null, selectedElementId.value)
  })
})

watch(
  () => canvasStore.elements,
  () => {
    redrawAll(canvasStore.elements, null, selectedElementId.value)
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

watch(
  () => [canvasStore.zoom, canvasStore.panX, canvasStore.panY],
  () => {
    scheduleRender()
  },
)

// --- Wheel zoom ---
function onWheel(e: WheelEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const oldZoom = canvasStore.zoom
  const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
  const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZoom * factor))

  const worldX = mx / oldZoom + canvasStore.panX
  const worldY = my / oldZoom + canvasStore.panY
  canvasStore.setZoom(newZoom)
  canvasStore.setPan(worldX - mx / newZoom, worldY - my / newZoom)
  scheduleRender()
}

// --- Drawing events ---
function onPointerDown(e: MouseEvent) {
  if (canvasStore.activeTool === 'hand') {
    isPanning.value = true
    panStartScreen.value = { x: e.clientX, y: e.clientY }
    panStartOffset.value = { x: canvasStore.panX, y: canvasStore.panY }
    return
  }

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
    redrawAll(canvasStore.elements, null, hit?.id ?? null)
    return
  }

  if (canvasStore.activeTool === 'text') {
    handleText(e)
    return
  }

  const point = canvasPoint(e)
  const userId = authStore.user?.uid ?? ''
  const isEraser = canvasStore.activeTool === 'eraser'
  const element: DrawElement = {
    id: crypto.randomUUID(),
    type: canvasStore.activeTool,
    points: [point],
    color: canvasStore.activeColor,
    strokeWidth: isEraser ? canvasStore.activeEraserSize : canvasStore.activeStrokeWidth,
    userId,
    createdAt: Date.now(),
  }

  isDrawing.value = true
  currentElement.value = element
  props.socket?.emit('draw:start', element)
}

function onPointerMove(e: MouseEvent) {
  const now = Date.now()
  const point = canvasPoint(e)

  // Cursor broadcast — always throttled (world-space position)
  if (now - lastCursorEmit >= CURSOR_THROTTLE_MS) {
    lastCursorEmit = now
    props.socket?.emit('cursor:move', point)
  }

  if (isPanning.value) {
    const dx = e.clientX - panStartScreen.value.x
    const dy = e.clientY - panStartScreen.value.y
    canvasStore.setPan(
      panStartOffset.value.x - dx / canvasStore.zoom,
      panStartOffset.value.y - dy / canvasStore.zoom,
    )
    scheduleRender()
    return
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

  if (el.type === 'pen' || el.type === 'eraser') {
    el.points.push(point)
  } else {
    el.points = [el.points[0], point]
  }

  scheduleRender()

  // Draw update — throttled to 16ms
  if (now - lastDrawEmit >= 16) {
    lastDrawEmit = now
    props.socket?.emit('draw:update', { ...el, points: [...el.points] })
  }
}

function onPointerUp() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }

  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (canvasStore.activeTool === 'select') {
    if (isDragging.value && selectedElementId.value && hasMovedDuringDrag) {
      const el = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (el) props.socket?.emit('draw:end', el)
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
  props.socket?.emit('draw:end', el)
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
  props.socket?.emit('draw:end', element)
}
</script>

<template>
  <div class="relative w-full h-full overflow-hidden bg-theme-bg">
    <ToolBar @clear-board="props.socket?.emit('board:clear', roomId)" />

    <canvas
      ref="canvasRef"
      class="absolute inset-0 w-full h-full"
      :class="
        canvasStore.activeTool === 'hand'
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : canvasStore.activeTool === 'eraser'
            ? 'cursor-cell'
            : canvasStore.activeTool !== 'select'
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
      @wheel.prevent="onWheel"
    />

    <CursorOverlay :socket="props.socket" />

    <div class="absolute top-3 right-3 z-30 flex flex-col gap-2 items-end">
      <ParticipantPanel />
      <ChatPanel :socket="props.socket" :room-id="roomId" class="w-[180px]" />
    </div>
  </div>
</template>
