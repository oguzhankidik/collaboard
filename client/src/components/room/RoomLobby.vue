<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Socket } from 'socket.io-client'
import type { GameMode } from '@/types'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { TIMER_OPTIONS_MS } from '@/constants'
import AppButton from '@/components/ui/AppButton.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const props = defineProps<{
  roomId: string
  socket: Socket | null
}>()

const roomStore = useRoomStore()
const authStore = useAuthStore()

const showMobileChat = ref(false)
const unreadCount = ref(0)
const copied = ref(false)
const selectedDurationMs = ref(roomStore.roomSettings.timerDurationMs)

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)

const isStartDisabled = computed(
  () =>
    !isOwner.value
    || roomStore.roomStatus === 'word-entry'
    || (roomStore.roomSettings.gameMode === 'collaborative-story' && roomStore.roomSettings.timerDurationMs === 0),
)

function formatDuration(ms: number): string {
  if (ms === 0) return 'None'
  if (ms < 60_000) return `${ms / 1000}s`
  return `${ms / 60_000}m`
}

function selectTimer(ms: number) {
  props.socket?.emit('room:settings_changed', {
    roomId: props.roomId,
    settings: { timerDurationMs: ms, gameMode: roomStore.roomSettings.gameMode },
  })
}

function selectGameMode(mode: GameMode) {
  props.socket?.emit('room:settings_changed', {
    roomId: props.roomId,
    settings: { timerDurationMs: selectedDurationMs.value, gameMode: mode },
  })
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
    settings: { timerDurationMs: selectedDurationMs.value, gameMode: roomStore.roomSettings.gameMode },
  })
}

watch(() => roomStore.roomSettings.timerDurationMs, (val) => {
  selectedDurationMs.value = val
})

watch(() => roomStore.chatMessages.length, () => {
  if (!showMobileChat.value) unreadCount.value++
})

watch(showMobileChat, (open) => {
  if (open) unreadCount.value = 0
})
</script>

<template>
  <div class="lobby-shell">

    <!-- ── LEFT SIDEBAR: Settings ── -->
    <aside class="lobby-sidebar">

      <!-- Game Mode -->
      <div class="lsb-section">
        <p class="lsb-label">Game mode</p>

        <div class="flex flex-col gap-1">
          <!-- Collaborative -->
          <button
            class="mode-btn"
            :class="{ 'mode-btn--collab': roomStore.roomSettings.gameMode === 'collaborative' }"
            :disabled="!isOwner"
            @click="selectGameMode('collaborative')"
          >
            <span class="mode-btn__bar mode-btn__bar--collab"></span>
            <div class="mode-btn__body">
              <span class="mode-btn__name">COLLABORATIVE</span>
              <span class="mode-btn__sub">Draw together</span>
            </div>
            <span
              v-if="roomStore.roomSettings.gameMode === 'collaborative'"
              class="mode-btn__active-dot mode-btn__active-dot--collab"
            ></span>
          </button>

          <!-- Draw the Word -->
          <button
            class="mode-btn"
            :class="{ 'mode-btn--dtw': roomStore.roomSettings.gameMode === 'draw-the-word' }"
            :disabled="!isOwner"
            @click="selectGameMode('draw-the-word')"
          >
            <span class="mode-btn__bar mode-btn__bar--dtw"></span>
            <div class="mode-btn__body">
              <span class="mode-btn__name">DRAW THE WORD</span>
              <span class="mode-btn__sub">Pictionary mode</span>
            </div>
            <span
              v-if="roomStore.roomSettings.gameMode === 'draw-the-word'"
              class="mode-btn__active-dot mode-btn__active-dot--dtw"
            ></span>
          </button>

          <!-- Collab Story -->
          <button
            class="mode-btn"
            :class="{ 'mode-btn--story': roomStore.roomSettings.gameMode === 'collaborative-story' }"
            :disabled="!isOwner"
            @click="selectGameMode('collaborative-story')"
          >
            <span class="mode-btn__bar mode-btn__bar--story"></span>
            <div class="mode-btn__body">
              <span class="mode-btn__name">COLLAB STORY</span>
              <span class="mode-btn__sub">Draw in turns</span>
            </div>
            <span
              v-if="roomStore.roomSettings.gameMode === 'collaborative-story'"
              class="mode-btn__active-dot mode-btn__active-dot--story"
            ></span>
          </button>
        </div>
      </div>

      <div class="lsb-divider"></div>

      <!-- Session Timer -->
      <div class="lsb-section">
        <p class="lsb-label">Session timer</p>

        <div v-if="isOwner" class="flex flex-wrap gap-1.5">
          <button
            v-for="ms in TIMER_OPTIONS_MS"
            :key="ms"
            class="timer-chip"
            :class="{ 'timer-chip--active': selectedDurationMs === ms }"
            @click="selectTimer(ms)"
          >
            {{ formatDuration(ms) }}
          </button>
        </div>
        <span v-else class="text-sm text-theme font-terminal">
          {{ formatDuration(roomStore.roomSettings.timerDurationMs) }}
        </span>
      </div>

      <!-- Validation warning (pinned to bottom on desktop) -->
      <div class="lsb-warnings">
        <p
          v-if="isOwner && roomStore.roomSettings.gameMode === 'collaborative-story' && roomStore.roomSettings.timerDurationMs === 0"
          class="text-xs font-terminal text-theme-danger"
        >
          ◈ Collab Story requires a session timer
        </p>
      </div>

    </aside>

    <!-- ── RIGHT: Main content ── -->
    <div class="lobby-main">

      <!-- Waiting Room panel -->
      <div class="window-panel flex flex-col min-h-0">
        <div class="window-titlebar px-4 flex-shrink-0">
          <span>■ WAITING ROOM</span>
          <span class="font-terminal text-xs">{{ roomStore.lobbyParticipants.length }} / 20</span>
        </div>

        <div class="p-5 flex flex-col gap-4">

          <!-- Participant list -->
          <div class="flex flex-col gap-2">
            <div
              v-for="p in roomStore.lobbyParticipants"
              :key="p.id"
              class="participant-row"
            >
              <div class="participant-avatar">
                {{ p.name.charAt(0).toUpperCase() }}
              </div>
              <span class="flex-1 text-sm truncate font-terminal text-theme">{{ p.name }}</span>
              <div class="flex items-center gap-1">
                <span v-if="p.id === roomStore.roomOwnerId" class="badge-host">HOST</span>
                <span v-if="p.id === authStore.user?.uid" class="badge-you">YOU</span>
              </div>
            </div>
            <div
              v-if="roomStore.lobbyParticipants.length === 0"
              class="text-xs py-2 text-theme-muted font-terminal"
            >
              No participants yet…
            </div>
          </div>

          <hr class="border-theme" />

          <!-- Status message -->
          <p
            v-if="!isOwner && roomStore.roomStatus === 'word-entry'"
            class="text-xs text-center font-terminal text-theme-accent-2 text-glow-accent-2"
          >
            ◆ Host is choosing a word...
          </p>
          <p v-else-if="!isOwner" class="text-xs text-center text-theme-muted font-terminal">
            Waiting for host to start…
          </p>

          <!-- Actions -->
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

      <!-- Chat panel (desktop) -->
      <div class="hidden md:block flex-shrink-0">
        <ChatPanel :socket="socket" :room-id="roomId" class="h-56" />
      </div>

    </div>

    <!-- ── Mobile chat button ── -->
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

  </div>

  <!-- Mobile chat overlay -->
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
</template>

<style scoped>
/* ─── Shell ──────────────────────────────────────────────── */
.lobby-shell {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-bg);
  background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 28px 28px;
}

@media (min-width: 768px) {
  .lobby-shell { flex-direction: row; }
}

/* ─── Sidebar ────────────────────────────────────────────── */
.lobby-sidebar {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  overflow-y: auto;
  position: relative;
}

@media (min-width: 768px) {
  .lobby-sidebar {
    width: 236px;
    border-bottom: none;
    border-right: 1px solid var(--color-border);
  }
  /* gradient accent on right edge */
  .lobby-sidebar::after {
    content: '';
    position: absolute;
    top: 0; right: 0; bottom: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent 0%,
      var(--color-accent) 30%,
      var(--color-accent-2) 70%,
      transparent 100%
    );
    opacity: 0.4;
  }
}

.lsb-section {
  padding: 20px;
  flex-shrink: 0;
}

.lsb-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lsb-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--color-border) 0%, transparent 100%);
}

.lsb-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 20px;
  flex-shrink: 0;
}

.lsb-warnings {
  padding: 12px 20px 20px;
  margin-top: auto;
  flex-shrink: 0;
}

/* ─── Mode buttons ───────────────────────────────────────── */
.mode-btn {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  background: transparent;
  border: 1px solid var(--color-border);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background-color 100ms, border-color 100ms;
  margin-bottom: 4px;
}

.mode-btn:hover:not(:disabled) {
  background-color: var(--color-surface-2);
  border-color: var(--color-surface-2);
}

.mode-btn:disabled { cursor: default; opacity: 0.7; }

.mode-btn__bar {
  display: block;
  width: 4px;
  align-self: stretch;
  flex-shrink: 0;
}
.mode-btn__bar--collab { background-color: var(--color-accent); }
.mode-btn__bar--dtw    { background: linear-gradient(180deg, var(--color-accent), var(--color-accent-2)); }
.mode-btn__bar--story  { background: linear-gradient(180deg, #ff4d6d, #ff9d4d); }

.mode-btn__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  padding: 10px 10px;
  flex: 1;
  min-width: 0;
}

.mode-btn__name {
  font-family: var(--font-pixel);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  transition: color 100ms;
}

.mode-btn__sub {
  font-family: var(--font-terminal);
  font-size: 11px;
  color: var(--color-text-muted);
}

.mode-btn__active-dot {
  width: 6px;
  height: 6px;
  border-radius: 0;
  flex-shrink: 0;
  margin-right: 10px;
}
.mode-btn__active-dot--collab { background-color: var(--color-accent);   box-shadow: 0 0 6px var(--color-accent); }
.mode-btn__active-dot--dtw    { background-color: var(--color-accent-2); box-shadow: 0 0 6px var(--color-accent-2); }
.mode-btn__active-dot--story  { background-color: #ff9d4d;               box-shadow: 0 0 6px #ff9d4d; }

/* Active states */
.mode-btn--collab {
  background-color: var(--color-surface-2);
  border-color: rgba(108, 99, 255, 0.4);
}
.mode-btn--collab .mode-btn__name { color: var(--color-accent); }

.mode-btn--dtw {
  background-color: var(--color-surface-2);
  border-color: rgba(0, 245, 212, 0.4);
}
.mode-btn--dtw .mode-btn__name { color: var(--color-accent-2); }

.mode-btn--story {
  background-color: var(--color-surface-2);
  border-color: rgba(255, 157, 77, 0.4);
}
.mode-btn--story .mode-btn__name { color: #ff9d4d; }

/* ─── Timer chips ────────────────────────────────────────── */
.timer-chip {
  padding: 3px 10px;
  font-family: var(--font-terminal);
  font-size: 12px;
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: border-color 100ms, color 100ms;
}
.timer-chip:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}
.timer-chip--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: rgba(108, 99, 255, 0.08);
}

/* ─── Main area ──────────────────────────────────────────── */
.lobby-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  overflow-y: auto;
  max-width: 520px;
}

@media (min-width: 768px) {
  .lobby-main { margin: 0 auto; }
}

/* ─── Participant row ─────────────────────────────────────── */
.participant-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.participant-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: var(--font-pixel);
  font-size: 12px;
  background-color: var(--color-surface-2);
  border: 2px solid var(--color-border);
  color: var(--color-accent);
}
</style>
