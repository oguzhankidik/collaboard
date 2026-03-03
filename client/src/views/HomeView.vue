<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/composables/useAuth'
import RoomList from '@/components/room/RoomList.vue'
import CreateRoomModal from '@/components/room/CreateRoomModal.vue'
import AppButton from '@/components/ui/AppButton.vue'

const authStore = useAuthStore()
const { logout } = useAuth()

const showCreateModal = ref(false)
</script>

<template>
  <div class="min-h-screen bg-theme-bg">
    <!-- Header -->
    <header class="px-6 py-3 flex items-center justify-between header-accent-border bg-theme-surface">
      <div class="font-pixel text-xs glitch-text text-theme-accent">
        <span class="text-glow-accent">COLLA</span><span class="text-glow-accent-2 text-theme-accent-2">BOARD</span>
      </div>
      <div class="flex items-center gap-3">
        <!-- User avatar initial -->
        <div class="w-7 h-7 flex items-center justify-center text-xs font-bold select-none avatar-pixel bg-theme-accent text-white">
          {{ authStore.user?.displayName?.charAt(0).toUpperCase() ?? '?' }}
        </div>
        <span class="text-xs text-theme-muted">{{ authStore.user?.displayName }}</span>
        <AppButton variant="secondary" @click="logout">Sign out</AppButton>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-3xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-pixel text-[10px] text-theme">Rooms</h2>
        <AppButton variant="primary" @click="showCreateModal = true">+ New room</AppButton>
      </div>

      <RoomList />
    </main>

    <CreateRoomModal :open="showCreateModal" @close="showCreateModal = false" />
  </div>
</template>
