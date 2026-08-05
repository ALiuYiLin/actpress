<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import VPSidebarItem from './VPSidebarItem.vue'

defineProps<{
  items: DefaultTheme.SidebarItem[]
}>()

const disableTransition = ref(true)

let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timer = setTimeout(() => {
    timer = null
    disableTransition.value = false
  }, 300)
})

onBeforeUnmount(() => {
  if (timer != null) {
    clearTimeout(timer)
    timer = null
  }
})
</script>

<template>
  <div
    v-for="item in items"
    :key="item.text"
    class="group"
    :class="{ 'no-transition': disableTransition }"
  >
    <VPSidebarItem :item :depth="0" />
  </div>
</template>