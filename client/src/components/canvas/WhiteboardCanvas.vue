<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Socket } from 'socket.io-client'
import type { DrawElement, Point } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import {
  useCanvas,
  hitTestElement,
  cacheElementBounds,
  invalidateBounds,
  clearBoundsCache,
} from '@/composables/useCanvas'
import { CURSOR_THROTTLE_MS, ZOOM_MIN, ZOOM_MAX, ZOOM_WHEEL_FACTOR } from '@/constants'
import CursorOverlay from './CursorOverlay.vue'
import ToolBar from './ToolBar.vue'
import ParticipantPanel from './ParticipantPanel.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import Minimap from './Minimap.vue'

const props = defineProps<{ socket: Socket | null }>()

const route = useRoute()
const roomId = route.params.roomId as string

// Two canvas layers: static (committed elements) + active (in-progress drawing)
const staticCanvasRef = ref<HTMLCanvasElement | null>(null)
const activeCanvasRef = ref<HTMLCanvasElement | null>(null)

const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const roomStore = useRoomStore()
const { redrawStatic, redrawActive, redrawActiveAll, canvasPoint } = useCanvas(
  staticCanvasRef,
  activeCanvasRef,
)

// In-progress remote strokes (not yet committed) — plain Map, no reactivity needed
const remoteInProgress = new Map<string, DrawElement>()

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

// Inline text input state
const textInput = ref<{ x: number; y: number; worldPoint: { x: number; y: number } } | null>(null)
const textInputRef = ref<HTMLTextAreaElement | null>(null)
const textInputValue = ref('')

// Pan state
const isPanning = ref(false)
const panStartScreen = ref<Point>({ x: 0, y: 0 })
const panStartOffset = ref<Point>({ x: 0, y: 0 })

// Whether eraser is actively being drawn (active canvas shows full render, static hidden)
const isEraserDrawing = ref(false)

// Mobile drawer state
const showMobileParticipants = ref(false)
const showMobileChat = ref(false)

// Pinch-to-zoom state (plain let — not reactive)
const activePinchPointers = new Map<number, PointerEvent>()
let pinchStartDistance = 0
let pinchStartZoom = 0
let pinchStartMidWorld: Point = { x: 0, y: 0 }
let pinchStartMidScreen: Point = { x: 0, y: 0 }

// --- RAF handles ---
let staticFrameId: number | null = null
let activeFrameId: number | null = null

function scheduleStaticRender() {
  if (staticFrameId !== null) return
  staticFrameId = requestAnimationFrame(() => {
    staticFrameId = null
    redrawStatic(canvasStore.elements, selectedElementId.value)
  })
}

function scheduleActiveRender() {
  if (activeFrameId !== null) return
  activeFrameId = requestAnimationFrame(() => {
    activeFrameId = null
    redrawActive(currentElement.value, remoteInProgress)
  })
}

// Eraser mode: hide static canvas, do full render on active canvas
function scheduleEraserRender() {
  if (activeFrameId !== null) return
  activeFrameId = requestAnimationFrame(() => {
    activeFrameId = null
    redrawActiveAll(canvasStore.elements, currentElement.value, selectedElementId.value)
  })
}

// --- Socket setup ---
onMounted(() => {
  // Resize both canvases after mount then do initial static render
  window.addEventListener('resize', () => {
    scheduleStaticRender()
    scheduleActiveRender()
  })

  props.socket?.on('draw:remote', (element: DrawElement) => {
    // In-progress remote stroke — show on active canvas only
    remoteInProgress.set(element.userId, element)
    scheduleActiveRender()
  })

  props.socket?.on('draw:committed', (element: DrawElement) => {
    // Remote stroke finished — move to committed store and redraw static
    remoteInProgress.delete(element.userId)
    canvasStore.updateElement(element)
    cacheElementBounds(element)
    scheduleStaticRender()
    scheduleActiveRender()
  })

  props.socket?.on('user:left', (userId: string) => {
    if (remoteInProgress.has(userId)) {
      remoteInProgress.delete(userId)
      scheduleActiveRender()
    }
  })

  props.socket?.on('board:cleared', () => {
    canvasStore.setElements([])
    clearBoundsCache()
    remoteInProgress.clear()
    scheduleStaticRender()
    scheduleActiveRender()
  })
})

// Undo/redo and room:state (setElements) change the array reference → redraw static
watch(
  () => canvasStore.elements,
  (newElements) => {
    newElements.forEach(cacheElementBounds)
    scheduleStaticRender()
  },
)

watch(
  () => canvasStore.activeTool,
  () => {
    selectedElementId.value = null
    isHoveringElement.value = false
    scheduleStaticRender()
  },
)

watch(
  () => [canvasStore.zoom, canvasStore.panX, canvasStore.panY],
  () => {
    if (isEraserDrawing.value) {
      scheduleEraserRender()
    } else {
      scheduleStaticRender()
      scheduleActiveRender()
    }
  },
)

// --- Wheel zoom ---
function onWheel(e: WheelEvent) {
  const rect = activeCanvasRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const oldZoom = canvasStore.zoom
  const factor = e.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR
  const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldZoom * factor))

  const worldX = mx / oldZoom + canvasStore.panX
  const worldY = my / oldZoom + canvasStore.panY
  canvasStore.setZoom(newZoom)
  canvasStore.setPan(worldX - mx / newZoom, worldY - my / newZoom)
  scheduleStaticRender()
}

// --- Drawing events ---
function onPointerDown(e: PointerEvent) {
  activePinchPointers.set(e.pointerId, e)
  if (activePinchPointers.size === 2) {
    const [p1, p2] = [...activePinchPointers.values()]
    pinchStartDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
    pinchStartZoom = canvasStore.zoom
    const midX = (p1.clientX + p2.clientX) / 2
    const midY = (p1.clientY + p2.clientY) / 2
    const rect = activeCanvasRef.value!.getBoundingClientRect()
    pinchStartMidScreen = { x: midX - rect.left, y: midY - rect.top }
    pinchStartMidWorld = {
      x: pinchStartMidScreen.x / pinchStartZoom + canvasStore.panX,
      y: pinchStartMidScreen.y / pinchStartZoom + canvasStore.panY,
    }
    isDrawing.value = false
    currentElement.value = null
    isPanning.value = false
    return
  }

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
      invalidateBounds(hit.id)
    }
    scheduleStaticRender()
    return
  }

  if (canvasStore.activeTool === 'text') {
    handleText(e)
    return
  }

  if (canvasStore.activeTool === 'fill') {
    const point = canvasPoint(e)
    const el: DrawElement = {
      id: crypto.randomUUID(),
      type: 'fill',
      points: [point],
      color: canvasStore.activeColor,
      strokeWidth: 0,
      userId: authStore.user?.uid ?? '',
      createdAt: Date.now(),
    }
    canvasStore.addElement(el)
    scheduleStaticRender()
    props.socket?.emit('draw:end', el)
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

  if (isEraser) {
    isEraserDrawing.value = true
  }

  props.socket?.emit('draw:start', element)
}

function onPointerMove(e: PointerEvent) {
  if (activePinchPointers.has(e.pointerId)) activePinchPointers.set(e.pointerId, e)
  if (activePinchPointers.size === 2) {
    const [p1, p2] = [...activePinchPointers.values()]
    const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY)
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartZoom * (dist / pinchStartDistance)))
    canvasStore.setZoom(newZoom)
    canvasStore.setPan(
      pinchStartMidWorld.x - pinchStartMidScreen.x / newZoom,
      pinchStartMidWorld.y - pinchStartMidScreen.y / newZoom,
    )
    scheduleStaticRender()
    return
  }

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
    scheduleStaticRender()
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
        scheduleStaticRender()
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

  // Eraser: full render on active canvas (static is hidden via CSS)
  // Normal tools: only update active canvas (O(1) regardless of element count)
  if (isEraserDrawing.value) {
    scheduleEraserRender()
  } else {
    scheduleActiveRender()
  }

  // Draw update — throttled to 16ms
  if (now - lastDrawEmit >= 16) {
    lastDrawEmit = now
    props.socket?.emit('draw:update', { ...el, points: [...el.points] })
  }
}

function onPointerUp(e?: PointerEvent) {
  if (e) activePinchPointers.delete(e.pointerId)

  // Guard: if nothing is active, don't cancel pending renders.
  // On mobile, pointerleave fires right after pointerup (finger lifted),
  // causing a second call that would cancel the RAF scheduled by the first call.
  if (!isDrawing.value && !isPanning.value && !isDragging.value) return

  if (staticFrameId !== null) {
    cancelAnimationFrame(staticFrameId)
    staticFrameId = null
  }
  if (activeFrameId !== null) {
    cancelAnimationFrame(activeFrameId)
    activeFrameId = null
  }

  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (canvasStore.activeTool === 'select') {
    if (isDragging.value && selectedElementId.value && hasMovedDuringDrag) {
      const el = canvasStore.elements.find((e) => e.id === selectedElementId.value)
      if (el) {
        cacheElementBounds(el)
        props.socket?.emit('draw:end', el)
      }
    }
    isDragging.value = false
    dragStart = null
    dragOriginPoints = []
    hasMovedDuringDrag = false
    scheduleStaticRender()
    return
  }

  if (!isDrawing.value || !currentElement.value) return

  const el = { ...currentElement.value, points: [...currentElement.value.points] }
  isDrawing.value = false
  currentElement.value = null

  // Restore eraser mode — show static canvas again
  if (isEraserDrawing.value) {
    isEraserDrawing.value = false
  }

  canvasStore.addElement(el)
  cacheElementBounds(el)
  props.socket?.emit('draw:end', el)
  scheduleStaticRender()
  scheduleActiveRender()
}

function handleText(e: PointerEvent) {
  const rect = activeCanvasRef.value!.getBoundingClientRect()
  const screenX = e.clientX - rect.left
  const screenY = e.clientY - rect.top
  const worldPoint = canvasPoint(e)

  textInputValue.value = ''
  textInput.value = { x: screenX, y: screenY, worldPoint }

  // Focus the textarea on next tick after it mounts
  setTimeout(() => textInputRef.value?.focus(), 0)
}

function commitTextFromInput() {
  const text = textInputValue.value.trim()
  const saved = textInput.value
  textInput.value = null
  textInputValue.value = ''

  if (!text || !saved) return

  const element: DrawElement = {
    id: crypto.randomUUID(),
    type: 'text',
    points: [saved.worldPoint],
    color: canvasStore.activeColor,
    strokeWidth: canvasStore.activeStrokeWidth,
    text,
    userId: authStore.user?.uid ?? '',
    createdAt: Date.now(),
  }

  canvasStore.addElement(element)
  cacheElementBounds(element)
  scheduleStaticRender()
  props.socket?.emit('draw:end', element)
}

function onTextKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    textInput.value = null
    textInputValue.value = ''
    return
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    commitTextFromInput()
  }
}
</script>

<template>
  <div class="relative w-full h-full overflow-hidden bg-theme-bg">
    <ToolBar @clear-board="props.socket?.emit('board:clear', roomId)" />

    <!-- Static canvas: committed elements. Hidden during eraser drawing. -->
    <canvas
      ref="staticCanvasRef"
      class="whiteboard-canvas-layer absolute inset-0 w-full h-full pointer-events-none"
      :class="{ invisible: isEraserDrawing }"
    />

    <!-- Active canvas: in-progress drawing + remote strokes. Receives pointer events. -->
    <canvas
      ref="activeCanvasRef"
      class="whiteboard-canvas-layer absolute inset-0 w-full h-full"
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
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    />

    <!-- Inline text input -->
    <textarea
      v-if="textInput"
      ref="textInputRef"
      v-model="textInputValue"
      class="text-input-overlay"
      :style="{
        left: textInput.x + 'px',
        top: textInput.y + 'px',
        color: canvasStore.activeColor,
        fontSize: (canvasStore.activeStrokeWidth * 8 + 12) + 'px',
      }"
      rows="1"
      placeholder="Type here…"
      @keydown="onTextKeydown"
      @blur="commitTextFromInput"
    />

    <Minimap :main-canvas="activeCanvasRef" />

    <CursorOverlay :socket="props.socket" />

    <!-- Desktop panels -->
    <div class="hidden md:flex absolute top-3 right-3 z-30 flex-col gap-2 items-end">
      <ParticipantPanel />
      <ChatPanel :socket="props.socket" :room-id="roomId" class="w-[180px]" />
    </div>

    <!-- Mobile FAB toggles -->
    <div class="flex md:hidden absolute bottom-16 right-3 z-30 flex-col gap-2">
      <button class="panel-fab" @click="showMobileParticipants = !showMobileParticipants">
        ■ {{ roomStore.lobbyParticipants.length }}
      </button>
      <button class="panel-fab" @click="showMobileChat = !showMobileChat">
        ■ CHAT
      </button>
    </div>

    <!-- Mobile drawer backdrop -->
    <div
      v-if="showMobileParticipants || showMobileChat"
      class="md:hidden absolute inset-0 z-30 bg-black/50"
      @pointerdown.stop="showMobileParticipants = false; showMobileChat = false"
    />

    <!-- Mobile participants drawer -->
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div v-if="showMobileParticipants" class="md:hidden absolute top-0 right-0 bottom-0 w-64 z-40">
        <ParticipantPanel />
      </div>
    </Transition>

    <!-- Mobile chat drawer -->
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div v-if="showMobileChat" class="md:hidden absolute top-0 right-0 bottom-0 w-64 z-40">
        <ChatPanel :socket="props.socket" :room-id="roomId" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.whiteboard-canvas-layer {
  touch-action: none;
}

.panel-fab {
  padding: 0.375rem 0.625rem;
  background-color: var(--color-surface-2);
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-pixel);
  font-size: 8px;
  white-space: nowrap;
  cursor: pointer;
}

.panel-fab:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.text-input-overlay {
  position: absolute;
  z-index: 50;
  min-width: 120px;
  max-width: 400px;
  background: transparent;
  border: none;
  border-bottom: 2px dashed currentColor;
  outline: none;
  resize: none;
  overflow: hidden;
  font-family: sans-serif;
  line-height: 1.3;
  padding: 2px 4px;
}
</style>
