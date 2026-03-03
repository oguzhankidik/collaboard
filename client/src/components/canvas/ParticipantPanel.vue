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
    class="btn-icon absolute top-3 right-3 z-30 flex items-center gap-1 px-2"
    style="
      background-color: var(--color-surface);
      border: 2px solid var(--color-accent);
      color: var(--color-accent);
      font-family: var(--font-pixel);
      font-size: 8px;
      width: auto;
      height: 28px;
    "
    @click="isExpanded = true"
  >
    ■ {{ roomStore.lobbyParticipants.length }}
  </button>

  <!-- Expanded panel -->
  <div
    v-else
    class="absolute top-3 right-3 z-30 flex flex-col"
    style="
      width: 180px;
      background-color: var(--color-surface);
      border: 2px solid var(--color-accent);
      box-shadow: 4px 4px 0 var(--color-accent);
    "
  >
    <!-- Titlebar -->
    <div
      class="flex items-center justify-between px-2"
      style="
        background-color: var(--color-accent);
        color: #fff;
        font-family: var(--font-pixel);
        font-size: 8px;
        height: 28px;
        shrink: 0;
      "
    >
      <span>■ PLAYERS</span>
      <button
        class="leading-none"
        style="
          background: transparent;
          border: none;
          color: #fff;
          font-family: var(--font-terminal);
          font-size: 14px;
          cursor: pointer;
          padding: 0 2px;
        "
        @click="isExpanded = false"
      >─</button>
    </div>

    <!-- List -->
    <div class="flex flex-col gap-1 p-2">
      <div
        v-for="p in roomStore.lobbyParticipants"
        :key="p.id"
        class="flex items-center gap-2"
      >
        <!-- Avatar -->
        <div
          class="w-6 h-6 flex items-center justify-center shrink-0"
          style="
            background-color: var(--color-surface-2);
            border: 2px solid var(--color-accent);
            font-family: var(--font-pixel);
            font-size: 7px;
            color: var(--color-accent);
          "
        >
          {{ p.name.charAt(0).toUpperCase() }}
        </div>

        <!-- Name -->
        <span
          class="flex-1 text-xs truncate"
          style="font-family: var(--font-terminal); color: var(--color-text)"
        >{{ p.name }}</span>

        <!-- HOST badge -->
        <span
          v-if="p.id === roomStore.roomOwnerId"
          style="
            font-family: var(--font-pixel);
            font-size: 6px;
            background-color: var(--color-accent-2);
            color: #0f0f1a;
            padding: 1px 3px;
            white-space: nowrap;
          "
        >HOST</span>

        <!-- YOU badge -->
        <span
          v-else-if="p.id === authStore.user?.uid"
          style="
            font-family: var(--font-pixel);
            font-size: 6px;
            background-color: var(--color-surface-2);
            color: var(--color-text-muted);
            border: 1px solid var(--color-border);
            padding: 1px 3px;
            white-space: nowrap;
          "
        >YOU</span>
      </div>

      <!-- Empty -->
      <div
        v-if="roomStore.lobbyParticipants.length === 0"
        class="text-xs py-1"
        style="color: var(--color-text-muted); font-family: var(--font-terminal)"
      >
        —
      </div>
    </div>
  </div>
</template>
