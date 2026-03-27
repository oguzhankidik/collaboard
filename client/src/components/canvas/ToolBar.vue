<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { STROKE_WIDTHS, ERASER_SIZES, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '@/constants'

const emit = defineEmits<{ 'clear-board': [] }>()

const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const roomStore = useRoomStore()

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)
const isViewLocked = computed(() => roomStore.roomSettings.gameMode !== 'collaborative')

let colorDebounceTimer: ReturnType<typeof setTimeout> | null = null

function onColorInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  if (colorDebounceTimer !== null) clearTimeout(colorDebounceTimer)
  colorDebounceTimer = setTimeout(() => { canvasStore.setActiveColor(value) }, 80)
}

const toolbarScrollRef = ref<HTMLElement | null>(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollState() {
  const el = toolbarScrollRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function scrollLeft() {
  const el = toolbarScrollRef.value
  if (!el) return
  el.scrollBy({ left: -(el.clientWidth * 0.75), behavior: 'smooth' })
}

function scrollRight() {
  const el = toolbarScrollRef.value
  if (!el) return
  el.scrollBy({ left: el.clientWidth * 0.75, behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(updateScrollState)
  resizeObserver = new ResizeObserver(updateScrollState)
  if (toolbarScrollRef.value) resizeObserver.observe(toolbarScrollRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

function exportPng() {
  const layers = document.querySelectorAll<HTMLCanvasElement>('.whiteboard-canvas-layer')
  if (!layers.length) return
  const first = layers[0]
  const temp = document.createElement('canvas')
  temp.width = first.width
  temp.height = first.height
  const ctx = temp.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, temp.width, temp.height)
  layers.forEach((c) => ctx.drawImage(c, 0, 0))
  const link = document.createElement('a')
  link.download = 'collaboard.png'
  link.href = temp.toDataURL('image/png')
  link.click()
}

const canUndo = computed(() => canvasStore.history.length > 0)
const canRedo = computed(() => canvasStore.redoStack.length > 0)
</script>

<template>
  <div
    class="toolbar-panel absolute bottom-0 left-0 right-0 z-10 flex items-center md:bottom-auto md:top-3 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-auto md:px-2 md:py-1.5 md:gap-0.5"
  >
    <button
      v-show="canScrollLeft"
      class="btn-icon flex-shrink-0 md:hidden"
      title="Scroll left"
      @click="scrollLeft"
    >
      <svg width="10" height="16" viewBox="0 0 10 16">
        <rect x="6" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="8" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="12" width="2" height="2" fill="currentColor"/>
      </svg>
    </button>

    <div
      ref="toolbarScrollRef"
      class="toolbar-scroll flex items-center gap-0.5 px-2 py-1.5 flex-1 min-w-0 md:contents"
      @scroll="updateScrollState"
    >
      <button title="Pen" class="btn-icon" :class="{ active: canvasStore.activeTool === 'pen' }" @click="canvasStore.setActiveTool('pen')">
        <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="23 5 23 7 22 7 22 8 21 8 21 9 20 9 20 10 19 10 19 9 18 9 18 8 17 8 17 7 16 7 16 6 15 6 15 5 14 5 14 4 15 4 15 3 16 3 16 2 17 2 17 1 19 1 19 2 20 2 20 3 21 3 21 4 22 4 22 5 23 5"/><path d="m17,10v-1h-1v-1h-1v-1h-1v-1h-2v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v6h6v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-2h-1Zm-2,2v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H3v-4h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h1v-1h2v1h1v1h1v2h-1Z"/></svg>
      </button>

      <button title="Eraser" class="btn-icon" :class="{ active: canvasStore.activeTool === 'eraser' }" @click="canvasStore.setActiveTool('eraser')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="2" fill="currentColor"/><rect x="3" y="9" width="10" height="2" fill="currentColor"/><rect x="3" y="3" width="2" height="8" fill="currentColor"/><rect x="11" y="3" width="2" height="8" fill="currentColor"/><rect x="5" y="5" width="3" height="4" fill="currentColor"/><rect x="3" y="12" width="10" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Fill" class="btn-icon" :class="{ active: canvasStore.activeTool === 'fill' }" @click="canvasStore.setActiveTool('fill')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="4" y="2" width="6" height="2" fill="currentColor"/><rect x="2" y="4" width="2" height="6" fill="currentColor"/><rect x="10" y="4" width="2" height="4" fill="currentColor"/><rect x="4" y="10" width="6" height="2" fill="currentColor"/><rect x="10" y="2" width="2" height="2" fill="currentColor"/><rect x="12" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="8" width="2" height="4" fill="currentColor"/><rect x="10" y="12" width="4" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Rectangle" class="btn-icon" :class="{ active: canvasStore.activeTool === 'rect' }" @click="canvasStore.setActiveTool('rect')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="2" fill="currentColor"/><rect x="2" y="10" width="12" height="2" fill="currentColor"/><rect x="2" y="4" width="2" height="8" fill="currentColor"/><rect x="12" y="4" width="2" height="8" fill="currentColor"/></svg>
      </button>

      <button title="Circle" class="btn-icon" :class="{ active: canvasStore.activeTool === 'circle' }" @click="canvasStore.setActiveTool('circle')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="6" y="2" width="4" height="2" fill="currentColor"/><rect x="4" y="4" width="2" height="2" fill="currentColor"/><rect x="10" y="4" width="2" height="2" fill="currentColor"/><rect x="2" y="6" width="2" height="4" fill="currentColor"/><rect x="12" y="6" width="2" height="4" fill="currentColor"/><rect x="4" y="10" width="2" height="2" fill="currentColor"/><rect x="10" y="10" width="2" height="2" fill="currentColor"/><rect x="6" y="12" width="4" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Line" class="btn-icon" :class="{ active: canvasStore.activeTool === 'line' }" @click="canvasStore.setActiveTool('line')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="12" width="2" height="2" fill="currentColor"/><rect x="4" y="10" width="2" height="2" fill="currentColor"/><rect x="6" y="8" width="2" height="2" fill="currentColor"/><rect x="8" y="6" width="2" height="2" fill="currentColor"/><rect x="10" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="2" width="2" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Arrow" class="btn-icon" :class="{ active: canvasStore.activeTool === 'arrow' }" @click="canvasStore.setActiveTool('arrow')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="12" width="2" height="2" fill="currentColor"/><rect x="4" y="10" width="2" height="2" fill="currentColor"/><rect x="6" y="8" width="2" height="2" fill="currentColor"/><rect x="8" y="6" width="2" height="2" fill="currentColor"/><rect x="10" y="4" width="2" height="2" fill="currentColor"/><rect x="12" y="2" width="2" height="2" fill="currentColor"/><rect x="8" y="2" width="4" height="2" fill="currentColor"/><rect x="12" y="2" width="2" height="4" fill="currentColor"/></svg>
      </button>

      <button title="Text" class="btn-icon" :class="{ active: canvasStore.activeTool === 'text' }" @click="canvasStore.setActiveTool('text')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="2" fill="currentColor"/><rect x="7" y="3" width="2" height="10" fill="currentColor"/><rect x="4" y="11" width="8" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Select" class="btn-icon" :class="{ active: canvasStore.activeTool === 'select' }" @click="canvasStore.setActiveTool('select')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="2" width="2" height="2" fill="currentColor"/><rect x="3" y="4" width="2" height="2" fill="currentColor"/><rect x="3" y="6" width="2" height="2" fill="currentColor"/><rect x="3" y="8" width="2" height="2" fill="currentColor"/><rect x="3" y="10" width="2" height="2" fill="currentColor"/><rect x="5" y="10" width="2" height="2" fill="currentColor"/><rect x="5" y="4" width="2" height="2" fill="currentColor"/><rect x="7" y="6" width="2" height="2" fill="currentColor"/><rect x="7" y="12" width="2" height="2" fill="currentColor"/><rect x="9" y="8" width="2" height="2" fill="currentColor"/><rect x="9" y="12" width="2" height="2" fill="currentColor"/><rect x="11" y="10" width="2" height="4" fill="currentColor"/></svg>
      </button>

      <button title="Pan" class="btn-icon" :class="{ active: canvasStore.activeTool === 'hand' }" @click="canvasStore.setActiveTool('hand')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="5" y="2" width="2" height="6" fill="currentColor"/><rect x="7" y="1" width="2" height="7" fill="currentColor"/><rect x="9" y="2" width="2" height="6" fill="currentColor"/><rect x="11" y="4" width="2" height="4" fill="currentColor"/><rect x="3" y="9" width="2" height="4" fill="currentColor"/><rect x="5" y="8" width="8" height="5" fill="currentColor"/><rect x="3" y="13" width="10" height="2" fill="currentColor"/></svg>
      </button>

      <div class="toolbar-divider hidden md:block" />

      <label class="btn-icon cursor-pointer label-reset" title="Color">
        <span class="w-4 h-4 border border-theme" :style="{ backgroundColor: canvasStore.activeColor }" />
        <input type="color" class="sr-only" :value="canvasStore.activeColor" @input="onColorInput" />
      </label>

      <select
        v-if="canvasStore.activeTool !== 'fill'"
        class="toolbar-select"
        :value="canvasStore.activeTool === 'eraser' ? canvasStore.activeEraserSize : canvasStore.activeStrokeWidth"
        @change="canvasStore.activeTool === 'eraser'
          ? canvasStore.setActiveEraserSize(Number(($event.target as HTMLSelectElement).value))
          : canvasStore.setActiveStrokeWidth(Number(($event.target as HTMLSelectElement).value))"
      >
        <template v-if="canvasStore.activeTool === 'eraser'">
          <option v-for="s in ERASER_SIZES" :key="s" :value="s">{{ s }}px</option>
        </template>
        <template v-else>
          <option v-for="w in STROKE_WIDTHS" :key="w" :value="w">{{ w }}px</option>
        </template>
      </select>

      <div class="toolbar-divider hidden md:block" />

      <button title="Undo" class="btn-icon" :disabled="!canUndo" @click="canvasStore.undo()">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="7" width="2" height="2" fill="currentColor"/><rect x="4" y="5" width="2" height="2" fill="currentColor"/><rect x="4" y="9" width="2" height="2" fill="currentColor"/><rect x="6" y="3" width="2" height="2" fill="currentColor"/><rect x="6" y="7" width="6" height="2" fill="currentColor"/><rect x="12" y="7" width="2" height="4" fill="currentColor"/><rect x="8" y="11" width="4" height="2" fill="currentColor"/></svg>
      </button>

      <button title="Redo" class="btn-icon" :disabled="!canRedo" @click="canvasStore.redo()">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="12" y="7" width="2" height="2" fill="currentColor"/><rect x="10" y="5" width="2" height="2" fill="currentColor"/><rect x="10" y="9" width="2" height="2" fill="currentColor"/><rect x="8" y="3" width="2" height="2" fill="currentColor"/><rect x="4" y="7" width="6" height="2" fill="currentColor"/><rect x="2" y="7" width="2" height="4" fill="currentColor"/><rect x="2" y="11" width="4" height="2" fill="currentColor"/></svg>
      </button>

      <div class="toolbar-divider hidden md:block" />

      <button title="Export PNG" class="btn-icon" @click="exportPng">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="7" y="2" width="2" height="6" fill="currentColor"/><rect x="5" y="6" width="2" height="2" fill="currentColor"/><rect x="9" y="6" width="2" height="2" fill="currentColor"/><rect x="4" y="8" width="8" height="2" fill="currentColor"/><rect x="2" y="12" width="12" height="2" fill="currentColor"/><rect x="2" y="10" width="2" height="2" fill="currentColor"/><rect x="12" y="10" width="2" height="2" fill="currentColor"/></svg>
      </button>

      <button v-if="isOwner" title="Clear board (host only)" class="btn-icon text-red-400 hover:text-red-300" @click="emit('clear-board')">
        <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="2" height="2" fill="currentColor"/><rect x="12" y="2" width="2" height="2" fill="currentColor"/><rect x="4" y="4" width="2" height="2" fill="currentColor"/><rect x="10" y="4" width="2" height="2" fill="currentColor"/><rect x="6" y="6" width="4" height="2" fill="currentColor"/><rect x="6" y="8" width="4" height="2" fill="currentColor"/><rect x="4" y="10" width="2" height="2" fill="currentColor"/><rect x="10" y="10" width="2" height="2" fill="currentColor"/><rect x="2" y="12" width="2" height="2" fill="currentColor"/><rect x="12" y="12" width="2" height="2" fill="currentColor"/></svg>
      </button>

      <div class="toolbar-divider hidden md:block" />

      <button title="Zoom out" class="btn-icon text-base font-bold leading-none" :disabled="canvasStore.zoom <= (isViewLocked ? 1 : ZOOM_MIN)" @click="canvasStore.setZoom(canvasStore.zoom - ZOOM_STEP)">−</button>
      <button title="Reset zoom" class="btn-icon text-[10px] font-terminal w-10 text-center" @click="canvasStore.resetView()">{{ Math.round(canvasStore.zoom * 100) }}%</button>
      <button title="Zoom in" class="btn-icon text-base font-bold leading-none" :disabled="canvasStore.zoom >= ZOOM_MAX" @click="canvasStore.setZoom(canvasStore.zoom + ZOOM_STEP)">+</button>
    </div>

    <button
      v-show="canScrollRight"
      class="btn-icon flex-shrink-0 md:hidden"
      title="Scroll right"
      @click="scrollRight"
    >
      <svg width="10" height="16" viewBox="0 0 10 16">
        <rect x="2" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="8" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="12" width="2" height="2" fill="currentColor"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .toolbar-scroll {
    overflow-x: auto;
    scrollbar-width: none;
  }
  .toolbar-scroll::-webkit-scrollbar {
    display: none;
  }
  .btn-icon {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
  }
}

@media (min-width: 768px) {
  .toolbar-scroll {
    display: contents;
  }
}

.toolbar-select {
  padding-inline: 0.25rem;
  padding-right: 20px;
  background-color: var(--color-surface-2);
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-terminal);
  font-size: 16px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'%3E%3Crect x='0' y='0' width='2' height='2' fill='%237070a0'/%3E%3Crect x='2' y='2' width='2' height='2' fill='%237070a0'/%3E%3Crect x='4' y='2' width='2' height='2' fill='%237070a0'/%3E%3Crect x='6' y='0' width='2' height='2' fill='%237070a0'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 20%;
  padding-block: 0;
}
</style>
