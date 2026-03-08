<script setup lang="ts">
defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/75"
          @click="emit('close')"
        />
        <div class="modal-panel relative">
          <div class="modal-titlebar">
            <span>■ {{ title }}</span>
            <button
              class="w-6 h-6 flex items-center justify-center hover:opacity-75"
              @click="emit('close')"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="0" y="0" width="2" height="2" fill="white"/>
                <rect x="2" y="2" width="2" height="2" fill="white"/>
                <rect x="4" y="4" width="2" height="2" fill="white"/>
                <rect x="6" y="2" width="2" height="2" fill="white"/>
                <rect x="8" y="0" width="2" height="2" fill="white"/>
                <rect x="6" y="6" width="2" height="2" fill="white"/>
                <rect x="2" y="6" width="2" height="2" fill="white"/>
                <rect x="0" y="8" width="2" height="2" fill="white"/>
                <rect x="8" y="8" width="2" height="2" fill="white"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active { transition: opacity 100ms steps(1, end); }
.modal-leave-active { transition: opacity 100ms steps(1, start); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
