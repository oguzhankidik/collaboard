<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuth } from '@/composables/useAuth'
import RoomList from '@/components/room/RoomList.vue'
import CreateRoomModal from '@/components/room/CreateRoomModal.vue'
import AppButton from '@/components/ui/AppButton.vue'

const authStore = useAuthStore()
const roomStore = useRoomStore()
const { logout } = useAuth()

const showCreateModal = ref(false)

const isGuest = computed(() => !!authStore.user && 'isGuest' in authStore.user)
const isInRoom = computed(() => roomStore.currentRoomId !== null)
const canCreateRoom = computed(() => !isGuest.value && !isInRoom.value)
</script>

<template>
  <div class="min-h-screen bg-theme-bg">
    <!-- Header -->
    <header class="px-6 py-3 flex items-center justify-between header-accent-border bg-theme-surface">
      <div class="font-pixel text-md glitch-text text-theme-accent">
        <span class="text-glow-accent">COLLA</span><span class="text-glow-accent-2 text-theme-accent-2">BOARD</span>
      </div>
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 flex items-center justify-center text-xs font-bold select-none avatar-pixel bg-theme-accent text-white">
          {{ authStore.user?.displayName?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <span class="text-xs text-theme-muted">
          {{ authStore.user?.displayName }}
          <span v-if="isGuest" class="ml-1 tag">Guest</span>
        </span>
        <AppButton variant="secondary" @click="logout">Sign out</AppButton>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-3xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-pixel text-theme">Rooms</h2>
        <div v-if="canCreateRoom">
          <AppButton variant="primary" @click="showCreateModal = true">+ New room</AppButton>
        </div>
        <div v-else-if="isInRoom" class="text-xs text-theme-muted">
          Leave your current room to create a new one.
        </div>
        <div v-else-if="isGuest" class="text-xs text-theme-muted">
          Guests can only join existing rooms.
        </div>
      </div>

      <div v-if="isInRoom" class="mb-4 px-3 py-2 alert-danger text-xs">
        You are already in a room. Leave it before joining another.
      </div>

      <RoomList />
    </main>

    <CreateRoomModal :open="showCreateModal" @close="showCreateModal = false" />
  </div>
</template>
