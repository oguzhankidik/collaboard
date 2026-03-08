<script setup lang="ts">
// 1. Imports
import { ref, computed, watch } from 'vue'
import type { Socket } from 'socket.io-client'
import type { GameMode } from '@/types'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { TIMER_OPTIONS_MIN } from '@/constants'
import AppButton from '@/components/ui/AppButton.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'

// 2. Props & Emits
const props = defineProps<{
  roomId: string
  socket: Socket | null
}>()

// 3. Store & Composable connections
const roomStore = useRoomStore()
const authStore = useAuthStore()

// 4. Reactive state
const showMobileChat = ref(false)
const unreadCount = ref(0)
const copied = ref(false)
const selectedDurationMs = ref(roomStore.roomSettings.timerDurationMs)
const selectedGameMode = ref<GameMode>(roomStore.roomSettings.gameMode)

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)

const isStartDisabled = computed(
  () => !isOwner.value || roomStore.roomStatus === 'word-entry',
)

// 5. Functions
function formatDuration(ms: number): string {
  if (ms === 0) return 'None'
  const minutes = ms / 60_000
  return `${minutes}m`
}

function gameModeLabel(mode: GameMode): string {
  if (mode === 'collaborative') return '◼ COLLABORATIVE'
  return '◆ DRAW THE WORD'
}

function copyLink() {
  const url = `${window.location.origin}/board/${props.roomId}`
  navigator.clipboard.writeText(url).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function startRoom() {
  props.socket?.emit('room:start', {
    roomId: props.roomId,
    settings: { timerDurationMs: selectedDurationMs.value, gameMode: selectedGameMode.value },
  })
}

// 6. Lifecycle / watchers
watch(() => roomStore.roomSettings.timerDurationMs, (val) => {
  selectedDurationMs.value = val
})

// Sync game mode from store on late-join (server sends settings via room:lobby)
watch(() => roomStore.roomSettings.gameMode, (val) => {
  selectedGameMode.value = val
})

watch(() => roomStore.chatMessages.length, () => {
  if (!showMobileChat.value) unreadCount.value++
})

watch(showMobileChat, (open) => {
  if (open) unreadCount.value = 0
})
</script>

<template>
  <div class="flex-1 flex flex-col md:flex-row md:items-start md:justify-center gap-4 p-4 md:p-6 md:pt-10 bg-theme-bg">
    <ChatPanel :socket="socket" :room-id="roomId" class="hidden md:flex w-64 self-stretch" />

    <div class="window-panel w-full max-w-sm">
      <!-- Titlebar -->
      <div class="window-titlebar px-3 h-8">
        <span>■ WAITING ROOM</span>
        <span class="font-terminal text-xs">
          {{ roomStore.lobbyParticipants.length }} / 20
        </span>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-4">
        <!-- Participant list -->
        <div class="flex flex-col gap-2">
          <div
            v-for="p in roomStore.lobbyParticipants"
            :key="p.id"
            class="flex items-center gap-3"
          >
            <!-- Avatar -->
            <div class="w-8 h-8 flex items-center justify-center shrink-0 avatar-pixel bg-theme-surface-2 font-pixel text-[8px] text-theme-accent">
              {{ p.name.charAt(0).toUpperCase() }}
            </div>

            <!-- Name -->
            <span class="flex-1 text-sm truncate font-terminal text-theme">{{ p.name }}</span>

            <!-- Badges -->
            <div class="flex items-center gap-1">
              <span v-if="p.id === roomStore.roomOwnerId" class="badge-host">HOST</span>
              <span v-if="p.id === authStore.user?.uid" class="badge-you">YOU</span>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="roomStore.lobbyParticipants.length === 0"
            class="text-xs py-2 text-theme-muted font-terminal"
          >
            No participants yet…
          </div>
        </div>

        <hr class="border-theme" />

        <!-- Settings section -->
        <div class="flex flex-col gap-3">
          <span class="font-pixel text-[12px] text-theme-muted tracking-widest">SETTINGS</span>

          <!-- Session Timer -->
          <div class="flex flex-col gap-1">
            <span class="text-xs font-terminal text-theme-muted">Session Timer</span>

            <!-- Host: segmented selector -->
            <div v-if="isOwner" class="flex flex-wrap gap-1">
              <button
                v-for="minutes in TIMER_OPTIONS_MIN"
                :key="minutes"
                class="px-2 py-1 text-xs font-terminal border transition-colors"
                :class="selectedDurationMs === minutes * 60_000
                  ? 'border-theme-accent text-theme-accent bg-theme-surface-2'
                  : 'border-theme text-theme-muted hover:border-theme-accent hover:text-theme'"
                @click="selectedDurationMs = minutes * 60_000"
              >
                {{ formatDuration(minutes * 60_000) }}
              </button>
            </div>

            <!-- Non-host: read-only label -->
            <span v-else class="text-xs font-terminal text-theme">
              {{ formatDuration(roomStore.roomSettings.timerDurationMs) }}
            </span>
          </div>

          <!-- Game Mode -->
          <div class="flex flex-col gap-1">
            <span class="text-xs font-terminal text-theme-muted">Game Mode</span>

            <!-- Host: interactive mode cards -->
            <div v-if="isOwner" class="flex gap-2">
              <!-- Collaborative card -->
              <button
                class="mode-card flex-1 flex flex-col gap-1 p-2 border-2 text-left"
                :class="selectedGameMode === 'collaborative'
                  ? 'mode-card--active-collab'
                  : 'border-theme text-theme-muted hover:border-theme-accent'"
                @click="selectedGameMode = 'collaborative'"
                :aria-pressed="selectedGameMode === 'collaborative'"
              >
                <span class="font-pixel text-[10px] tracking-wider leading-none"
                  :class="selectedGameMode === 'collaborative' ? 'text-theme-accent' : ''">
                  ◼ COLLABORATIVE
                </span>
                <span class="font-terminal text-[11px] leading-tight"
                  :class="selectedGameMode === 'collaborative' ? 'text-theme' : 'text-theme-muted'">
                  Shared canvas for all
                </span>
              </button>

              <!-- Draw the Word card -->
              <button
                class="mode-card flex-1 flex flex-col gap-1 p-2 border-2 text-left"
                :class="selectedGameMode === 'draw-the-word'
                  ? 'mode-card--active-dtw'
                  : 'border-theme text-theme-muted hover:border-theme-accent'"
                @click="selectedGameMode = 'draw-the-word'"
                :aria-pressed="selectedGameMode === 'draw-the-word'"
              >
                <span class="font-pixel text-[10px] tracking-wider leading-none"
                  :class="selectedGameMode === 'draw-the-word' ? 'text-theme-accent-2' : ''">
                  ◆ DRAW THE WORD
                </span>
                <span class="font-terminal text-[11px] leading-tight"
                  :class="selectedGameMode === 'draw-the-word' ? 'text-theme' : 'text-theme-muted'">
                  Everyone draws the prompt
                </span>
              </button>
            </div>

            <!-- Non-host: read-only mode label -->
            <span
              v-else
              class="text-xs font-terminal"
              :class="roomStore.roomSettings.gameMode === 'draw-the-word' ? 'text-theme-accent-2' : 'text-theme'"
            >
              {{ gameModeLabel(roomStore.roomSettings.gameMode) }}
            </span>
          </div>
        </div>

        <hr class="border-theme" />

        <!-- Non-host waiting message -->
        <template v-if="!isOwner">
          <!-- word-entry status: host is choosing the word -->
          <p
            v-if="roomStore.roomStatus === 'word-entry'"
            class="text-xs text-center font-terminal text-theme-accent-2 text-glow-accent-2"
          >
            ◆ Host is choosing a word...
          </p>
          <!-- Default: waiting for host to start -->
          <p v-else class="text-xs text-center text-theme-muted font-terminal">
            Waiting for host to start…
          </p>
        </template>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" @click="copyLink">
            {{ copied ? '✓ Copied!' : '⎘ Share' }}
          </AppButton>
          <AppButton
            variant="primary"
            class="flex-1"
            :disabled="isStartDisabled"
            @click="startRoom"
          >
            ▶ Start
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Mobile chat FAB -->
    <button
      class="md:hidden fixed bottom-4 right-4 z-50 w-12 h-12 toolbar-panel flex items-center justify-center relative"
      @click="showMobileChat = true"
    >
      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2" width="12" height="2" fill="currentColor"/>
        <rect x="2" y="4" width="2" height="6" fill="currentColor"/>
        <rect x="12" y="4" width="2" height="6" fill="currentColor"/>
        <rect x="2" y="10" width="8" height="2" fill="currentColor"/>
        <rect x="4" y="12" width="2" height="2" fill="currentColor"/>
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-theme-accent text-[10px] font-pixel flex items-center justify-center"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Mobile chat bottom sheet backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showMobileChat"
        class="md:hidden fixed inset-0 z-40 bg-black/50"
        @pointerdown.stop="showMobileChat = false"
      />
    </Transition>

    <!-- Mobile chat bottom sheet -->
    <Transition
      enter-active-class="transition-transform duration-[250ms] ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-[250ms] ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div v-if="showMobileChat" class="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[70vh]">
        <ChatPanel :socket="socket" :room-id="roomId" class="h-full" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Mode selection cards */
.mode-card {
  background-color: var(--color-surface-2);
  cursor: pointer;
  transition: none;
  min-height: 52px;
}

/* Collaborative — active state: purple accent */
.mode-card--active-collab {
  border-color: var(--color-accent);
  background-color: var(--color-surface-2);
  box-shadow: 2px 2px 0 var(--color-accent);
}

/* Draw the Word — active state: teal accent-2 */
.mode-card--active-dtw {
  border-color: var(--color-accent-2);
  background-color: var(--color-surface-2);
  box-shadow: 2px 2px 0 var(--color-accent-2), 0 0 8px rgba(0, 245, 212, 0.25);
}

/* Hover state for unselected cards (non-active) */
.mode-card:not(.mode-card--active-collab):not(.mode-card--active-dtw):hover {
  border-color: var(--color-accent);
}
</style>
