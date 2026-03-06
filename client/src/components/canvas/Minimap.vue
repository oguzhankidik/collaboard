<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { drawElement, getElementBounds } from '@/composables/useCanvas'
import { MINIMAP_W, MINIMAP_PADDING } from '@/constants'

const props = defineProps<{ mainCanvas: HTMLCanvasElement | null }>()

const canvasStore = useCanvasStore()
const minimapRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let frameId: number | null = null

function getContentBounds() {
  const els = canvasStore.elements
  const mw = props.mainCanvas?.width ?? window.innerWidth
  const mh = props.mainCanvas?.height ?? window.innerHeight

  // Start from viewport bounds so the viewport rect is always visible
  let minX = canvasStore.panX
  let minY = canvasStore.panY
  let maxX = canvasStore.panX + mw / canvasStore.zoom
  let maxY = canvasStore.panY + mh / canvasStore.zoom

  for (const el of els) {
    const b = getElementBounds(el)
    const pad = el.strokeWidth
    minX = Math.min(minX, b.x - pad)
    minY = Math.min(minY, b.y - pad)
    maxX = Math.max(maxX, b.x + b.w + pad)
    maxY = Math.max(maxY, b.y + b.h + pad)
  }

  return {
    minX: minX - MINIMAP_PADDING,
    minY: minY - MINIMAP_PADDING,
    maxX: maxX + MINIMAP_PADDING,
    maxY: maxY + MINIMAP_PADDING,
  }
}

function draw() {
  if (!ctx) return
  const c = ctx
  const SIZE = MINIMAP_W
  c.clearRect(0, 0, SIZE, SIZE)

  const { minX, minY, maxX, maxY } = getContentBounds()
  const contentW = maxX - minX
  const contentH = maxY - minY
  const scale = Math.min(SIZE / contentW, SIZE / contentH)
  const offsetX = (SIZE - contentW * scale) / 2
  const offsetY = (SIZE - contentH * scale) / 2

  c.save()
  c.translate(offsetX, offsetY)
  c.scale(scale, scale)
  c.translate(-minX, -minY)

  // Draw elements — skip 'fill' (pixel-based flood fill is incompatible with scaled context)
  // Skip 'eraser' — uses destination-out which produces black blobs on transparent background
  for (const el of canvasStore.elements) {
    if (el.type === 'fill' || el.type === 'eraser') continue
    drawElement(c, el)
  }

  // Viewport indicator rect
  const mw = props.mainCanvas?.width ?? window.innerWidth
  const mh = props.mainCanvas?.height ?? window.innerHeight
  const vw = mw / canvasStore.zoom
  const vh = mh / canvasStore.zoom
  c.strokeStyle = 'rgba(108, 99, 255, 0.9)'
  c.lineWidth = 2 / scale
  c.strokeRect(canvasStore.panX, canvasStore.panY, vw, vh)
  c.fillStyle = 'rgba(108, 99, 255, 0.08)'
  c.fillRect(canvasStore.panX, canvasStore.panY, vw, vh)

  c.restore()
}

function scheduleDraw() {
  if (frameId !== null) return
  frameId = requestAnimationFrame(() => {
    frameId = null
    draw()
  })
}

watch(
  () => [canvasStore.elements.length, canvasStore.elements, canvasStore.zoom, canvasStore.panX, canvasStore.panY] as const,
  scheduleDraw,
)

onMounted(() => {
  if (minimapRef.value) {
    ctx = minimapRef.value.getContext('2d')
    scheduleDraw()
  }
})

onUnmounted(() => {
  if (frameId !== null) cancelAnimationFrame(frameId)
})
</script>

<template>
  <div class="minimap-container">
    <canvas
      ref="minimapRef"
      :width="MINIMAP_W"
      :height="MINIMAP_W"
      class="block"
    />
  </div>
</template>

<style scoped>
.minimap-container {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10;
  background-color: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--color-accent);
  pointer-events: none;
}
</style>
