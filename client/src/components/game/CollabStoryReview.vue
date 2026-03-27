<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import type { Socket } from 'socket.io-client'
import type { StoryBoard } from '@/types'
import ChatPanel from '@/components/chat/ChatPanel.vue'

const props = defineProps<{
  boards: StoryBoard[]
  socket: Socket | null
  roomId: string
  myUserId: string
  isOwner: boolean
}>()

const emit = defineEmits<{
  leave: []
}>()

const currentBoardIdx = ref(0)
const visibleTurns = ref(1)
const scrollContainer = ref<HTMLElement | null>(null)

let intervalId: ReturnType<typeof setInterval> | null = null

async function scrollToLatest(): Promise<void> {
  await nextTick()
  scrollContainer.value?.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' })
}

onMounted(() => {
  if (!props.boards.length) return
  intervalId = setInterval(() => {
    const board = props.boards[currentBoardIdx.value]
    if (!board) return
    if (visibleTurns.value < board.turns.length) {
      visibleTurns.value++
      scrollToLatest()
    } else if (currentBoardIdx.value < props.boards.length - 1) {
      currentBoardIdx.value++
      visibleTurns.value = 1
      scrollToLatest()
    } else {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
  }, 2000)
})

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
})

function handleLeave(): void {
  emit('leave')
}

function handlePlayAgain(): void {
  props.socket?.emit('room:stop', props.roomId)
}
</script>

<template>
  <div class="csr-root bg-theme-bg">
    <div class="window-titlebar csr-titlebar px-3">
      <span class="font-pixel text-sm tracking-widest text-white">◈ STORY COMPLETE</span>
      <span class="font-pixel text-sm tracking-widest text-white/70">COLLAB STORY</span>
    </div>

    <div class="csr-body flex flex-1 min-h-0">
      <div class="csr-left flex flex-col min-h-0 overflow-hidden">
        <div ref="scrollContainer" class="csr-left-content flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          <div
            v-for="(board, bIdx) in boards.slice(0, currentBoardIdx + 1)"
            :key="board.originUserId"
            class="csr-board-section"
          >
            <div class="csr-board-header flex items-center gap-2 px-3 py-2 mb-2">
              <span class="font-pixel text-[10px] text-theme-accent tracking-widest">◈</span>
              <span class="font-terminal text-sm text-theme">
                {{ board.originUserId === myUserId ? 'Your Story' : board.originUserName + "'s Story" }}
              </span>
            </div>

            <div class="csr-turns-col">
              <template
                v-for="(turn, tIdx) in board.turns.slice(0, bIdx === currentBoardIdx ? visibleTurns : board.turns.length)"
                :key="turn.turnIndex"
              >
                <div v-if="tIdx > 0" class="csr-turn-connector">↓</div>
                <Transition
                  appear
                  enter-active-class="transition-opacity duration-500"
                  enter-from-class="opacity-0"
                  enter-to-class="opacity-100"
                >
                  <div class="csr-turn-card">
                    <div class="csr-turn-card-header flex items-center gap-2 px-3 py-2">
                      <span class="font-pixel text-[9px] text-theme-muted tracking-widest">STEP {{ tIdx + 1 }}</span>
                      <span class="font-terminal text-xs text-theme truncate">{{ turn.userName }}</span>
                      <span v-if="turn.userId === myUserId" class="badge-you ml-1">YOU</span>
                      <span
                        v-if="tIdx === board.turns.length - 1 && (bIdx < currentBoardIdx || visibleTurns >= board.turns.length)"
                        class="font-pixel text-[8px] text-theme-accent-2 text-glow-accent-2 tracking-widest ml-auto flex-shrink-0"
                      >◆ FINAL</span>
                    </div>
                    <div class="csr-turn-card-canvas p-3">
                      <img
                        v-if="turn.canvasData"
                        :src="turn.canvasData"
                        :alt="`Round ${turn.turnIndex + 1} by ${turn.userName}`"
                        class="csr-canvas-img"
                      />
                      <span v-else class="font-terminal text-xs text-theme-muted">No drawing</span>
                    </div>
                  </div>
                </Transition>
              </template>
            </div>
          </div>

          <div v-if="boards.length === 0" class="flex items-center justify-center py-12">
            <span class="font-terminal text-sm text-theme-muted">No boards recorded.</span>
          </div>
        </div>
      </div>

      <div class="csr-col-divider" />

      <div class="csr-right flex flex-col min-h-0">
        <ChatPanel :socket="socket" :room-id="roomId" class="h-full" />
      </div>
    </div>

    <div class="csr-footer flex items-center gap-3 px-4 py-3">
      <button type="button" class="btn btn-secondary" @click="handleLeave">
        Leave Room
      </button>
      <div class="flex-1" />
      <button
        v-if="isOwner"
        type="button"
        class="btn btn-primary"
        @click="handlePlayAgain"
      >
        ▶ Play Again
      </button>
    </div>
  </div>
</template>

<style scoped>
.csr-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.csr-titlebar {
  height: 32px;
  flex-shrink: 0;
}

.csr-body {
  overflow: hidden;
  flex: 1;
}

.csr-left {
  flex: 1;
  min-width: 0;
}

.csr-left-content {
  min-height: 0;
}

.csr-col-divider {
  width: 2px;
  background-color: var(--color-border);
  flex-shrink: 0;
}

.csr-right {
  width: 280px;
  flex-shrink: 0;
  background-color: var(--color-surface);
}

.csr-board-section {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
}

.csr-board-header {
  background-color: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
}

.csr-turns-col {
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0.75rem;
}

.csr-turn-connector {
  text-align: center;
  color: var(--color-border);
  font-size: 20px;
  line-height: 1;
  padding: 4px 0;
}

.csr-turn-card {
  background-color: var(--color-bg);
  border: 2px solid var(--color-border);
  box-shadow: 2px 2px 0 var(--color-border);
}

.csr-turn-card-header {
  background-color: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
}

.csr-canvas-img {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  image-rendering: auto;
  border: 1px solid var(--color-border);
  display: block;
}

.csr-footer {
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  border-bottom: none;
  background-color: var(--color-surface);
}

@media (max-width: 600px) {
  .csr-right {
    display: none;
  }

  .csr-col-divider {
    display: none;
  }
}
</style>
