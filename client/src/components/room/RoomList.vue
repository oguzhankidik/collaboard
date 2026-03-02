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
    <div v-if="loading" class="text-sm text-gray-500 py-4 text-center">Loading rooms…</div>
    <div v-else-if="error" class="text-sm text-red-600 py-4 text-center">{{ error }}</div>
    <div v-else-if="roomStore.rooms.length === 0" class="text-sm text-gray-400 py-8 text-center">
      No rooms yet. Create one to get started.
    </div>

    <ul v-else class="divide-y divide-gray-100">
      <li
        v-for="room in roomStore.rooms"
        :key="room.id"
        class="flex items-center justify-between py-3 px-1 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div>
          <p class="text-sm font-medium text-gray-900">{{ room.name }}</p>
          <p class="text-xs text-gray-400">{{ room.participants.length }} participant(s)</p>
        </div>
        <button
          class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          @click="joinRoom(room.id)"
        >
          Join →
        </button>
      </li>
    </ul>
  </div>
</template>
