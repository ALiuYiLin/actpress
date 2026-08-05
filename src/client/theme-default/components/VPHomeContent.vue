<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'

const { width: vw } = useWindowSize({
  initialWidth: 0,
  includeScrollbar: false
})
</script>

<template>
  <div
    class="vp-doc container"
    :style="vw ? { '--vp-offset': `calc(50% - ${vw / 2}px)` } : {}"
  >
    <slot />
  </div>
</template>