<script setup lang="ts">
import { ref } from 'vue'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'

const roomStore = useRoomStore()
const authStore = useAuthStore()

const isExpanded = ref(true)
</script>

<template>
  <!-- Collapsed: count badge -->
  <button
    v-if="!isExpanded"
    class="panel-toggle btn-icon flex items-center gap-1 px-2"
    @click="isExpanded = true"
  >
    ■ {{ roomStore.lobbyParticipants.length }}
  </button>

  <!-- Expanded panel -->
  <div
    v-else
    class="window-panel flex flex-col w-[180px]"
  >
    <!-- Titlebar -->
    <div class="window-titlebar px-2 h-7">
      <span>■ PLAYERS</span>
      <button class="panel-minimize" @click="isExpanded = false">─</button>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-1 p-2">
      <div
        v-for="p in roomStore.lobbyParticipants"
        :key="p.id"
        class="flex items-center gap-2"
      >
        <!-- Avatar -->
        <div class="w-6 h-6 flex items-center justify-center shrink-0 bg-theme-surface-2 border-2 border-theme-accent font-pixel text-[7px] text-theme-accent">
          {{ p.name.charAt(0).toUpperCase() }}
        </div>

        <!-- Name -->
        <span class="flex-1 text-xs truncate font-terminal text-theme">{{ p.name }}</span>

        <!-- HOST badge -->
        <span v-if="p.id === roomStore.roomOwnerId" class="badge-host-sm">HOST</span>

        <!-- YOU badge -->
        <span v-else-if="p.id === authStore.user?.uid" class="badge-you-sm">YOU</span>
      </div>

      <!-- Empty -->
      <div
        v-if="roomStore.lobbyParticipants.length === 0"
        class="text-xs py-1 text-theme-muted font-terminal"
      >
        —
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-toggle {
  background-color: var(--color-surface);
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  font-family: var(--font-pixel);
  font-size: 8px;
  width: auto;
  height: 28px;
}

.panel-minimize {
  background: transparent;
  border: none;
  color: #fff;
  font-family: var(--font-terminal);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.badge-host-sm {
  font-family: var(--font-pixel);
  font-size: 6px;
  background-color: var(--color-accent-2);
  color: #0f0f1a;
  padding: 1px 3px;
  white-space: nowrap;
}

.badge-you-sm {
  font-family: var(--font-pixel);
  font-size: 6px;
  background-color: var(--color-surface-2);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  padding: 1px 3px;
  white-space: nowrap;
}
</style>
