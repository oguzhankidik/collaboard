<script setup lang="ts">
import { onMounted } from 'vue'
import { Analytics } from '@vercel/analytics/vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

onMounted(() => {
  authStore.init()
})
</script>

<template>
  <Analytics />
  <RouterView />
</template>
