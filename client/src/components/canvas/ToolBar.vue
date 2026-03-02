<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { STROKE_WIDTHS } from '@/constants'
import type { ToolType } from '@/types'

const canvasStore = useCanvasStore()

const tools: { type: ToolType; label: string; icon: string }[] = [
  { type: 'pen', label: 'Pen', icon: '✏️' },
  { type: 'rect', label: 'Rectangle', icon: '▭' },
  { type: 'circle', label: 'Circle', icon: '○' },
  { type: 'arrow', label: 'Arrow', icon: '→' },
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'select', label: 'Select', icon: '↖' },
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
</script>

<template>
  <div class="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-md px-2 py-1.5">
    <!-- Tools -->
    <button
      v-for="tool in tools"
      :key="tool.type"
      :title="tool.label"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
      :class="canvasStore.activeTool === tool.type
        ? 'bg-indigo-100 text-indigo-700'
        : 'text-gray-600 hover:bg-gray-100'"
      @click="canvasStore.setActiveTool(tool.type)"
    >
      {{ tool.icon }}
    </button>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <!-- Color picker -->
    <label class="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer hover:bg-gray-100" title="Color">
      <span
        class="w-5 h-5 rounded-full border-2 border-gray-300"
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
      class="h-9 rounded-lg border border-gray-200 text-sm px-1 text-gray-600"
      :value="canvasStore.activeStrokeWidth"
      @change="canvasStore.setActiveStrokeWidth(Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="w in STROKE_WIDTHS" :key="w" :value="w">{{ w }}px</option>
    </select>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <!-- Undo / Redo -->
    <button
      title="Undo"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
      :disabled="!canUndo"
      @click="canvasStore.undo()"
    >
      ↩
    </button>
    <button
      title="Redo"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"
      :disabled="!canRedo"
      @click="canvasStore.redo()"
    >
      ↪
    </button>

    <div class="w-px h-6 bg-gray-200 mx-1" />

    <!-- Export -->
    <button
      title="Export PNG"
      class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
      @click="exportPng"
    >
      ⬇
    </button>
  </div>
</template>
