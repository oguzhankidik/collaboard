<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  disabled?: boolean
}>()
</script>

<template>
  <button
    class="btn"
    :class="{
      'btn-primary': variant === 'primary' || !variant,
      'btn-secondary': variant === 'secondary',
      'btn-danger': variant === 'danger',
    }"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <svg v-if="loading" class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
      <path class="opacity-75" fill="currentColor" stroke-linecap="square" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
    <slot />
  </button>
</template>
