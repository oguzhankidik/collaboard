<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocket } from '@/composables/useSocket'
import type { LobbyState, DrawElement, ChatMessage, RoomSettings } from '@/types'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue'
import RoomLobby from '@/components/room/RoomLobby.vue'
import SessionTimer from '@/components/canvas/SessionTimer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'

type Phase = 'connecting' | 'lobby' | 'canvas' | 'error'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()
const authStore = useAuthStore()
const roomStore = useRoomStore()
const { socket, connected, connect } = useSocket()

const roomId = route.params.roomId as string
const phase = ref<Phase>('connecting')

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)
const showStopModal = ref(false)
const showCloseModal = ref(false)

onMounted(async () => {
  document.body.classList.add('in-board')
  canvasStore.setElements([])
  await connect()
  if (!socket.value) {
    phase.value = 'error'
    return
  }

  // room:lobby fires on initial join AND after socket reconnects (re-join)
  socket.value.on('room:lobby', (state: LobbyState) => {
    roomStore.setLobbyState(state.ownerId, state.status, state.participants, state.settings, state.sessionStartedAt)
    roomStore.setCurrentRoomId(roomId)
    phase.value = state.status === 'started' ? 'canvas' : 'lobby'
  })

  socket.value.on('room:state', (elements: DrawElement[]) => {
    canvasStore.setElements(elements)
  })

  socket.value.on('room:started', (payload: { settings: RoomSettings; startedAt: number }) => {
    roomStore.setRoomSettings(payload.settings)
    roomStore.setSessionStartedAt(payload.startedAt)
    roomStore.setRoomStatus('started')
    phase.value = 'canvas'
  })

  socket.value.on('room:stopped', () => {
    roomStore.setRoomStatus('waiting')
    roomStore.setSessionStartedAt(null)
    canvasStore.setElements([])
    phase.value = 'lobby'
  })

  socket.value.on('room:time_up', () => {
    roomStore.setRoomStatus('waiting')
    roomStore.setSessionStartedAt(null)
    canvasStore.setElements([])
    phase.value = 'lobby'
  })

  socket.value.on('room:closed', () => {
    router.push({ name: 'home' })
  })

  socket.value.on('room:host_changed', (newOwnerId: string) => {
    roomStore.setRoomOwnerId(newOwnerId)
  })

  socket.value.on('user:joined', (u: { id: string; name: string }) => {
    roomStore.addLobbyParticipant(u)
  })

  socket.value.on('user:left', (userId: string) => {
    roomStore.removeLobbyParticipant(userId)
  })

  socket.value.on('chat:message', (msg: ChatMessage) => {
    roomStore.addChatMessage(msg)
  })

  socket.value.on('chat:history', (msgs: ChatMessage[]) => {
    roomStore.setChatHistory(msgs)
  })

  socket.value.on('board:cleared', () => {
    canvasStore.setElements([])
    canvasStore.clearHistory()
  })

  // Server-side errors (e.g. room not found, room full)
  socket.value.on('error', (err: { message: string }) => {
    console.warn('[room] server error:', err.message)
    router.push({ name: 'home' })
  })

  // Re-join room after socket.io automatic reconnect (not on initial connect)
  let joined = false
  socket.value.on('connect', () => {
    if (joined) socket.value?.emit('room:join', roomId)
  })

  socket.value.emit('room:join', roomId)
  joined = true
})

onUnmounted(() => {
  document.body.classList.remove('in-board')
  canvasStore.setElements([])
  roomStore.setLobbyState('', 'waiting', [], { timerDurationMs: 0 }, undefined)
  roomStore.setSessionStartedAt(null)
  roomStore.setCurrentRoomId(null)
  roomStore.clearChat()
})

function leaveRoom() {
  if (!socket.value) {
    router.push({ name: 'home' })
    return
  }
  socket.value.emit('room:leave', roomId, () => {
    router.push({ name: 'home' })
  })
}

function confirmStop() {
  socket.value?.emit('room:stop', roomId)
  showStopModal.value = false
}

function confirmClose() {
  socket.value?.emit('room:close', roomId)
  showCloseModal.value = false
}

</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-theme-bg">
    <!-- Header — visible in every phase -->
    <header class="flex items-center justify-between px-4 py-2 z-20 shrink-0 header-accent-border bg-theme-surface">
      <div class="flex items-center gap-3">
        <AppButton variant="secondary" @click="leaveRoom">← Leave Room</AppButton>
        <span class="text-xs font-mono text-theme-muted">{{ roomId }}</span>
      </div>
      <!-- Session timer — centered in header -->
      <SessionTimer v-if="phase === 'canvas'" />
      <div class="flex items-center gap-3">
        <span v-if="!connected" class="text-xs px-2 py-1 badge-disconnected">Disconnected</span>
        <AppButton
          v-if="phase === 'lobby' && isOwner"
          variant="danger"
          @click="showCloseModal = true"
        >✕ Close Room</AppButton>
        <AppButton
          v-if="phase === 'canvas' && isOwner"
          variant="danger"
          @click="showStopModal = true"
        >■ Stop</AppButton>
        <span class="text-xs text-theme-muted">{{ authStore.user?.displayName }}</span>
      </div>
    </header>

    <!-- Connecting splash -->
    <div v-if="phase === 'connecting'" class="flex-1 flex items-center justify-center">
      <span class="font-pixel text-[8px] text-theme-muted">Connecting…</span>
    </div>

    <!-- Error splash -->
    <div v-else-if="phase === 'error'" class="flex-1 flex flex-col items-center justify-center gap-4">
      <span class="font-pixel text-[8px] text-theme-danger">Could not connect to room.</span>
      <AppButton variant="secondary" @click="router.push({ name: 'home' })">← Back to Home</AppButton>
    </div>

    <!-- Lobby -->
    <RoomLobby v-else-if="phase === 'lobby'" :room-id="roomId" :socket="socket" />

    <!-- Canvas -->
    <div v-else class="flex-1 relative overflow-hidden">
      <WhiteboardCanvas :socket="socket" />
    </div>

    <!-- Close room confirmation modal -->
    <AppModal title="CLOSE ROOM" :open="showCloseModal" @close="showCloseModal = false">
      <div class="flex flex-col gap-5">
        <p class="text-theme font-terminal text-sm leading-relaxed">
          The room will be closed and all participants will be removed.
        </p>
        <p class="font-pixel text-[8px] text-theme-danger">
          This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showCloseModal = false">Cancel</AppButton>
          <AppButton variant="danger" @click="confirmClose">Close Room</AppButton>
        </div>
      </div>
    </AppModal>

    <!-- Stop confirmation modal -->
    <AppModal title="STOP GAME" :open="showStopModal" @close="showStopModal = false">
      <div class="flex flex-col gap-5">
        <p class="text-theme font-terminal text-sm leading-relaxed">
          The session will end and all drawings will be permanently deleted.
        </p>
        <p class="font-pixel text-[8px] text-theme-danger">
          This action cannot be undone.
        </p>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showStopModal = false">Cancel</AppButton>
          <AppButton variant="danger" @click="confirmStop">Stop</AppButton>
        </div>
      </div>
    </AppModal>
  </div>
</template>
