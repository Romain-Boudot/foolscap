<script setup lang="ts">
defineProps<{ filled?: boolean }>();
</script>

<template>
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    :fill-opacity="filled ? 0.18 : 0"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Main window outline (clipped at the bottom-right where the
         floating PiP rectangle overlaps). -->
    <path d="M21 9V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7" />
    <!-- Floating "always-on-top" rectangle. -->
    <rect width="10" height="7" x="12" y="13" rx="2" />
  </svg>
</template>
