<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocket } from '@/composables/useSocket'
import type { LobbyState, DrawElement } from '@/types'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue'
import RoomLobby from '@/components/room/RoomLobby.vue'
import AppButton from '@/components/ui/AppButton.vue'

type Phase = 'connecting' | 'lobby' | 'canvas'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const roomStore = useRoomStore()
const { socket, connected, connect } = useSocket()

const roomId = route.params.roomId as string
const phase = ref<Phase>('connecting')

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)

onMounted(async () => {
  canvasStore.setElements([])
  await connect()
  if (!socket.value) return

  socket.value.once('room:lobby', (state: LobbyState) => {
    roomStore.setLobbyState(state.ownerId, state.status, state.participants)
    phase.value = state.status === 'started' ? 'canvas' : 'lobby'
  })

  socket.value.on('room:state', (elements: DrawElement[]) => {
    canvasStore.setElements(elements)
  })

  socket.value.on('room:started', () => {
    roomStore.setRoomStatus('started')
    phase.value = 'canvas'
  })

  socket.value.on('room:stopped', () => {
    roomStore.setRoomStatus('waiting')
    phase.value = 'lobby'
  })

  socket.value.on('user:joined', (u: { id: string; name: string }) => {
    roomStore.addLobbyParticipant(u)
  })

  socket.value.on('user:left', (userId: string) => {
    roomStore.removeLobbyParticipant(userId)
  })

  socket.value.emit('room:join', roomId)
})

onUnmounted(() => {
  canvasStore.setElements([])
  roomStore.setLobbyState('', 'waiting', [])
})

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden" style="background-color: var(--color-bg)">
    <!-- Header — visible in every phase -->
    <header
      class="flex items-center justify-between px-4 py-2 z-20 shrink-0 header-accent-border"
      style="background-color: var(--color-surface)"
    >
      <div class="flex items-center gap-3">
        <AppButton variant="secondary" @click="goHome">← Home</AppButton>
        <span class="text-xs font-mono" style="color: var(--color-text-muted)">{{ roomId }}</span>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="!connected"
          class="text-xs px-2 py-1"
          style="color: var(--color-danger); background-color: rgba(255,77,109,0.15); border: 2px solid rgba(255,77,109,0.3)"
        >Disconnected</span>
        <AppButton
          v-if="phase === 'canvas' && isOwner"
          variant="danger"
          @click="socket?.emit('room:stop', roomId)"
        >■ Stop</AppButton>
        <span class="text-xs" style="color: var(--color-text-muted)">
          {{ authStore.user?.displayName }}
        </span>
      </div>
    </header>

    <!-- Connecting splash -->
    <div v-if="phase === 'connecting'" class="flex-1 flex items-center justify-center">
      <span class="font-pixel text-[8px]" style="color: var(--color-text-muted)">Connecting…</span>
    </div>

    <!-- Lobby -->
    <RoomLobby v-else-if="phase === 'lobby'" :room-id="roomId" :socket="socket" />

    <!-- Canvas -->
    <div v-else class="flex-1 relative overflow-hidden">
      <WhiteboardCanvas :socket="socket" />
    </div>
  </div>
</template>
