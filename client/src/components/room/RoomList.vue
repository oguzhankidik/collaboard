<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import type { Room } from '@/types'

const router = useRouter()
const roomStore = useRoomStore()

const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${import.meta.env.VITE_SOCKET_URL}/rooms`)
    if (!res.ok) throw new Error('Failed to load rooms')
    const rooms: Room[] = await res.json()
    roomStore.setRooms(rooms)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load rooms'
  } finally {
    loading.value = false
  }
})

function joinRoom(roomId: string) {
  router.push({ name: 'board', params: { roomId } })
}
</script>

<template>
  <div>
    <div v-if="loading" class="text-xs py-8 text-center text-theme-muted">
      Loading rooms…
    </div>
    <div v-else-if="error" class="text-xs py-8 text-center text-theme-danger">
      {{ error }}
    </div>
    <div v-else-if="roomStore.rooms.length === 0" class="text-xs py-12 text-center text-theme-muted">
      No rooms yet. Create one to get started.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div
        v-for="room in roomStore.rooms"
        :key="room.id"
        class="card-hover flex flex-col gap-2"
        @click="joinRoom(room.id)"
      >
        <p class="text-sm font-medium text-theme">{{ room.name }}</p>
        <div class="flex items-center justify-between">
          <span class="tag">{{ room.participants.length }} participant(s)</span>
          <span class="text-xs text-glow-accent text-theme-accent">Join →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-hover:hover .tag {
  border-color: var(--color-accent-2);
  color: var(--color-accent-2);
}
</style>
