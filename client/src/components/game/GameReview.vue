<script setup lang="ts">
// 1. Imports
import { ref, computed, watch, onUnmounted } from 'vue'
import type { Socket } from 'socket.io-client'
import type { GameSlide } from '@/types'

// 2. Props & Emits
const props = defineProps<{
  slide: GameSlide
  myUserId: string
  socket: Socket | null
  roomId: string
}>()

// 3. Reactive state
const SLIDE_DURATION_S = 5

const countdown = ref(SLIDE_DURATION_S)
const votedScore = ref<number | null>(null)
const hasVoted = ref(false)
const hoveredStar = ref<number | null>(null)

let intervalId: ReturnType<typeof setInterval> | null = null

// 4. Computed
const isOwnSlide = computed(() => props.slide.userId === props.myUserId)

const votingDisabled = computed(() => isOwnSlide.value || hasVoted.value)

const countdownBarWidth = computed(() => {
  return `${(countdown.value / SLIDE_DURATION_S) * 100}%`
})

const drawerInitial = computed(() =>
  props.slide.userName ? props.slide.userName.charAt(0).toUpperCase() : '?'
)

// 5. Functions
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

// Determine the visual state of a star at position `index` (1-based)
function starState(index: number): 'voted' | 'hovered' | 'idle' {
  if (hasVoted.value && votedScore.value !== null) {
    return index <= votedScore.value ? 'voted' : 'idle'
  }
  if (hoveredStar.value !== null && !votingDisabled.value) {
    return index <= hoveredStar.value ? 'hovered' : 'idle'
  }
  return 'idle'
}

// 6. Lifecycle hooks
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

    <!-- ══════════════════════════════════════════════════
         HEADER — titlebar + countdown bar
    ═══════════════════════════════════════════════════ -->
    <header class="review-header flex flex-col" aria-label="Review header">

      <!-- Titlebar row -->
      <div class="window-titlebar review-titlebar px-3">
        <!-- Left: mode label -->
        <span class="font-pixel text-sm tracking-widest text-white">
          &#9632; REVIEW
        </span>

        <!-- Center: slide counter -->
        <span
          class="font-terminal text-sm text-white/80"
          :aria-label="`Slide ${slide.slideIndex + 1} of ${slide.total}`"
        >
          {{ slide.slideIndex + 1 }}&nbsp;/&nbsp;{{ slide.total }}
        </span>

        <!-- Right: countdown number -->
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

      <!-- Countdown bar — full width strip below titlebar -->
      <div class="review-countdown-track" aria-hidden="true">
        <div
          class="review-countdown-fill"
          :style="{ width: countdownBarWidth }"
          :class="countdown <= 2 ? 'review-countdown-fill--danger' : ''"
        />
      </div>
    </header>

    <!-- ══════════════════════════════════════════════════
         DRAWING AREA — player identity + canvas image
    ═══════════════════════════════════════════════════ -->
    <section class="review-canvas-section flex flex-col flex-1 items-center justify-center gap-3 px-4 py-4 min-h-0">

      <!-- Player identity row -->
      <div class="flex items-center gap-3" role="group" :aria-label="`Drawing by ${slide.userName}`">
        <!-- Avatar -->
        <div
          class="review-avatar avatar-pixel flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          <span class="font-pixel text-sm text-white select-none">{{ drawerInitial }}</span>
        </div>

        <!-- Player name -->
        <span class="font-pixel text-base text-theme tracking-wide">
          {{ slide.userName }}
        </span>

        <!-- YOU badge -->
        <span v-if="isOwnSlide" class="badge-you" aria-label="This is your drawing">
          YOU
        </span>
      </div>

      <!-- Drawing frame — fills remaining vertical space -->
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

    <!-- ══════════════════════════════════════════════════
         VOTING FOOTER
    ═══════════════════════════════════════════════════ -->
    <footer class="review-footer bg-theme-surface flex flex-col items-center gap-2 px-4 py-3" role="group" aria-label="Rate this drawing">

      <!-- Label -->
      <span class="font-pixel text-xs tracking-widest text-theme-muted">
        RATE THIS DRAWING
      </span>

      <!-- Star row -->
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

      <!-- Status message -->
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
/* ── Root layout ── */
.review-root {
  width: 100%;
  height: 100%;
}

/* ── Header / titlebar ── */
.review-titlebar {
  height: 32px;
  flex-shrink: 0;
}

/* ── Countdown bar ── */
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
  /* Only the bar width animates — 1 second linear to stay in sync with the integer countdown */
  transition: width 1s linear;
}

.review-countdown-fill--danger {
  background-color: var(--color-danger);
  box-shadow: 0 0 6px rgba(255, 77, 109, 0.7);
}

.countdown-number {
  /* min-width prevents layout shift as digits change */
  min-width: 2.5ch;
  text-align: right;
}

/* ── Drawing section ── */
.review-canvas-section {
  /* flex-1 + min-h-0 lets it shrink correctly in a flex column */
}

/* Avatar — fixed 40x40, pixel border via avatar-pixel class */
.review-avatar {
  width: 40px;
  height: 40px;
  background-color: var(--color-surface-2);
  flex-shrink: 0;
}

/* Drawing frame — window-panel provides surface bg + accent border + pixel shadow */
.review-drawing-frame {
  /* window-panel already sets bg, border, box-shadow */
  /* Override the pseudo-element scanline so it doesn't cover the image */
  position: relative;
}

/* Suppress the scanline overlay on the drawing frame specifically */
.review-drawing-frame::after {
  display: none;
}

.review-drawing-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Pixel rendering — keeps crisp edges for canvas drawings */
  image-rendering: pixelated;
}

/* ── Voting footer ── */
.review-footer {
  flex-shrink: 0;
  border-top: 2px solid var(--color-border);
}

.review-footer-status {
  height: 1.25rem; /* reserve space to prevent layout shift */
  display: flex;
  align-items: center;
}

/* ── Star buttons ── */
.review-star-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 44x44 minimum touch target */
  width: 44px;
  height: 44px;
  font-size: 28px;
  line-height: 1;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  /* No transform on hover — pixel aesthetic */
  transition: none;
  /* Focus ring */
  outline: none;
}

.review-star-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Idle state — dimmed, unlit */
.review-star--idle {
  color: var(--color-text-muted);
  opacity: 0.35;
}

/* Hovered state (before vote) — accent purple brightness boost */
.review-star--hovered {
  color: var(--color-accent);
  opacity: 1;
  filter: brightness(1.3);
  text-shadow: 0 0 6px rgba(108, 99, 255, 0.6);
}

/* Voted state — teal glow */
.review-star--voted {
  color: var(--color-accent-2);
  opacity: 1;
  text-shadow: 0 0 8px rgba(0, 245, 212, 0.8), 0 0 20px rgba(0, 245, 212, 0.4);
}

/* Disabled cursor when voting is locked */
.review-star--disabled {
  cursor: default;
}

/* ── Responsive: compact footer on very small screens ── */
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
    /* On mobile, let the frame be slightly less tall to keep footer visible */
    max-height: 55dvh;
  }
}
</style>
