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

// ── Offscreen element cache ─────────────────────────────────────────────────
// Elements are drawn once to an offscreen canvas; re-rendered only when elements
// actually change (not on pan/zoom). Pan/zoom only redraws the cheap viewport rect.
let elementCache: OffscreenCanvas | null = null
let cacheScale = 1
let cacheOffsetX = 0
let cacheOffsetY = 0
let cacheMinX = 0
let cacheMinY = 0

function renderElementCache() {
  const SIZE = MINIMAP_W
  if (!elementCache) elementCache = new OffscreenCanvas(SIZE, SIZE)
  const c = elementCache.getContext('2d')!
  c.clearRect(0, 0, SIZE, SIZE)

  const els = canvasStore.elements
  if (els.length === 0) {
    cacheScale = 1
    cacheOffsetX = SIZE / 2
    cacheOffsetY = SIZE / 2
    cacheMinX = 0
    cacheMinY = 0
    return
  }

  // Compute bounds from elements only (viewport position intentionally excluded)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of els) {
    const b = getElementBounds(el)
    const pad = el.strokeWidth
    minX = Math.min(minX, b.x - pad)
    minY = Math.min(minY, b.y - pad)
    maxX = Math.max(maxX, b.x + b.w + pad)
    maxY = Math.max(maxY, b.y + b.h + pad)
  }
  minX -= MINIMAP_PADDING
  minY -= MINIMAP_PADDING
  maxX += MINIMAP_PADDING
  maxY += MINIMAP_PADDING

  const contentW = maxX - minX
  const contentH = maxY - minY
  const scale = Math.min(SIZE / contentW, SIZE / contentH)
  const offsetX = (SIZE - contentW * scale) / 2
  const offsetY = (SIZE - contentH * scale) / 2

  cacheScale = scale
  cacheOffsetX = offsetX
  cacheOffsetY = offsetY
  cacheMinX = minX
  cacheMinY = minY

  c.save()
  c.translate(offsetX, offsetY)
  c.scale(scale, scale)
  c.translate(-minX, -minY)

  for (const el of els) {
    if (el.type === 'fill' || el.type === 'eraser') continue
    drawElement(c, el)
  }
  c.restore()
}

// ── Draw: blit cache + viewport rect (O(1) during pan) ─────────────────────
function draw() {
  if (!ctx) return
  const c = ctx
  const SIZE = MINIMAP_W
  c.clearRect(0, 0, SIZE, SIZE)

  if (elementCache) {
    c.drawImage(elementCache, 0, 0)
  }

  // Viewport indicator — positioned using the same cached coordinate system
  const mw = props.mainCanvas?.width ?? window.innerWidth
  const mh = props.mainCanvas?.height ?? window.innerHeight
  const vw = mw / canvasStore.zoom
  const vh = mh / canvasStore.zoom
  const vx = (canvasStore.panX - cacheMinX) * cacheScale + cacheOffsetX
  const vy = (canvasStore.panY - cacheMinY) * cacheScale + cacheOffsetY

  c.strokeStyle = 'rgba(108, 99, 255, 0.9)'
  c.lineWidth = 2
  c.strokeRect(vx, vy, vw * cacheScale, vh * cacheScale)
  c.fillStyle = 'rgba(108, 99, 255, 0.08)'
  c.fillRect(vx, vy, vw * cacheScale, vh * cacheScale)
}

function scheduleDraw() {
  if (frameId !== null) return
  frameId = requestAnimationFrame(() => {
    frameId = null
    draw()
  })
}

function scheduleFullRedraw() {
  renderElementCache()
  scheduleDraw()
}

// Elements changed → re-render element cache
watch(() => canvasStore.elements, scheduleFullRedraw, { deep: true })

// Pan/zoom → only update viewport rect (cheap, no element loop)
watch(() => [canvasStore.panX, canvasStore.panY, canvasStore.zoom] as const, scheduleDraw)

onMounted(() => {
  if (minimapRef.value) {
    ctx = minimapRef.value.getContext('2d')
    scheduleFullRedraw()
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
