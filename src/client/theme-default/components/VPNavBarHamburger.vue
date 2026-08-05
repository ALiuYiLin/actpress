<script lang="ts" setup>
defineProps<{
  active: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    type="button"
    class="VPNavBarHamburger"
    :class="{ active }"
    aria-label="mobile navigation"
    :aria-expanded="active"
    aria-controls="VPNavScreen"
    @click="$emit('click')"
  >
    <span class="container">
      <span class="top" />
      <span class="middle" />
      <span class="bottom" />
    </span>
  </button>
</template>