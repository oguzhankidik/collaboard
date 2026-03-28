<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import type { Room, GameMode } from '@/types'

const props = defineProps<{
  activeFilter: GameMode | null
}>()

const router = useRouter()
const roomStore = useRoomStore()

const loading = ref(false)
const error = ref<string | null>(null)

const isInRoom = computed(() => roomStore.currentRoomId !== null)

const filteredRooms = computed(() => {
  if (!props.activeFilter) return roomStore.rooms
  return roomStore.rooms.filter(r => (r.gameMode ?? 'collaborative') === props.activeFilter)
})

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
  if (isInRoom.value) return
  router.push({ name: 'board', params: { roomId } })
}

function isActive(room: Room) {
  return room.status && room.status !== 'waiting'
}

interface ModeBadge { label: string; cls: string }

function modeBadge(mode: GameMode | undefined): ModeBadge {
  if (mode === 'draw-the-word')       return { label: '◈ DRAW THE WORD',  cls: 'mode-badge--dtw' }
  if (mode === 'collaborative-story') return { label: '◈ COLLAB STORY',   cls: 'mode-badge--story' }
  return                                     { label: '◈ COLLABORATIVE',   cls: 'mode-badge--collab' }
}
</script>

<template>
  <div>

    <!-- Loading -->
    <div v-if="loading" class="text-xs py-8 text-center text-theme-muted">
      Loading rooms…
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-xs py-8 text-center text-theme-danger">
      {{ error }}
    </div>

    <!-- Empty state (no rooms at all) -->
    <div v-else-if="roomStore.rooms.length === 0" class="empty-state">
      <svg class="empty-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="4" y="10" width="56" height="40" stroke="currentColor" stroke-width="3"/>
        <line x1="4" y1="22" x2="60" y2="22" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="16" r="2" fill="currentColor"/>
        <circle cx="19" cy="16" r="2" fill="currentColor"/>
        <circle cx="26" cy="16" r="2" fill="currentColor"/>
        <path d="M20 36 L28 28 L36 36 L44 24" stroke="currentColor" stroke-width="2" stroke-linecap="square"/>
      </svg>
      <p class="font-pixel text-sm text-theme-muted">No rooms yet</p>
      <p class="text-xs text-theme-muted">Create a room to start drawing together</p>
    </div>

    <!-- Empty state (filter yields no results) -->
    <div v-else-if="filteredRooms.length === 0" class="empty-state">
      <p class="font-pixel text-sm text-theme-muted">No rooms for this mode</p>
      <p class="text-xs text-theme-muted">Try a different filter or create a new room</p>
    </div>

    <!-- Room grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="room in filteredRooms"
        :key="room.id"
        class="room-card card-hover flex flex-col"
        :class="{ 'room-card--disabled': isInRoom, 'room-card--active': isActive(room) }"
        @click="joinRoom(room.id)"
      >
        <!-- Top: name + status badge -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <p class="font-pixel text-sm text-theme leading-snug">{{ room.name }}</p>
          <span class="status-badge shrink-0" :class="isActive(room) ? 'status-badge--active' : 'status-badge--open'">
            {{ isActive(room) ? 'In progress' : 'Open' }}
          </span>
        </div>

        <!-- Mode badge -->
        <div class="mb-4">
          <span class="mode-badge" :class="modeBadge(room.gameMode).cls">
            {{ modeBadge(room.gameMode).label }}
          </span>
        </div>

        <!-- Bottom: participants + join -->
        <div class="room-footer mt-auto">
          <div class="flex items-center gap-1.5 text-theme-muted">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="5.5" r="2.5"/>
              <path d="M2 15c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
            </svg>
            <span class="text-xs">{{ room.participants.length }} / 20</span>
          </div>
          <span v-if="!isInRoom" class="join-cta">Join →</span>
          <span v-else class="text-xs text-theme-muted">—</span>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* ─── Empty state ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 24px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--color-border);
}

/* ─── Room cards ─────────────────────────────────────────── */
.room-card {
  padding: 18px;
  min-height: 120px;
}

.room-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.room-card--active {
  border-color: rgba(255, 77, 109, 0.3);
}

/* Status badge */
.status-badge {
  font-family: var(--font-pixel);
  font-size: 10px;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  white-space: nowrap;
}

.status-badge--open {
  color: var(--color-accent-2);
  background-color: rgba(0, 245, 212, 0.08);
  border: 1px solid rgba(0, 245, 212, 0.35);
}

.status-badge--active {
  color: var(--color-danger);
  background-color: rgba(255, 77, 109, 0.08);
  border: 1px solid rgba(255, 77, 109, 0.35);
}

/* Game mode badge */
.mode-badge {
  display: inline-block;
  font-family: var(--font-pixel);
  font-size: 10px;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border: 1px solid;
}

.mode-badge--collab {
  color: var(--color-accent);
  background-color: rgba(108, 99, 255, 0.08);
  border-color: rgba(108, 99, 255, 0.35);
}

.mode-badge--dtw {
  color: var(--color-accent-2);
  background-color: rgba(0, 245, 212, 0.08);
  border-color: rgba(0, 245, 212, 0.35);
}

.mode-badge--story {
  color: #ff9d4d;
  background-color: rgba(255, 157, 77, 0.08);
  border-color: rgba(255, 157, 77, 0.35);
}

/* Footer row */
.room-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.join-cta {
  font-family: var(--font-pixel);
  font-size: 12px;
  color: var(--color-accent);
  text-shadow: 0 0 6px rgba(108, 99, 255, 0.5);
  transition: color 100ms;
}

.card-hover:hover .join-cta {
  color: var(--color-accent-2);
  text-shadow: 0 0 6px rgba(0, 245, 212, 0.5);
}

.card-hover:hover .status-badge--open {
  border-color: var(--color-accent-2);
}
</style>
