<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAuth } from '@/composables/useAuth'

const { loading, error, signInWithGoogle, signInAsGuest } = useAuth()
const guestName = ref('')

function loginAsGuest() {
  signInAsGuest(guestName.value)
}
</script>

<template>
  <div class="login-bg min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">

    <!-- ── Animated background layer ── -->
    <div class="bg-layer" aria-hidden="true">

      <!-- Self-drawing SVG paths -->
      <svg class="bg-svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <!-- Rectangle (top-left) -->
        <path class="bg-path bg-path--1"
          d="M 55 88 L 318 88 L 318 258 L 55 258 Z"
          stroke="var(--color-accent)" stroke-width="2" fill="none"
          stroke-dasharray="3000 3000" />
        <!-- Circle (mid-right) -->
        <path class="bg-path bg-path--2"
          d="M 1050 300 m -95,0 a 95,95 0 1,0 190,0 a 95,95 0 1,0 -190,0"
          stroke="var(--color-accent-2)" stroke-width="1.5" fill="none"
          stroke-dasharray="3000 3000" />
        <!-- Wavy line (bottom) -->
        <path class="bg-path bg-path--3"
          d="M 100 690 Q 320 610 540 700 Q 760 790 980 690 Q 1180 590 1400 670"
          stroke="var(--color-accent)" stroke-width="1.5" fill="none"
          stroke-dasharray="3000 3000" />
        <!-- Arrow (top-right) -->
        <path class="bg-path bg-path--4"
          d="M 1080 170 L 1340 170 M 1282 122 L 1340 170 L 1282 218"
          stroke="var(--color-accent-2)" stroke-width="2" fill="none"
          stroke-dasharray="3000 3000" />
        <!-- Triangle (bottom-left) -->
        <path class="bg-path bg-path--5"
          d="M 160 840 L 390 590 L 620 840 Z"
          stroke="var(--color-accent-2)" stroke-width="1.5" fill="none"
          stroke-dasharray="3000 3000" />
        <!-- Tick / line group (bottom-right) -->
        <path class="bg-path bg-path--6"
          d="M 870 790 L 960 790 M 975 778 L 975 802 M 995 790 L 1100 790"
          stroke="var(--color-accent)" stroke-width="2" fill="none"
          stroke-dasharray="3000 3000" />
      </svg>

      <!-- Ghost cursors -->
      <div class="ghost-cursor ghost-cursor--alice">
        <svg class="ghost-cursor__icon" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
          <path d="M1 1 L1 13.5 L3.8 10.5 L6 17 L8.2 16.2 L5.8 9.5 L10 9.5 Z"/>
        </svg>
        <span class="ghost-cursor__label">alice</span>
      </div>

      <div class="ghost-cursor ghost-cursor--bob">
        <svg class="ghost-cursor__icon" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
          <path d="M1 1 L1 13.5 L3.8 10.5 L6 17 L8.2 16.2 L5.8 9.5 L10 9.5 Z"/>
        </svg>
        <span class="ghost-cursor__label">bob_42</span>
      </div>

      <div class="ghost-cursor ghost-cursor--mia">
        <svg class="ghost-cursor__icon" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
          <path d="M1 1 L1 13.5 L3.8 10.5 L6 17 L8.2 16.2 L5.8 9.5 L10 9.5 Z"/>
        </svg>
        <span class="ghost-cursor__label">mia</span>
      </div>

      <div class="ghost-cursor ghost-cursor--x7f">
        <svg class="ghost-cursor__icon" viewBox="0 0 12 18" fill="currentColor" aria-hidden="true">
          <path d="M1 1 L1 13.5 L3.8 10.5 L6 17 L8.2 16.2 L5.8 9.5 L10 9.5 Z"/>
        </svg>
        <span class="ghost-cursor__label">x7f2a</span>
      </div>

    </div>

    <!-- ── Main content ── -->
    <div class="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-stretch gap-10 md:gap-0">

      <!-- LEFT: Info panel -->
      <div class="flex-1 flex flex-col justify-center gap-10 md:pr-12 info-panel">

        <!-- Logo + tagline -->
        <div class="reveal reveal-1">
          <div class="font-pixel text-3xl leading-none glitch-text text-theme-accent mb-4">
            <span class="text-glow-accent">COLLA</span><span class="text-glow-accent-2 text-theme-accent-2">BOARD</span>
          </div>
          <p class="text-sm text-theme-muted leading-relaxed max-w-sm">
            A real-time collaborative canvas — draw together, play games, and tell visual stories with anyone.
          </p>
        </div>

        <!-- Feature pills -->
        <div class="reveal reveal-2">
          <p class="section-label mb-3">What you get</p>
          <div class="flex flex-wrap gap-2">
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent"></span>Live cursors</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent"></span>10+ drawing tools</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent"></span>Private rooms</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent2"></span>In-room chat</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent2"></span>Export PNG</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent2"></span>Undo / Redo</span>
            <span class="feat-pill"><span class="feat-pill__dot feat-pill__dot--accent"></span>Zoom &amp; pan</span>
          </div>
        </div>

        <!-- Game modes -->
        <div class="reveal reveal-3">
          <p class="section-label mb-3">Game modes</p>
          <div class="flex flex-col gap-2">

            <div class="mode-win">
              <div class="mode-win__bar mode-win__bar--collab">
                <span>◈ COLLABORATIVE</span>
                <span class="mode-win__badge">default</span>
              </div>
              <p class="mode-win__desc">Everyone draws on the same infinite canvas simultaneously in real time</p>
            </div>

            <div class="mode-win">
              <div class="mode-win__bar mode-win__bar--dtw">
                <span>◈ DRAW THE WORD</span>
              </div>
              <p class="mode-win__desc">Pictionary-style — host picks a word, everyone draws, players vote on the results</p>
            </div>

            <div class="mode-win">
              <div class="mode-win__bar mode-win__bar--story">
                <span>◈ COLLAB STORY</span>
              </div>
              <p class="mode-win__desc">Draw in turns — each player continues where the previous one left off to build a story</p>
            </div>

          </div>
        </div>

      </div>

      <!-- Vertical divider (desktop) -->
      <div class="vert-divider hidden md:block shrink-0"></div>

      <!-- RIGHT: Login card -->
      <div class="flex items-center justify-center md:pl-12 shrink-0 reveal reveal-4">
        <div class="login-card w-full max-w-sm">
          <div class="login-card__header">
            <span class="login-card__logo font-pixel glitch-text">
              <span class="text-glow-accent text-theme-accent">COLLA</span><span class="text-glow-accent-2 text-theme-accent-2">BOARD</span>
            </span>
          </div>

          <div class="login-card__body">
            <p class="text-xs mb-8 text-theme-muted text-center">
              Sign in to start drawing
            </p>

            <p v-if="error" class="text-xs mb-4 px-3 py-2 alert-danger">
              {{ error }}
            </p>

            <AppButton
              variant="primary"
              :loading="loading"
              class="w-full justify-center gap-3"
              @click="signInWithGoogle"
            >
              <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </AppButton>

            <div class="flex items-center gap-3 my-6">
              <div class="flex-1 h-px bg-theme-border"></div>
              <span class="text-xs text-theme-muted">or</span>
              <div class="flex-1 h-px bg-theme-border"></div>
            </div>

            <input
              v-model="guestName"
              type="text"
              class="input-field w-full mb-3"
              placeholder="Display name…"
              maxlength="50"
              @keydown.enter="loginAsGuest"
            />
            <AppButton
              variant="secondary"
              :disabled="!guestName.trim() || loading"
              :loading="loading"
              class="w-full justify-center"
              @click="loginAsGuest"
            >
              Continue as Guest
            </AppButton>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ─── Background ─────────────────────────────────────────── */
.login-bg {
  background-color: var(--color-bg);
  background-image:
    radial-gradient(ellipse 70% 55% at 20% 50%, rgba(108,99,255,0.10) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 80% 60%, rgba(0,245,212,0.07) 0%, transparent 60%),
    radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 28px 28px;
  animation: bg-drift 24s linear infinite;
}

@keyframes bg-drift {
  from { background-position: 0% 0%, 0% 0%, 0 0; }
  to   { background-position: 0% 0%, 0% 0%, 28px 28px; }
}

/* ─── Background animation layer ────────────────────────── */
.bg-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.bg-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* All paths share one animation — durations + delays create variety */
.bg-path {
  opacity: 0;
  stroke-dashoffset: 3000;
  animation: draw-and-fade linear infinite;
}

.bg-path--1 { animation-duration: 22s; animation-delay:   0s; }
.bg-path--2 { animation-duration: 20s; animation-delay:  -7s; }
.bg-path--3 { animation-duration: 28s; animation-delay: -12s; }
.bg-path--4 { animation-duration: 17s; animation-delay:  -4s; }
.bg-path--5 { animation-duration: 24s; animation-delay: -16s; }
.bg-path--6 { animation-duration: 15s; animation-delay:  -9s; }

@keyframes draw-and-fade {
  0%   { stroke-dashoffset: 3000; opacity: 0; }
  6%   { opacity: 0.13; }
  62%  { stroke-dashoffset: 0;    opacity: 0.13; }
  80%  { stroke-dashoffset: 0;    opacity: 0.13; }
  96%  { stroke-dashoffset: 0;    opacity: 0; }
  100% { stroke-dashoffset: 3000; opacity: 0; }
}

/* ─── Ghost cursors ──────────────────────────────────────── */
.ghost-cursor {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  opacity: 0.5;
}

.ghost-cursor__icon {
  width: 14px;
  height: 20px;
  filter: drop-shadow(0 0 5px currentColor);
}

.ghost-cursor__label {
  font-family: var(--font-terminal);
  font-size: 10px;
  color: currentColor;
  background-color: rgba(15, 15, 26, 0.75);
  padding: 1px 5px;
  border: 1px solid currentColor;
  white-space: nowrap;
  margin-left: 13px;
  opacity: 0.85;
}

/* Individual cursors — color, start position, animation */
.ghost-cursor--alice {
  color: #6c63ff;
  top: 20%;
  left: 6%;
  animation: ghost-alice 24s ease-in-out infinite;
}
.ghost-cursor--bob {
  color: #00f5d4;
  top: 64%;
  left: 20%;
  animation: ghost-bob 30s ease-in-out infinite;
  animation-delay: -9s;
}
.ghost-cursor--mia {
  color: #ff4d6d;
  top: 28%;
  left: 60%;
  animation: ghost-mia 26s ease-in-out infinite;
  animation-delay: -15s;
}
.ghost-cursor--x7f {
  color: #ff9d4d;
  top: 72%;
  left: 52%;
  animation: ghost-x7f 22s ease-in-out infinite;
  animation-delay: -6s;
}

/* Cursor movements — pauses simulate a real user stopping to draw */
@keyframes ghost-alice {
  0%   { transform: translate(0px,    0px); }
  12%  { transform: translate(0px,    0px); }
  28%  { transform: translate(115px,  75px); }
  40%  { transform: translate(115px,  75px); }
  54%  { transform: translate(55px,  165px); }
  64%  { transform: translate(55px,  165px); }
  78%  { transform: translate(-45px, 115px); }
  88%  { transform: translate(-45px, 115px); }
  100% { transform: translate(0px,    0px); }
}

@keyframes ghost-bob {
  0%   { transform: translate(0px,    0px); }
  10%  { transform: translate(0px,    0px); }
  26%  { transform: translate(90px,  -65px); }
  36%  { transform: translate(90px,  -65px); }
  52%  { transform: translate(170px,  25px); }
  62%  { transform: translate(170px,  25px); }
  76%  { transform: translate(50px, -110px); }
  86%  { transform: translate(50px, -110px); }
  100% { transform: translate(0px,    0px); }
}

@keyframes ghost-mia {
  0%   { transform: translate(0px,   0px); }
  14%  { transform: translate(0px,   0px); }
  30%  { transform: translate(-65px, 80px); }
  42%  { transform: translate(-65px, 80px); }
  57%  { transform: translate(25px, 145px); }
  67%  { transform: translate(25px, 145px); }
  80%  { transform: translate(-90px, 55px); }
  90%  { transform: translate(-90px, 55px); }
  100% { transform: translate(0px,   0px); }
}

@keyframes ghost-x7f {
  0%   { transform: translate(0px,    0px); }
  9%   { transform: translate(0px,    0px); }
  24%  { transform: translate(-80px, -55px); }
  34%  { transform: translate(-80px, -55px); }
  50%  { transform: translate(-155px, 35px); }
  60%  { transform: translate(-155px, 35px); }
  74%  { transform: translate(-60px,  95px); }
  84%  { transform: translate(-60px,  95px); }
  100% { transform: translate(0px,    0px); }
}

/* ─── Reveal animations ──────────────────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(12px);
  animation: reveal-in 0.5s ease forwards;
}
.reveal-1 { animation-delay: 0.05s; }
.reveal-2 { animation-delay: 0.15s; }
.reveal-3 { animation-delay: 0.25s; }
.reveal-4 { animation-delay: 0.10s; }

@keyframes reveal-in {
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Section label ──────────────────────────────────────── */
.section-label {
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--color-border) 0%, transparent 100%);
}

/* ─── Feature pills ──────────────────────────────────────── */
.feat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-family: var(--font-terminal);
  font-size: 12px;
  color: var(--color-text-muted);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  transition: border-color 150ms, color 150ms;
}
.feat-pill:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}
.feat-pill__dot {
  width: 5px;
  height: 5px;
  flex-shrink: 0;
}
.feat-pill__dot--accent  { background-color: var(--color-accent); }
.feat-pill__dot--accent2 { background-color: var(--color-accent-2); }

/* ─── Mode windows ───────────────────────────────────────── */
.mode-win {
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  transition: border-color 150ms;
}
.mode-win:hover {
  border-color: var(--color-surface-2);
}

.mode-win__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-family: var(--font-pixel);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #fff;
}
.mode-win__bar--collab {
  background-color: var(--color-accent);
  box-shadow: 0 0 14px rgba(108,99,255,0.45);
}
.mode-win__bar--dtw {
  background: linear-gradient(90deg, #6c63ff 0%, #00f5d4 140%);
  box-shadow: 0 0 14px rgba(0,245,212,0.3);
}
.mode-win__bar--story {
  background: linear-gradient(90deg, #ff4d6d 0%, #ff9d4d 130%);
  box-shadow: 0 0 14px rgba(255,77,109,0.35);
}
.mode-win__badge {
  font-size: 10px;
  letter-spacing: 0.06em;
  padding: 1px 5px;
  background-color: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.3);
}
.mode-win__desc {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* ─── Vertical divider ───────────────────────────────────── */
.vert-divider {
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--color-accent) 30%,
    var(--color-accent-2) 70%,
    transparent 100%
  );
  opacity: 0.4;
}

/* ─── Login card ─────────────────────────────────────────── */
.login-card {
  background-color: var(--color-surface);
  border: 2px solid var(--color-accent);
  box-shadow: 4px 4px 0 var(--color-accent), var(--glow-accent);
  position: relative;
  overflow: hidden;
}

.login-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    0deg,
    transparent, transparent 2px,
    rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px
  );
  animation: scanline-drift 8s linear infinite;
}

@keyframes scanline-drift {
  from { background-position: 0 0; }
  to   { background-position: 0 100px; }
}

.login-card__header {
  background-color: var(--color-surface-2);
  border-bottom: 2px solid var(--color-accent);
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card__logo { font-size: 18px; line-height: 1; }

.login-card__body {
  padding: 28px 32px 32px;
  position: relative;
  z-index: 1;
}
</style>
