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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">🎨</span>
        <span class="font-semibold text-gray-900">Collaboard</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">{{ authStore.user?.displayName }}</span>
        <AppButton variant="secondary" @click="logout">Sign out</AppButton>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-2xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-gray-900">Rooms</h2>
        <AppButton variant="primary" @click="showCreateModal = true">+ New room</AppButton>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <RoomList />
      </div>
    </main>

    <CreateRoomModal :open="showCreateModal" @close="showCreateModal = false" />
  </div>
</template>
