<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { STROKE_WIDTHS } from '@/constants'
import type { ToolType } from '@/types'

const canvasStore = useCanvasStore()

const tools: { type: ToolType; label: string }[] = [
  { type: 'pen',    label: 'Pen' },
  { type: 'rect',   label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'arrow',  label: 'Arrow' },
  { type: 'text',   label: 'Text' },
  { type: 'select', label: 'Select' },
]

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

const selectDropdownStyle = computed(() => ({
  backgroundColor: 'var(--color-surface-2)',
  border: '2px solid var(--color-border)',
  color: 'var(--color-text-muted)',
  fontFamily: 'var(--font-terminal)',
  fontSize: '16px',
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%278%27 height=%276%27 viewBox=%270 0 8 6%27%3E%3Crect x=%270%27 y=%270%27 width=%272%27 height=%272%27 fill=%27%237070a0%27/%3E%3Crect x=%272%27 y=%272%27 width=%272%27 height=%272%27 fill=%27%237070a0%27/%3E%3Crect x=%274%27 y=%272%27 width=%272%27 height=%272%27 fill=%27%237070a0%27/%3E%3Crect x=%276%27 y=%270%27 width=%272%27 height=%272%27 fill=%27%237070a0%27/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
  paddingRight: '20px',
}))
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

    <!-- Divider -->
    <div class="w-px h-6 mx-1" style="background-color: var(--color-border)" />

    <!-- Color picker -->
    <label class="btn-icon cursor-pointer" title="Color" style="font-family: inherit; font-size: inherit; text-transform: none; letter-spacing: normal;">
      <span
        class="w-4 h-4 border"
        style="border-color: var(--color-border)"
        :style="{ backgroundColor: canvasStore.activeColor }"
      />
      <input
        type="color"
        class="sr-only"
        :value="canvasStore.activeColor"
        @input="canvasStore.setActiveColor(($event.target as HTMLInputElement).value)"
      />
    </label>

    <!-- Stroke width -->
    <select
      class="h-9 px-1"
      :style="selectDropdownStyle"
      :value="canvasStore.activeStrokeWidth"
      @change="canvasStore.setActiveStrokeWidth(Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="w in STROKE_WIDTHS" :key="w" :value="w">{{ w }}px</option>
    </select>

    <!-- Divider -->
    <div class="w-px h-6 mx-1" style="background-color: var(--color-border)" />

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
    <div class="w-px h-6 mx-1" style="background-color: var(--color-border)" />

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
  </div>
</template>
