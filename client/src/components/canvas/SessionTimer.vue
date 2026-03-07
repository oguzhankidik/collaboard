<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoomStore } from '@/stores/roomStore'
import { TIMER_WARN_YELLOW_MS, TIMER_WARN_RED_MS } from '@/constants'

const roomStore = useRoomStore()

const remainingMs = ref(0)
let intervalHandle: ReturnType<typeof setInterval> | null = null

const isVisible = computed(() =>
  roomStore.roomSettings.timerDurationMs > 0 && roomStore.sessionStartedAt !== null
)

function tick() {
  if (roomStore.sessionStartedAt === null) return
  const elapsed = Date.now() - roomStore.sessionStartedAt
  remainingMs.value = Math.max(0, roomStore.roomSettings.timerDurationMs - elapsed)
}

const formattedTime = computed(() => {
  const totalSeconds = Math.ceil(remainingMs.value / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

const colorClass = computed(() => {
  if (remainingMs.value <= TIMER_WARN_RED_MS) return 'timer-red'
  if (remainingMs.value <= TIMER_WARN_YELLOW_MS) return 'timer-yellow'
  return 'timer-green'
})

onMounted(() => {
  tick()
  intervalHandle = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (intervalHandle !== null) clearInterval(intervalHandle)
})
</script>

<template>
  <div
    v-if="isVisible"
    class="flex items-center gap-2 px-3 py-1 border tracking-widest bg-theme-surface"
    :class="colorClass"
  >
    <span>TIME</span>
    <span>{{ formattedTime }}</span>
  </div>
</template>

<style scoped>
.timer-green {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.timer-yellow {
  color: #d4a017;
  border-color: #d4a017;
}

.timer-red {
  color: var(--color-danger);
  border-color: var(--color-danger);
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
</style>
