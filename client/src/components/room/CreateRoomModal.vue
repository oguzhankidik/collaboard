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
const isPrivate = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

async function create() {
  if (!name.value.trim()) return
  if (authStore.user && 'isGuest' in authStore.user) {
    error.value = 'Guest users cannot create rooms'
    return
  }

  loading.value = true
  error.value = null
  try {
    const token = await (authStore.user as import('firebase/auth').User)?.getIdToken()
    const res = await fetch(`${import.meta.env.VITE_SOCKET_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: name.value.trim(),
        isPrivate: isPrivate.value,
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
        <label class="block label-reset text-sm mb-1.5 text-theme-muted">Room name</label>
        <input
          v-model="name"
          type="text"
          maxlength="100"
          placeholder="My whiteboard"
          class="input-field"
          autofocus
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <div class="flex gap-2">
          <button
            type="button"
            :class="['flex-1 py-1.5 text-xs font-terminal border transition-colors',
              !isPrivate ? 'border-theme-accent text-theme-accent bg-theme-surface-2' : 'border-theme text-theme-muted bg-transparent']"
            @click="isPrivate = false"
          >
            ◉ Public
          </button>
          <button
            type="button"
            :class="['flex-1 py-1.5 text-xs font-terminal border transition-colors',
              isPrivate ? 'border-theme-accent text-theme-accent bg-theme-surface-2' : 'border-theme text-theme-muted bg-transparent']"
            @click="isPrivate = true"
          >
            ◎ Private
          </button>
        </div>
        <p class="text-sm text-theme-muted font-terminal">
          {{ isPrivate ? 'Only people with the link can join.' : 'Visible to everyone in the room list.' }}
        </p>
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
