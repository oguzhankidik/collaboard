<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAuthStore } from '@/stores/authStore'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas.vue'
import AppButton from '@/components/ui/AppButton.vue'

const route = useRoute()
const router = useRouter()
const canvasStore = useCanvasStore()
const authStore = useAuthStore()

const roomId = route.params.roomId as string

onMounted(() => {
  canvasStore.setElements([])
})

onUnmounted(() => {
  canvasStore.setElements([])
})

function goHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-white">
    <!-- Top bar -->
    <header class="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white z-20 shrink-0">
      <div class="flex items-center gap-3">
        <AppButton variant="secondary" @click="goHome">← Home</AppButton>
        <span class="text-sm text-gray-500 font-mono">{{ roomId }}</span>
      </div>
      <span class="text-sm text-gray-600">{{ authStore.user?.displayName }}</span>
    </header>

    <!-- Canvas fills remaining space -->
    <div class="flex-1 relative overflow-hidden">
      <WhiteboardCanvas />
    </div>
  </div>
</template>
