<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Socket } from 'socket.io-client'
import type { RemoteCursor } from '@/types'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps<{
  socket: Socket | null
}>()

const canvasStore = useCanvasStore()

const cursors = ref<Map<string, RemoteCursor>>(new Map())

function onCursorRemote(cursor: RemoteCursor) {
  cursors.value.set(cursor.userId, cursor)
}

function onUserLeft(userId: string) {
  cursors.value.delete(userId)
}

onMounted(() => {
  props.socket?.on('cursor:remote', onCursorRemote)
  props.socket?.on('user:left', onUserLeft)
})

onUnmounted(() => {
  props.socket?.off('cursor:remote', onCursorRemote)
  props.socket?.off('user:left', onUserLeft)
})
</script>

<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden">
    <div
      v-for="cursor in cursors.values()"
      :key="cursor.userId"
      class="absolute flex items-start gap-1"
      :style="{
        transform: `translate(${(cursor.position.x - canvasStore.panX) * canvasStore.zoom}px, ${(cursor.position.y - canvasStore.panY) * canvasStore.zoom}px)`,
        transition: 'transform 80ms linear',
      }"
    >
      <!-- Cursor arrow -->
      <svg width="16" height="16" viewBox="0 0 16 16" class="-translate-y-px">
        <path
          d="M0 0 L0 12 L3.5 9 L6 14 L8 13 L5.5 8 L10 8 Z"
          :fill="cursor.color"
          stroke="white"
          stroke-width="1"
        />
      </svg>
      <!-- Name label -->
      <span
        class="text-xs text-white px-1 whitespace-nowrap mt-3"
        :style="{ backgroundColor: cursor.color }"
      >
        {{ cursor.userName }}
      </span>
    </div>
  </div>
</template>
