<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useSocket } from '@/composables/useSocket'
import type { LobbyState, DrawElement, ChatMessage, RoomSettings, RoomStatus, Participant, GameSlide, PlayerScore } from '@/types'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue'
import RoomLobby from '@/components/room/RoomLobby.vue'
import WordEntryModal from '@/components/room/WordEntryModal.vue'
import GameReview from '@/components/game/GameReview.vue'
import GameLeaderboard from '@/components/game/GameLeaderboard.vue'
import SessionTimer from '@/components/canvas/SessionTimer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'

type Phase = 'connecting' | 'lobby' | 'canvas' | 'review' | 'results' | 'error'

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
const showWordEntryModal = ref(false)
const gameWord = ref('')
const drawingSubmitted = ref(false)
const whiteboardCanvasRef = ref<{ captureSnapshot: () => string } | null>(null)
const currentSlide = ref<GameSlide | null>(null)
const gameResults = ref<PlayerScore[]>([])
const slideSnapshots = new Map<string, string>()
const winnerCanvas = ref('')

onMounted(async () => {
  document.body.classList.add('in-board')
  canvasStore.setElements([])
  await connect()
  if (!socket.value) {
    phase.value = 'error'
    return
  }

  socket.value.on('room:lobby', (state: LobbyState) => {
    roomStore.setLobbyState(state.ownerId, state.status, state.participants, state.settings, state.sessionStartedAt)
    roomStore.setCurrentRoomId(roomId)
    phase.value = state.status === 'started' ? 'canvas' : 'lobby'
  })

  socket.value.on('room:state', (elements: DrawElement[]) => {
    canvasStore.setElements(elements)
  })

  socket.value.on('room:settings_changed', (settings: RoomSettings) => {
    roomStore.setRoomSettings(settings)
  })

  socket.value.on('room:started', (payload: { settings: RoomSettings; startedAt: number }) => {
    roomStore.setRoomSettings(payload.settings)
    roomStore.setSessionStartedAt(payload.startedAt)
    roomStore.setRoomStatus('started')
    showWordEntryModal.value = false
    drawingSubmitted.value = false
    phase.value = 'canvas'
  })

  socket.value.on('room:status_changed', (status: RoomStatus) => {
    roomStore.setRoomStatus(status)
  })

  socket.value.on('room:stopped', () => {
    roomStore.setRoomStatus('waiting')
    roomStore.setSessionStartedAt(null)
    canvasStore.setElements([])
    showWordEntryModal.value = false
    drawingSubmitted.value = false
    gameWord.value = ''
    currentSlide.value = null
    gameResults.value = []
    slideSnapshots.clear()
    winnerCanvas.value = ''
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

  socket.value.on('game:word-entry', () => {
    showWordEntryModal.value = true
  })

  socket.value.on('game:word-prompt', (word: string) => {
    gameWord.value = word
    showWordEntryModal.value = false
    drawingSubmitted.value = false
  })

  socket.value.on('game:review-start', (_players: Participant[]) => {
    roomStore.setRoomStatus('review')
    const canvasData = whiteboardCanvasRef.value?.captureSnapshot() ?? ''
    if (canvasData) {
      socket.value?.emit('game:submit-snapshot', { roomId, canvasData })
    }
    drawingSubmitted.value = true
  })

  socket.value.on('game:slide', (data: GameSlide) => {
    slideSnapshots.set(data.userId, data.canvasData)
    currentSlide.value = data
    roomStore.setRoomStatus('review')
    phase.value = 'review'
  })

  socket.value.on('game:results', (scores: PlayerScore[]) => {
    gameResults.value = scores
    winnerCanvas.value = scores[0] ? (slideSnapshots.get(scores[0].userId) ?? '') : ''
    roomStore.setRoomStatus('results')
    phase.value = 'results'
  })

  socket.value.on('error', (err: { message: string }) => {
    console.warn('[room] server error:', err.message)
    router.push({ name: 'home' })
  })

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
  roomStore.setLobbyState('', 'waiting', [], { timerDurationMs: 0, gameMode: 'collaborative' }, undefined)
  roomStore.setSessionStartedAt(null)
  roomStore.setCurrentRoomId(null)
  roomStore.clearChat()
  showWordEntryModal.value = false
  gameWord.value = ''
  currentSlide.value = null
  gameResults.value = []
  slideSnapshots.clear()
  winnerCanvas.value = ''
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
    <header class="flex items-center justify-between px-4 py-2 z-20 shrink-0 header-accent-border bg-theme-surface">
      <div class="flex items-center gap-2 md:gap-3">
        <AppButton variant="secondary" @click="leaveRoom">← Leave Room</AppButton>
      </div>
      <SessionTimer v-if="phase === 'canvas'" />
      <div class="flex items-center gap-2 md:gap-3">
        <span v-if="!connected" class="text-xs px-2 py-1 badge-disconnected">Disconnected</span>
        <AppButton
          v-if="phase === 'lobby' && isOwner"
          variant="danger"
          @click="showCloseModal = true"
        >✕ Close Room</AppButton>
        <AppButton
          v-if="(phase === 'canvas' || phase === 'review' || phase === 'results') && isOwner"
          variant="danger"
          @click="showStopModal = true"
        >■ Stop</AppButton>
        <span class="hidden md:inline text-xs text-theme-muted">{{ authStore.user?.displayName }}</span>
      </div>
    </header>

    <div v-if="phase === 'connecting'" class="flex-1 flex items-center justify-center">
      <span class="font-pixel text-[8px] text-theme-muted">Connecting…</span>
    </div>

    <div v-else-if="phase === 'error'" class="flex-1 flex flex-col items-center justify-center gap-4">
      <span class="font-pixel text-[8px] text-theme-danger">Could not connect to room.</span>
      <AppButton variant="secondary" @click="router.push({ name: 'home' })">← Back to Home</AppButton>
    </div>

    <RoomLobby v-else-if="phase === 'lobby'" :room-id="roomId" :socket="socket" />

    <div v-else-if="phase === 'review' && currentSlide" class="flex-1 overflow-hidden">
      <GameReview
        :slide="currentSlide"
        :my-user-id="authStore.user?.uid ?? ''"
        :socket="socket"
        :room-id="roomId"
      />
    </div>

    <div v-else-if="phase === 'results'" class="flex-1 overflow-hidden">
      <GameLeaderboard
        :scores="gameResults"
        :winner-canvas="winnerCanvas"
        :my-user-id="authStore.user?.uid ?? ''"
        :is-owner="isOwner"
        :socket="socket"
        :room-id="roomId"
        @leave="leaveRoom"
      />
    </div>

    <div v-else class="flex-1 relative overflow-hidden">
      <WhiteboardCanvas
        ref="whiteboardCanvasRef"
        :socket="socket"
        :game-word="gameWord || undefined"
      />

      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <div
          v-if="drawingSubmitted"
          class="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none"
        >
          <div class="dtw-submitted-panel flex flex-col items-center gap-3 px-8 py-6 text-center">
            <span class="font-pixel text-[14px] text-theme-accent-2 text-glow-accent-2">✓ DRAWING SUBMITTED</span>
            <p class="font-terminal text-sm text-theme-muted">Waiting for other players…</p>
          </div>
        </div>
      </Transition>
    </div>

    <WordEntryModal
      :open="showWordEntryModal"
      :room-id="roomId"
      :socket="socket"
      @cancel="showWordEntryModal = false"
    />

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

<style scoped>
.dtw-submitted-panel {
  background-color: var(--color-surface);
  border: 2px solid var(--color-accent-2);
  box-shadow: 4px 4px 0 var(--color-accent-2), var(--glow-accent-2);
}
</style>
