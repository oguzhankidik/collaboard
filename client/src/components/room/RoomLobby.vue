<script setup lang="ts">
import { computed } from 'vue'
import type { Socket } from 'socket.io-client'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{
  roomId: string
  socket: Socket | null
}>()

const roomStore = useRoomStore()
const authStore = useAuthStore()

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)

function startRoom() {
  props.socket?.emit('room:start', props.roomId)
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-6" style="background-color: var(--color-bg)">
    <div
      class="w-full max-w-sm"
      style="
        background-color: var(--color-surface);
        border: 2px solid var(--color-accent);
        box-shadow: 4px 4px 0 var(--color-accent);
      "
    >
      <!-- Titlebar -->
      <div
        class="flex items-center justify-between px-3"
        style="
          background-color: var(--color-accent);
          color: #fff;
          font-family: var(--font-pixel);
          font-size: 8px;
          height: 32px;
        "
      >
        <span>■ WAITING ROOM</span>
        <span style="font-family: var(--font-terminal); font-size: 12px">
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
            <div
              class="w-8 h-8 flex items-center justify-center shrink-0 avatar-pixel"
              style="
                background-color: var(--color-surface-2);
                font-family: var(--font-pixel);
                font-size: 8px;
                color: var(--color-accent);
              "
            >
              {{ p.name.charAt(0).toUpperCase() }}
            </div>

            <!-- Name -->
            <span
              class="flex-1 text-sm truncate"
              style="font-family: var(--font-terminal); color: var(--color-text)"
            >{{ p.name }}</span>

            <!-- Badges -->
            <div class="flex items-center gap-1">
              <span
                v-if="p.id === roomStore.roomOwnerId"
                class="text-xs px-1.5 py-0.5"
                style="
                  font-family: var(--font-pixel);
                  font-size: 7px;
                  background-color: var(--color-accent-2);
                  color: #0f0f1a;
                "
              >HOST</span>
              <span
                v-if="p.id === authStore.user?.uid"
                class="text-xs px-1.5 py-0.5"
                style="
                  font-family: var(--font-pixel);
                  font-size: 7px;
                  background-color: var(--color-surface-2);
                  color: var(--color-text-muted);
                  border: 1px solid var(--color-border);
                "
              >YOU</span>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="roomStore.lobbyParticipants.length === 0"
            class="text-xs py-2"
            style="color: var(--color-text-muted); font-family: var(--font-terminal)"
          >
            No participants yet…
          </div>
        </div>

        <hr style="border-color: var(--color-border)" />

        <!-- Non-host waiting message -->
        <p
          v-if="!isOwner"
          class="text-xs text-center"
          style="color: var(--color-text-muted); font-family: var(--font-terminal)"
        >
          Waiting for host to start…
        </p>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" disabled>⚙ Settings</AppButton>
          <AppButton
            variant="primary"
            class="flex-1"
            :disabled="!isOwner"
            @click="startRoom"
          >
            ▶ Start
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
