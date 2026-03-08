<script setup lang="ts">
// 1. Imports
import { computed } from 'vue'
import type { Socket } from 'socket.io-client'
import type { PlayerScore } from '@/types'

// 2. Props & Emits
const props = defineProps<{
  scores: PlayerScore[]
  myUserId: string
  isOwner: boolean
  socket: Socket | null
  roomId: string
}>()

const emit = defineEmits<{
  leave: []
}>()

// 3. Store & Composables — none needed

// 4. Reactive state / Computed
const avgScoreMap = computed<Map<string, string>>(() => {
  const map = new Map<string, string>()
  for (const entry of props.scores) {
    const avg =
      entry.voteCount > 0
        ? (entry.totalScore / entry.voteCount).toFixed(1)
        : '—'
    map.set(entry.userId, avg)
  }
  return map
})

// Returns the CSS modifier class for a given 1-based rank position
function rankClass(index: number): string {
  if (index === 1) return 'rank-row--gold'
  if (index === 2) return 'rank-row--silver'
  if (index === 3) return 'rank-row--bronze'
  return 'rank-row--other'
}

// Returns the rank medal text (unicode symbol + number)
function rankMedal(index: number): string {
  if (index === 1) return '\u25C6 1'  // ◆
  if (index === 2) return '\u25A0 2'  // ■
  if (index === 3) return '\u25B2 3'  // ▲
  return String(index) + '.'
}

// 5. Functions
function handlePlayAgain(): void {
  props.socket?.emit('room:stop', props.roomId)
}

function handleLeave(): void {
  emit('leave')
}
</script>

<template>
  <div class="lb-root bg-theme-bg flex flex-col" role="region" aria-label="Game leaderboard">

    <!-- ══════════════════════════════════════════════════
         TITLEBAR
    ═══════════════════════════════════════════════════ -->
    <div class="window-titlebar lb-titlebar px-3" role="banner">
      <span class="font-pixel text-sm tracking-widest text-white">
        &#9632; RESULTS
      </span>
      <span class="font-pixel text-sm tracking-widest text-white/70">
        &#9670; DRAW WORD
      </span>
    </div>

    <!-- ══════════════════════════════════════════════════
         GAME OVER HEADING
    ═══════════════════════════════════════════════════ -->
    <div class="lb-heading flex flex-col items-center justify-center gap-2 px-4 py-6" role="heading" aria-level="1">
      <span
        class="font-pixel lb-gameover-text text-theme-accent-2 text-glow-accent-2 glitch-text select-none"
        aria-hidden="true"
      >
        GAME OVER
      </span>
      <!-- Screen-reader accessible heading -->
      <span class="sr-only">Game Over — Results Screen</span>
      <p class="font-terminal text-sm text-theme-muted tracking-wide">
        "Draw the Word" complete!
      </p>
    </div>

    <!-- Divider -->
    <div class="lb-divider" aria-hidden="true"></div>

    <!-- ══════════════════════════════════════════════════
         SCORES LIST
    ═══════════════════════════════════════════════════ -->
    <section
      class="lb-scores-list flex flex-col gap-2 px-4 py-4 overflow-y-auto flex-1 min-h-0"
      aria-label="Player rankings"
    >

      <!-- Empty state -->
      <div
        v-if="scores.length === 0"
        class="flex items-center justify-center h-full py-12"
        aria-live="polite"
      >
        <span class="font-terminal text-sm text-theme-muted">No results yet.</span>
      </div>

      <!-- Rank rows -->
      <div
        v-for="(entry, index) in scores"
        :key="entry.userId"
        class="rank-row"
        :class="[
          rankClass(index + 1),
          entry.userId === myUserId ? 'rank-row--you' : '',
        ]"
        role="listitem"
        :aria-label="`Rank ${index + 1}: ${entry.userName}, score ${avgScoreMap.get(entry.userId)}`"
      >

        <!-- ── Rank medal ── -->
        <span
          class="rank-medal font-pixel text-sm select-none shrink-0"
          :class="{
            'text-theme-accent-2 text-glow-accent-2': index === 0,
            'text-theme-accent':                      index === 1,
            'text-theme-muted':                       index === 2,
            'text-theme-muted':                       index >= 3,
          }"
          aria-hidden="true"
        >{{ rankMedal(index + 1) }}</span>

        <!-- ── Player name + YOU badge ── -->
        <div class="rank-name-group flex items-center gap-2 flex-1 min-w-0">
          <span class="font-pixel text-sm text-theme truncate">{{ entry.userName }}</span>
          <span v-if="entry.userId === myUserId" class="badge-you shrink-0" aria-label="This is you">
            YOU
          </span>
        </div>

        <!-- ── Score block ── -->
        <div class="rank-score-group flex flex-col items-end shrink-0">
          <!-- Average score — prominent -->
          <span
            class="font-pixel text-base rank-avg-score"
            :class="{
              'text-theme-accent-2 text-glow-accent-2': index === 0,
              'text-theme-accent text-glow-accent':     index === 1,
              'text-theme':                              index >= 2,
            }"
          >
            &#9733; {{ avgScoreMap.get(entry.userId) }}
          </span>
          <!-- Total pts + vote count — muted detail -->
          <span class="font-terminal text-xs text-theme-muted">
            ({{ entry.totalScore }} pts, {{ entry.voteCount }}v)
          </span>
        </div>

      </div>
    </section>

    <!-- Divider -->
    <div class="lb-divider" aria-hidden="true"></div>

    <!-- ══════════════════════════════════════════════════
         ACTION FOOTER — sticky at bottom
    ═══════════════════════════════════════════════════ -->
    <footer
      class="lb-footer bg-theme-surface flex items-center gap-3 px-4 py-3"
      role="group"
      aria-label="Session actions"
    >
      <!-- Leave Room — always visible -->
      <button
        type="button"
        class="btn btn-secondary"
        @click="handleLeave"
        aria-label="Leave the room and return to home"
      >
        Leave Room
      </button>

      <!-- Spacer -->
      <div class="flex-1" aria-hidden="true"></div>

      <!-- Play Again — host only -->
      <button
        v-if="isOwner"
        type="button"
        class="btn btn-primary lb-play-again-btn"
        @click="handlePlayAgain"
        aria-label="Play again — restarts the room to the lobby"
      >
        &#9654; Play Again
      </button>
    </footer>

  </div>
</template>

<style scoped>
/* ── Root ── */
.lb-root {
  width: 100%;
  height: 100%;
}

/* ── Titlebar ── */
.lb-titlebar {
  height: 32px;
  flex-shrink: 0;
}

/* ── Game Over heading ── */
.lb-heading {
  flex-shrink: 0;
}

.lb-gameover-text {
  font-size: clamp(2rem, 6vw, 3.5rem);
  line-height: 1;
  letter-spacing: 0.12em;
}

/* ── Horizontal rule ── */
.lb-divider {
  height: 2px;
  background-color: var(--color-border);
  flex-shrink: 0;
}

/* ── Scores list ── */
.lb-scores-list {
  /* flex-1 + overflow-y-auto allows scroll on many players */
}

/* ── Rank row base ── */
.rank-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  /* pixel shadow */
  box-shadow: 2px 2px 0 var(--color-border);
  position: relative;
  /* left accent strip placeholder — overridden per rank */
  border-left-width: 4px;
}

/* ── Gold (rank 1) — teal accent ── */
.rank-row--gold {
  border-color: var(--color-accent-2);
  border-left-color: var(--color-accent-2);
  box-shadow: 2px 2px 0 var(--color-accent-2), 0 0 12px rgba(0, 245, 212, 0.15);
  background-color: rgba(0, 245, 212, 0.04);
}

/* ── Silver (rank 2) — purple accent ── */
.rank-row--silver {
  border-color: var(--color-accent);
  border-left-color: var(--color-accent);
  box-shadow: 2px 2px 0 var(--color-accent), 0 0 10px rgba(108, 99, 255, 0.12);
  background-color: rgba(108, 99, 255, 0.04);
}

/* ── Bronze (rank 3) — muted border, slightly elevated ── */
.rank-row--bronze {
  border-color: var(--color-text-muted);
  border-left-color: var(--color-text-muted);
  box-shadow: 2px 2px 0 var(--color-text-muted);
}

/* ── Other ranks (4+) ── */
.rank-row--other {
  border-color: var(--color-border);
  border-left-color: var(--color-border);
  opacity: 0.8;
}

/* ── YOU modifier — adds a secondary left-border highlight ── */
.rank-row--you {
  /* Reinforce the left edge regardless of rank */
  border-left-color: var(--color-accent-2) !important;
  /* Subtle highlight background tint */
  background-color: rgba(0, 245, 212, 0.06) !important;
}

/* ── Rank medal column — fixed min-width so names align ── */
.rank-medal {
  min-width: 3.5ch;
  text-align: left;
}

/* ── Score group — right-aligned column ── */
.rank-score-group {
  gap: 2px;
}

.rank-avg-score {
  line-height: 1.2;
}

/* ── Footer ── */
.lb-footer {
  flex-shrink: 0;
  border-top: 2px solid var(--color-border);
}

/* Play Again button — minimum 44px height for touch target */
.lb-play-again-btn {
  min-height: 44px;
}

/* ── Screen-reader only utility ── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* ── Responsive: tighter layout on small screens ── */
@media (max-width: 480px) {
  .lb-gameover-text {
    font-size: 2rem;
    letter-spacing: 0.08em;
  }

  .lb-heading {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

  .rank-row {
    padding: 8px 10px;
    gap: 8px;
  }

  .lb-footer {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* ── Compact mode for very short viewports ── */
@media (max-height: 500px) {
  .lb-heading {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    gap: 4px;
  }

  .lb-gameover-text {
    font-size: 1.75rem;
  }

  .lb-scores-list {
    padding-top: 8px;
    padding-bottom: 8px;
    gap: 4px;
  }
}
</style>
