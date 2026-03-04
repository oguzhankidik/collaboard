<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { STROKE_WIDTHS, ERASER_SIZES, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '@/constants'

const emit = defineEmits<{ 'clear-board': [] }>()

const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const roomStore = useRoomStore()

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)


function exportPng() {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  const link = document.createElement('a')
  link.download = 'collaboard.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

const canUndo = computed(() => canvasStore.history.length > 0)
const canRedo = computed(() => canvasStore.redoStack.length > 0)

</script>

<template>
  <div
    class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-2 py-1.5 toolbar-panel"
  >
    <!-- Pen -->
    <button
      title="Pen"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'pen' }"
      @click="canvasStore.setActiveTool('pen')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="10" y="1" width="2" height="2" fill="currentColor"/>
        <rect x="12" y="3" width="2" height="2" fill="currentColor"/>
        <rect x="8" y="3" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="5" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="5" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="7" width="2" height="2" fill="currentColor"/>
        <rect x="8" y="7" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="9" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="9" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="11" width="4" height="2" fill="currentColor"/>
        <rect x="4" y="13" width="2" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Eraser -->
    <button
      title="Eraser"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'eraser' }"
      @click="canvasStore.setActiveTool('eraser')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="3" y="3" width="10" height="2" fill="currentColor"/>
        <rect x="3" y="9" width="10" height="2" fill="currentColor"/>
        <rect x="3" y="3" width="2" height="8" fill="currentColor"/>
        <rect x="11" y="3" width="2" height="8" fill="currentColor"/>
        <rect x="5" y="5" width="3" height="4" fill="currentColor"/>
        <rect x="3" y="12" width="10" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Rectangle -->
    <button
      title="Rectangle"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'rect' }"
      @click="canvasStore.setActiveTool('rect')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="4" width="12" height="2" fill="currentColor"/>
        <rect x="2" y="10" width="12" height="2" fill="currentColor"/>
        <rect x="2" y="4" width="2" height="8" fill="currentColor"/>
        <rect x="12" y="4" width="2" height="8" fill="currentColor"/>
      </svg>
    </button>

    <!-- Circle -->
    <button
      title="Circle"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'circle' }"
      @click="canvasStore.setActiveTool('circle')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="6" y="2" width="4" height="2" fill="currentColor"/>
        <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="6" width="2" height="4" fill="currentColor"/>
        <rect x="12" y="6" width="2" height="4" fill="currentColor"/>
        <rect x="4" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="12" width="4" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Arrow -->
    <button
      title="Arrow"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'arrow' }"
      @click="canvasStore.setActiveTool('arrow')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="12" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="8" width="2" height="2" fill="currentColor"/>
        <rect x="8" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="12" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="8" y="2" width="4" height="2" fill="currentColor"/>
        <rect x="12" y="2" width="2" height="4" fill="currentColor"/>
      </svg>
    </button>

    <!-- Text -->
    <button
      title="Text"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'text' }"
      @click="canvasStore.setActiveTool('text')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="3" width="12" height="2" fill="currentColor"/>
        <rect x="7" y="3" width="2" height="10" fill="currentColor"/>
        <rect x="4" y="11" width="8" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Select -->
    <button
      title="Select"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'select' }"
      @click="canvasStore.setActiveTool('select')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="3" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="3" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="3" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="3" y="8" width="2" height="2" fill="currentColor"/>
        <rect x="3" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="5" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="5" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="7" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="7" y="12" width="2" height="2" fill="currentColor"/>
        <rect x="9" y="8" width="2" height="2" fill="currentColor"/>
        <rect x="9" y="12" width="2" height="2" fill="currentColor"/>
        <rect x="11" y="10" width="2" height="4" fill="currentColor"/>
      </svg>
    </button>

    <!-- Hand / Pan -->
    <button
      title="Pan"
      class="btn-icon"
      :class="{ active: canvasStore.activeTool === 'hand' }"
      @click="canvasStore.setActiveTool('hand')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="5" y="2" width="2" height="6" fill="currentColor"/>
        <rect x="7" y="1" width="2" height="7" fill="currentColor"/>
        <rect x="9" y="2" width="2" height="6" fill="currentColor"/>
        <rect x="11" y="4" width="2" height="4" fill="currentColor"/>
        <rect x="3" y="9" width="2" height="4" fill="currentColor"/>
        <rect x="5" y="8" width="8" height="5" fill="currentColor"/>
        <rect x="3" y="13" width="10" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Divider -->
    <div class="toolbar-divider" />

    <!-- Color picker -->
    <label class="btn-icon cursor-pointer label-reset" title="Color">
      <span
        class="w-4 h-4 border border-theme"
        :style="{ backgroundColor: canvasStore.activeColor }"
      />
      <input
        type="color"
        class="sr-only"
        :value="canvasStore.activeColor"
        @input="canvasStore.setActiveColor(($event.target as HTMLInputElement).value)"
      />
    </label>

    <!-- Stroke / eraser size selector -->
    <select
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

    <!-- Divider -->
    <div class="toolbar-divider" />

    <!-- Undo -->
    <button
      title="Undo"
      class="btn-icon"
      :disabled="!canUndo"
      @click="canvasStore.undo()"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="7" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="5" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="9" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="3" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="7" width="6" height="2" fill="currentColor"/>
        <rect x="12" y="7" width="2" height="4" fill="currentColor"/>
        <rect x="8" y="11" width="4" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Redo -->
    <button
      title="Redo"
      class="btn-icon"
      :disabled="!canRedo"
      @click="canvasStore.redo()"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="12" y="7" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="5" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="9" width="2" height="2" fill="currentColor"/>
        <rect x="8" y="3" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="7" width="6" height="2" fill="currentColor"/>
        <rect x="2" y="7" width="2" height="4" fill="currentColor"/>
        <rect x="2" y="11" width="4" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Divider -->
    <div class="toolbar-divider" />

    <!-- Export PNG -->
    <button
      title="Export PNG"
      class="btn-icon"
      @click="exportPng"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="7" y="2" width="2" height="6" fill="currentColor"/>
        <rect x="5" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="9" y="6" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="8" width="8" height="2" fill="currentColor"/>
        <rect x="2" y="12" width="12" height="2" fill="currentColor"/>
        <rect x="2" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="12" y="10" width="2" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Clear board (host only) -->
    <button
      v-if="isOwner"
      title="Clear board (host only)"
      class="btn-icon text-red-400 hover:text-red-300"
      @click="emit('clear-board')"
    >
      <svg width="16" height="16" viewBox="0 0 16 16">
        <rect x="2" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="12" y="2" width="2" height="2" fill="currentColor"/>
        <rect x="4" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="4" width="2" height="2" fill="currentColor"/>
        <rect x="6" y="6" width="4" height="2" fill="currentColor"/>
        <rect x="6" y="8" width="4" height="2" fill="currentColor"/>
        <rect x="4" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="10" y="10" width="2" height="2" fill="currentColor"/>
        <rect x="2" y="12" width="2" height="2" fill="currentColor"/>
        <rect x="12" y="12" width="2" height="2" fill="currentColor"/>
      </svg>
    </button>

    <!-- Divider -->
    <div class="toolbar-divider" />

    <!-- Zoom controls -->
    <button
      title="Zoom out"
      class="btn-icon text-base font-bold leading-none"
      :disabled="canvasStore.zoom <= ZOOM_MIN"
      @click="canvasStore.setZoom(canvasStore.zoom - ZOOM_STEP)"
    >−</button>
    <button
      title="Reset zoom"
      class="btn-icon text-[10px] font-terminal w-10 text-center"
      @click="canvasStore.resetView()"
    >{{ Math.round(canvasStore.zoom * 100) }}%</button>
    <button
      title="Zoom in"
      class="btn-icon text-base font-bold leading-none"
      :disabled="canvasStore.zoom >= ZOOM_MAX"
      @click="canvasStore.setZoom(canvasStore.zoom + ZOOM_STEP)"
    >+</button>
  </div>
</template>

<style scoped>
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
