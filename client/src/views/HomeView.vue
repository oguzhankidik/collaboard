<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuth } from '@/composables/useAuth'
import RoomList from '@/components/room/RoomList.vue'
import CreateRoomModal from '@/components/room/CreateRoomModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import type { GameMode } from '@/types'

const authStore = useAuthStore()
const roomStore = useRoomStore()
const { logout } = useAuth()

const showCreateModal = ref(false)
const activeFilter = ref<GameMode | null>(null)

const isGuest = computed(() => authStore.user?.isAnonymous ?? false)
const isInRoom = computed(() => roomStore.currentRoomId !== null)
const canCreateRoom = computed(() => !isInRoom.value)
const totalParticipants = computed(() =>
  roomStore.rooms.reduce((sum, r) => sum + r.participants.length, 0)
)

function setFilter(mode: GameMode | null) {
  activeFilter.value = activeFilter.value === mode ? null : mode
}
</script>

<template>
  <div class="home-shell">

    <!-- Header -->
    <header class="home-header header-accent-border bg-theme-surface">
      <div class="font-pixel text-base glitch-text text-theme-accent">
        <span class="text-glow-accent">COLLA</span><span class="text-glow-accent-2 text-theme-accent-2">BOARD</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 flex items-center justify-center text-xs font-bold select-none avatar-pixel bg-theme-accent text-white shrink-0">
          {{ authStore.user?.displayName?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <span class="text-xs text-theme-muted hidden sm:inline truncate max-w-[140px]">
          {{ authStore.user?.displayName }}
        </span>
        <AppButton variant="secondary" @click="logout">Sign out</AppButton>
      </div>
    </header>

    <!-- Body: sidebar + main -->
    <div class="home-body">

      <!-- Sidebar -->
      <aside class="home-sidebar">

        <!-- Player section -->
        <div class="sidebar-section">
          <p class="sidebar-label">Player</p>
          <div class="flex items-center gap-3">
            <div class="sidebar-avatar">
              {{ authStore.user?.displayName?.charAt(0).toUpperCase() ?? '?' }}
            </div>
            <div class="min-w-0">
              <p class="text-sm text-theme truncate">{{ authStore.user?.displayName }}</p>
              <span class="tag mt-1 inline-block">{{ isGuest ? 'Guest' : 'Google' }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Stats section -->
        <div class="sidebar-section">
          <p class="sidebar-label">Live stats</p>
          <div class="flex flex-col gap-2">
            <div class="stat-row">
              <span class="text-xs text-theme-muted">Rooms available</span>
              <span class="stat-value text-theme-accent">{{ roomStore.rooms.length }}</span>
            </div>
            <div class="stat-row">
              <span class="text-xs text-theme-muted">Players online</span>
              <span class="stat-value text-theme-accent-2">{{ totalParticipants }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Game modes section -->
        <div class="sidebar-section">
          <p class="sidebar-label">Filter by mode</p>
          <div class="flex flex-col gap-1">
            <button
              class="mode-filter-btn"
              :class="{ 'mode-filter-btn--active-all': activeFilter === null }"
              @click="setFilter(null)"
            >
              <span class="mode-dot mode-dot--all"></span>
              <span class="text-xs font-pixel">All modes</span>
            </button>
            <button
              class="mode-filter-btn"
              :class="{ 'mode-filter-btn--active': activeFilter === 'collaborative' }"
              @click="setFilter('collaborative')"
            >
              <span class="mode-dot mode-dot--collab"></span>
              <span class="text-xs font-pixel">Collaborative</span>
            </button>
            <button
              class="mode-filter-btn"
              :class="{ 'mode-filter-btn--active': activeFilter === 'draw-the-word' }"
              @click="setFilter('draw-the-word')"
            >
              <span class="mode-dot mode-dot--dtw"></span>
              <span class="text-xs font-pixel">Draw the Word</span>
            </button>
            <button
              class="mode-filter-btn"
              :class="{ 'mode-filter-btn--active': activeFilter === 'collaborative-story' }"
              @click="setFilter('collaborative-story')"
            >
              <span class="mode-dot mode-dot--story"></span>
              <span class="text-xs font-pixel">Collab Story</span>
            </button>
          </div>
        </div>

      </aside>

      <!-- Main content -->
      <main class="home-main">

        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <h2 class="font-pixel text-theme">Rooms</h2>
            <span class="text-xs text-theme-muted">({{ roomStore.rooms.length }})</span>
          </div>
          <div v-if="canCreateRoom">
            <AppButton variant="primary" @click="showCreateModal = true">+ New room</AppButton>
          </div>
          <p v-else-if="isInRoom" class="text-xs text-theme-muted">
            Leave your current room to create a new one.
          </p>
        </div>

        <div v-if="isInRoom" class="mb-5 px-3 py-2 alert-danger text-xs">
          You are already in a room. Leave it before joining another.
        </div>

        <RoomList :active-filter="activeFilter" />

      </main>
    </div>

  </div>

  <CreateRoomModal :open="showCreateModal" @close="showCreateModal = false" />
</template>

<style scoped>
/* ─── Shell layout ───────────────────────────────────────── */
.home-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--color-bg);
  background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 28px 28px;
}

.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 20;
}

.home-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ─── Sidebar ────────────────────────────────────────────── */
.home-sidebar {
  display: none;
  width: 260px;
  flex-shrink: 0;
  flex-direction: column;
  background-color: var(--color-surface);
  border-right: 1px solid var(--color-border);
  position: relative;
  overflow-y: auto;
}

/* Gradient right border accent */
.home-sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
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

@media (min-width: 768px) {
  .home-sidebar { display: flex; }
}

.sidebar-section {
  padding: 20px 20px;
}

.sidebar-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--color-border) 0%, transparent 100%);
}

.sidebar-divider {
  height: 1px;
  background: var(--color-border);
  margin: 0 20px;
}

.sidebar-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-pixel);
  font-size: 18px;
  font-weight: bold;
  background-color: var(--color-accent);
  color: #fff;
  border: 2px solid var(--color-accent);
  box-shadow: 2px 2px 0 var(--color-accent), var(--glow-accent);
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
}

.stat-value {
  font-family: var(--font-pixel);
  font-size: 14px;
}

/* Game mode legend */
.mode-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
}

.mode-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
}

.mode-dot--all    { background-color: var(--color-border); }
.mode-dot--collab { background-color: var(--color-accent); }
.mode-dot--dtw    { background: linear-gradient(135deg, var(--color-accent), var(--color-accent-2)); }
.mode-dot--story  { background: linear-gradient(135deg, #ff4d6d, #ff9d4d); }

/* Filter buttons */
.mode-filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  width: 100%;
  text-align: left;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 100ms, border-color 100ms, color 100ms;
}
.mode-filter-btn:hover {
  background-color: var(--color-surface-2);
  color: var(--color-text);
}
.mode-filter-btn--active {
  background-color: var(--color-surface-2);
  border-color: var(--color-accent);
  color: var(--color-text);
}
.mode-filter-btn--active-all {
  background-color: var(--color-surface-2);
  border-color: var(--color-border);
  color: var(--color-text);
}

/* ─── Main ───────────────────────────────────────────────── */
.home-main {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  max-width: 1100px;
}
</style>
