<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Socket } from 'socket.io-client'
import { useRoomStore } from '@/stores/roomStore'

const props = defineProps<{
  socket: Socket | null
  roomId: string
}>()

const roomStore = useRoomStore()

const inputText = ref('')
const messageListRef = ref<HTMLDivElement | null>(null)

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

watch(() => roomStore.chatMessages.length, scrollToBottom)

function sendMessage() {
  const text = inputText.value.trim()
  if (!text) return
  props.socket?.emit('chat:send', { roomId: props.roomId, message: text })
  inputText.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="window-panel flex flex-col">
    <div class="window-titlebar px-2 h-7">
      <span>■ CHAT</span>
    </div>

    <div ref="messageListRef" class="message-list overflow-y-auto flex flex-col gap-2 p-2">
      <div
        v-for="(msg, i) in roomStore.chatMessages"
        :key="i"
        class="flex flex-col gap-0.5"
      >
        <div class="flex items-baseline justify-between gap-1">
          <span class="text-theme-accent font-terminal text-md truncate">{{ msg.userName }}</span>
          <span class="text-theme-muted font-terminal shrink-0 text-md">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <span class="text-theme font-terminal text-md break-words">{{ msg.message }}</span>
      </div>

      <div v-if="roomStore.chatMessages.length === 0" class="text-theme-muted font-terminal text-md py-1">
        No messages yet…
      </div>
    </div>

    <div class="flex gap-1 px-2 pb-2 shrink-0">
      <input
        v-model="inputText"
        class="input-field flex-1 py-1"
        placeholder="Say something…"
        maxlength="500"
        @keydown="onKeydown"
      />
      <button class="send-btn" @click="sendMessage">▶</button>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  max-height: 12rem;
  min-height: 4rem;
}

.minimize-btn {
  background: transparent;
  border: none;
  color: #fff;
  font-family: var(--font-terminal);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.send-btn {
  background-color: var(--color-accent);
  color: #fff;
  border: none;
  font-family: var(--font-pixel);
  font-size: 7px;
  cursor: pointer;
  padding: 0 8px;
  flex-shrink: 0;
  align-self: stretch;
}
.send-btn:hover {
  filter: brightness(1.15);
}
</style>
