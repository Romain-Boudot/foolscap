<script setup lang="ts">
defineProps<{ active?: boolean }>();
</script>

<template>
  <span class="autopaste-icon">
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
      />
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    </svg>
    <span v-if="active" class="rec-badge" aria-hidden="true" />
  </span>
</template>

<style scoped>
.autopaste-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.rec-badge {
  position: absolute;
  top: -1px;
  right: -2px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff5e5e;
  box-shadow: 0 0 5px rgba(255, 94, 94, 0.7);
  animation: rec-pulse 1.6s ease-in-out infinite;
}

@keyframes rec-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
