<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Socket } from 'socket.io-client'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import AppButton from '@/components/ui/AppButton.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const props = defineProps<{
  roomId: string
  socket: Socket | null
}>()

const roomStore = useRoomStore()
const authStore = useAuthStore()

const isOwner = computed(() => authStore.user?.uid === roomStore.roomOwnerId)

const copied = ref(false)

function copyLink() {
  const url = `${window.location.origin}/board/${props.roomId}`
  navigator.clipboard.writeText(url).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function startRoom() {
  props.socket?.emit('room:start', props.roomId)
}
</script>

<template>
  <div class="flex-1 flex items-start justify-center gap-4 p-6 pt-10 bg-theme-bg">
    <ChatPanel :socket="socket" :room-id="roomId" class="w-64 self-stretch" />
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

        <!-- Non-host waiting message -->
        <p v-if="!isOwner" class="text-xs text-center text-theme-muted font-terminal">
          Waiting for host to start…
        </p>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" @click="copyLink">
            {{ copied ? '✓ Copied!' : '⎘ Share' }}
          </AppButton>
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
