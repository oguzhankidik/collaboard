<script setup lang="ts">
import AppButton from '@/components/ui/AppButton.vue'
import { useAuth } from '@/composables/useAuth'

const { loading, error, signInWithGoogle } = useAuth()
</script>

<template>
  <div class="login-bg min-h-screen flex items-center justify-center">
    <div class="card neon-accent w-full max-w-sm px-8 py-10 text-center">
      <!-- Pixel logo -->
      <div class="font-pixel text-base mb-6 leading-loose glitch-text" style="color: var(--color-accent)">
        <span class="text-glow-accent">COLLA</span><span class="text-glow-accent-2" style="color: var(--color-accent-2)">BOARD</span>
      </div>
      <p class="text-xs mb-8" style="color: var(--color-text-muted)">
        Real-time collaborative whiteboard
      </p>

      <p
        v-if="error"
        class="text-xs mb-4 px-3 py-2"
        style="color: var(--color-danger); background-color: rgba(255,77,109,0.1); border: 2px solid rgba(255,77,109,0.3)"
      >
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
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  background-color: var(--color-bg);
  background-image:
    radial-gradient(ellipse 60% 40% at 50% 50%, rgba(108,99,255,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 40% 30% at 75% 65%, rgba(0,245,212,0.07) 0%, transparent 55%),
    radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 24px 24px;
  animation: bg-drift 20s linear infinite;
}

@keyframes bg-drift {
  from { background-position: 0% 0%, 0% 0%, 0 0; }
  to   { background-position: 0% 0%, 0% 0%, 24px 24px; }
}
</style>
