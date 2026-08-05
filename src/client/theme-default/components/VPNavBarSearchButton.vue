<script lang="ts" setup>
defineProps<{
  text: string
}>()
</script>

<template>
  <button type="button" class="VPNavBarSearchButton">
    <span class="vpi-search" aria-hidden="true"></span>
    <span class="text">{{ text }}</span>
    <span class="keys" aria-hidden="true">
      <kbd class="key-cmd">&#x2318;</kbd>
      <kbd class="key-ctrl">Ctrl</kbd>
      <kbd>K</kbd>
    </span>
  </button>
</template>