<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import type { Room } from '@/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const roomStore = useRoomStore()
const authStore = useAuthStore()

const name = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function create() {
  if (!name.value.trim()) return

  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${import.meta.env.VITE_SOCKET_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value.trim(),
        ownerId: authStore.user?.uid,
      }),
    })

    if (!res.ok) throw new Error('Failed to create room')

    const room: Room = await res.json()
    roomStore.addRoom(room)
    emit('close')
    await router.push({ name: 'board', params: { roomId: room.id } })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create room'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal title="Create Room" :open="props.open" @close="emit('close')">
    <form class="flex flex-col gap-4" @submit.prevent="create">
      <div>
        <label class="block label-reset text-xs mb-1.5 text-theme-muted">Room name</label>
        <input
          v-model="name"
          type="text"
          maxlength="100"
          placeholder="My whiteboard"
          class="input-field"
          autofocus
        />
      </div>

      <p v-if="error" class="text-xs text-theme-danger">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <AppButton variant="secondary" type="button" @click="emit('close')">Cancel</AppButton>
        <AppButton variant="primary" type="submit" :loading="loading" :disabled="!name.trim()">
          Create
        </AppButton>
      </div>
    </form>
  </AppModal>
</template>
