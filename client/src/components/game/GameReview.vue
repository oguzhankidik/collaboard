<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Socket } from 'socket.io-client'
import type { GameSlide } from '@/types'

const props = defineProps<{
  slide: GameSlide
  myUserId: string
  socket: Socket | null
  roomId: string
}>()

const SLIDE_DURATION_S = 5

const countdown = ref(SLIDE_DURATION_S)
const votedScore = ref<number | null>(null)
const hasVoted = ref(false)
const hoveredStar = ref<number | null>(null)

let intervalId: ReturnType<typeof setInterval> | null = null

const isOwnSlide = computed(() => props.slide.userId === props.myUserId)

const votingDisabled = computed(() => isOwnSlide.value || hasVoted.value)

const countdownBarWidth = computed(() => {
  return `${(countdown.value / SLIDE_DURATION_S) * 100}%`
})

const drawerInitial = computed(() =>
  props.slide.userName ? props.slide.userName.charAt(0).toUpperCase() : '?'
)

function startCountdown(): void {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
  countdown.value = SLIDE_DURATION_S

  intervalId = setInterval(() => {
    if (countdown.value <= 1) {
      countdown.value = 0
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    } else {
      countdown.value -= 1
    }
  }, 1000)
}

function resetVoteState(): void {
  votedScore.value = null
  hasVoted.value = false
  hoveredStar.value = null
}

function handleStarClick(score: number): void {
  if (votingDisabled.value) return
  votedScore.value = score
  hasVoted.value = true
  hoveredStar.value = null
  props.socket?.emit('game:vote', {
    roomId: props.roomId,
    targetUserId: props.slide.userId,
    score,
  })
}

function handleStarMouseEnter(index: number): void {
  if (votingDisabled.value) return
  hoveredStar.value = index
}

function handleStarMouseLeave(): void {
  hoveredStar.value = null
}

function starState(index: number): 'voted' | 'hovered' | 'idle' {
  if (hasVoted.value && votedScore.value !== null) {
    return index <= votedScore.value ? 'voted' : 'idle'
  }
  if (hoveredStar.value !== null && !votingDisabled.value) {
    return index <= hoveredStar.value ? 'hovered' : 'idle'
  }
  return 'idle'
}

watch(
  () => props.slide.slideIndex,
  () => {
    resetVoteState()
    startCountdown()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<template>
  <div class="review-root bg-theme-bg flex flex-col" role="region" aria-label="Game review">

    <header class="review-header flex flex-col" aria-label="Review header">

      <div class="window-titlebar review-titlebar px-3">
        <span class="font-pixel text-sm tracking-widest text-white">
          &#9632; REVIEW
        </span>

        <span
          class="font-terminal text-sm text-white/80"
          :aria-label="`Slide ${slide.slideIndex + 1} of ${slide.total}`"
        >
          {{ slide.slideIndex + 1 }}&nbsp;/&nbsp;{{ slide.total }}
        </span>

        <span
          class="font-pixel text-sm countdown-number"
          :class="countdown <= 2 ? 'text-theme-danger' : 'text-theme-accent-2'"
          aria-live="polite"
          aria-atomic="true"
          :aria-label="`${countdown} seconds remaining`"
        >
          {{ countdown }}s
        </span>
      </div>

      <div class="review-countdown-track" aria-hidden="true">
        <div
          class="review-countdown-fill"
          :style="{ width: countdownBarWidth }"
          :class="countdown <= 2 ? 'review-countdown-fill--danger' : ''"
        />
      </div>
    </header>

    <section class="review-canvas-section flex flex-col flex-1 items-center justify-center gap-3 px-4 py-4 min-h-0">

      <div class="flex items-center gap-3" role="group" :aria-label="`Drawing by ${slide.userName}`">
        <div
          class="review-avatar avatar-pixel flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span class="font-pixel text-sm text-white select-none">{{ drawerInitial }}</span>
        </div>

        <span class="font-pixel text-base text-theme tracking-wide">
          {{ slide.userName }}
        </span>

        <span v-if="isOwnSlide" class="badge-you" aria-label="This is your drawing">
          YOU
        </span>
      </div>

      <div class="review-drawing-frame window-panel flex items-center justify-center w-full flex-1 min-h-0 overflow-hidden">
        <img
          v-if="slide.canvasData"
          :src="slide.canvasData"
          alt="Drawing by the player"
          class="review-drawing-img"
          draggable="false"
        />
        <span v-else class="font-terminal text-sm text-theme-muted" aria-hidden="true">
          No drawing available
        </span>
      </div>
    </section>

    <footer class="review-footer bg-theme-surface flex flex-col items-center gap-2 px-4 py-3" role="group" aria-label="Rate this drawing">

      <span class="font-pixel text-xs tracking-widest text-theme-muted">
        RATE THIS DRAWING
      </span>

      <div
        class="flex items-center gap-1"
        role="radiogroup"
        aria-label="Star rating"
        @mouseleave="handleStarMouseLeave"
      >
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="review-star-btn"
          :class="{
            'review-star--voted':   starState(i) === 'voted',
            'review-star--hovered': starState(i) === 'hovered',
            'review-star--idle':    starState(i) === 'idle',
            'review-star--disabled': votingDisabled,
          }"
          :disabled="votingDisabled"
          :aria-label="`Rate ${i} out of 5 stars`"
          :aria-pressed="hasVoted && votedScore === i"
          @click="handleStarClick(i)"
          @mouseenter="handleStarMouseEnter(i)"
        >
          &#9733;
        </button>
      </div>

      <div class="review-footer-status font-terminal text-xs" aria-live="polite" aria-atomic="true">
        <span v-if="isOwnSlide" class="text-theme-muted">
          YOUR DRAWING
        </span>
        <span v-else-if="hasVoted" class="text-theme-accent-2 text-glow-accent-2">
          &#10003; Vote submitted
        </span>
        <span v-else class="text-theme-muted">
          &nbsp;
        </span>
      </div>
    </footer>

  </div>
</template>

<style scoped>
.review-root {
  width: 100%;
  height: 100%;
}

.review-titlebar {
  height: 32px;
  flex-shrink: 0;
}

.review-countdown-track {
  height: 4px;
  background-color: var(--color-surface-2);
  flex-shrink: 0;
  overflow: hidden;
}

.review-countdown-fill {
  height: 100%;
  background-color: var(--color-accent-2);
  box-shadow: 0 0 6px rgba(0, 245, 212, 0.7);
  transition: width 1s linear;
}

.review-countdown-fill--danger {
  background-color: var(--color-danger);
  box-shadow: 0 0 6px rgba(255, 77, 109, 0.7);
}

.countdown-number {
  min-width: 2.5ch;
  text-align: right;
}

.review-canvas-section {
}

.review-avatar {
  width: 40px;
  height: 40px;
  background-color: var(--color-surface-2);
  flex-shrink: 0;
}

.review-drawing-frame {
  position: relative;
}

.review-drawing-frame::after {
  display: none;
}

.review-drawing-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: auto;
}

.review-footer {
  flex-shrink: 0;
  border: 2px solid var(--color-border);
  border-bottom: none;
}

.review-footer-status {
  height: 1.25rem;
  display: flex;
  align-items: center;
}

.review-star-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 28px;
  line-height: 1;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: none;
  outline: none;
}

.review-star-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.review-star--idle {
  color: var(--color-text-muted);
  opacity: 0.35;
}

.review-star--hovered {
  color: var(--color-accent);
  opacity: 1;
  filter: brightness(1.3);
  text-shadow: 0 0 6px rgba(108, 99, 255, 0.6);
}

.review-star--voted {
  color: var(--color-accent-2);
  opacity: 1;
  text-shadow: 0 0 8px rgba(0, 245, 212, 0.8), 0 0 20px rgba(0, 245, 212, 0.4);
}

.review-star--disabled {
  cursor: default;
}

@media (max-height: 500px) {
  .review-canvas-section {
    gap: 2px;
    padding-top: 6px;
    padding-bottom: 6px;
  }

  .review-footer {
    padding-top: 6px;
    padding-bottom: 6px;
    gap: 2px;
  }

  .review-star-btn {
    width: 36px;
    height: 36px;
    font-size: 22px;
  }
}

@media (max-width: 480px) {
  .review-drawing-frame {
      max-height: 55dvh;
  }
}
</style>
