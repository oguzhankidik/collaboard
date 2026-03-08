<script setup lang="ts">
// 1. Imports
import { ref, watch, nextTick } from 'vue'
import type { Socket } from 'socket.io-client'
import AppButton from '@/components/ui/AppButton.vue'

// 2. Props & Emits
const props = defineProps<{
  roomId: string
  socket: Socket | null
  open: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()

// 3. Reactive state
const word = ref('')
const inputError = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// 4. Functions
function handleCancel() {
  props.socket?.emit('room:stop', props.roomId)
  word.value = ''
  inputError.value = null
  emit('cancel')
}

function handleSubmit() {
  const trimmed = word.value.trim()
  if (!trimmed) {
    inputError.value = 'Word or phrase cannot be empty.'
    return
  }
  inputError.value = null
  props.socket?.emit('game:set-word', { roomId: props.roomId, word: trimmed })
  word.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleSubmit()
  }
}

// 5. Lifecycle / watchers
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      word.value = ''
      inputError.value = null
      await nextTick()
      inputRef.value?.focus()
    }
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="word-entry-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-entry-title"
      >
        <!-- Backdrop — intentionally non-dismissable -->
        <div class="absolute inset-0 bg-black/80" />

        <!-- Modal panel -->
        <div class="modal-panel relative w-full max-w-md word-entry-panel">
          <!-- Titlebar — teal accent-2 to signal game mode -->
          <div class="modal-titlebar word-entry-titlebar" id="word-entry-title">
            <span>■ ENTER WORD</span>
            <!-- Decorative pixel corners -->
            <span class="font-terminal text-xs opacity-60">DRAW THE WORD</span>
          </div>

          <!-- Body -->
          <div class="modal-body flex flex-col gap-5">
            <!-- Description -->
            <p class="font-terminal text-sm text-theme-muted leading-relaxed">
              Everyone will try to draw this word or phrase.
              <span class="text-theme-danger font-pixel text-[11px]">
                ▲ Don't reveal it in chat!
              </span>
            </p>

            <!-- Word input — large, prominent -->
            <div class="flex flex-col gap-1">
              <label for="word-input" class="font-pixel text-[11px] tracking-widest text-theme-accent-2">
                YOUR WORD / PHRASE
              </label>
              <input
                id="word-input"
                ref="inputRef"
                v-model="word"
                type="text"
                maxlength="100"
                placeholder="e.g. haunted lighthouse…"
                autocomplete="off"
                spellcheck="false"
                class="input-field word-entry-input"
                :class="inputError ? 'word-entry-input--error' : ''"
                @keydown="onKeydown"
              />
              <!-- Character count + error row -->
              <div class="flex items-center justify-between mt-0.5">
                <span
                  v-if="inputError"
                  class="font-terminal text-xs text-theme-danger"
                  role="alert"
                >
                  {{ inputError }}
                </span>
                <span v-else class="font-terminal text-xs text-theme-muted">
                  &nbsp;
                </span>
                <span
                  class="font-terminal text-xs shrink-0 ml-2"
                  :class="word.length >= 90 ? 'text-theme-danger' : 'text-theme-muted'"
                >
                  {{ word.length }} / 100
                </span>
              </div>
            </div>

            <!-- Hint box -->
            <div class="word-entry-hint flex items-start gap-3 p-3">
              <!-- Pixel lightbulb icon -->
              <svg width="16" height="16" viewBox="0 0 16 16" class="shrink-0 mt-0.5 text-theme-accent-2" fill="currentColor" aria-hidden="true">
                <rect x="5" y="1" width="6" height="2"/>
                <rect x="3" y="3" width="2" height="2"/>
                <rect x="11" y="3" width="2" height="2"/>
                <rect x="2" y="5" width="2" height="4"/>
                <rect x="12" y="5" width="2" height="4"/>
                <rect x="3" y="9" width="2" height="2"/>
                <rect x="11" y="9" width="2" height="2"/>
                <rect x="5" y="11" width="6" height="2"/>
                <rect x="6" y="13" width="4" height="2"/>
              </svg>
              <p class="font-terminal text-xs text-theme-muted leading-relaxed">
                Keep it clear and drawable. Single words work great — short phrases too. Avoid proper names and overly abstract concepts.
              </p>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-3">
              <AppButton variant="secondary" class="flex-1" @click="handleCancel">
                ✕ Cancel
              </AppButton>
              <AppButton variant="primary" class="flex-1 word-entry-start-btn" @click="handleSubmit">
                ▶ Start Game
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Panel override — teal accent-2 border instead of purple */
.word-entry-panel {
  border-color: var(--color-accent-2);
  box-shadow: 4px 4px 0 var(--color-accent-2), var(--glow-accent-2);
}

/* Titlebar override — teal background */
.word-entry-titlebar {
  background-color: var(--color-accent-2);
  color: #0f0f1a;
}

/* Word input — larger font, taller, accent-2 focus state */
.word-entry-input {
  font-size: 18px;
  padding-top: 10px;
  padding-bottom: 10px;
  letter-spacing: 0.02em;
}

.word-entry-input:focus {
  border-left-color: var(--color-accent-2);
}

.word-entry-input--error {
  border-color: var(--color-danger);
}

/* Hint box */
.word-entry-hint {
  background-color: var(--color-surface-2);
  border: 2px solid var(--color-border);
  border-left: 3px solid var(--color-accent-2);
}

/* Start button — accent-2 (teal) override */
.word-entry-start-btn {
  background-color: var(--color-accent-2) !important;
  color: #0f0f1a !important;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.4) !important;
}

.word-entry-start-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.4) !important;
  transform: translate(1px, 1px);
}

.word-entry-start-btn:active:not(:disabled) {
  box-shadow: none !important;
  transform: translate(3px, 3px);
}

/* Step transition — matches the pixel aesthetic of AppModal */
.word-entry-modal-enter-active {
  transition: opacity 100ms steps(1, end);
}
.word-entry-modal-leave-active {
  transition: opacity 100ms steps(1, start);
}
.word-entry-modal-enter-from,
.word-entry-modal-leave-to {
  opacity: 0;
}
</style>
