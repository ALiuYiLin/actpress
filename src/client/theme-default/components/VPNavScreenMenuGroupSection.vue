<script lang="ts" setup>
import type { DefaultTheme } from 'vitepress/theme'
import VPNavScreenMenuGroupLink from './VPNavScreenMenuGroupLink.vue'

defineProps<{
  text?: string
  items: DefaultTheme.NavItemWithLink[]
}>()
</script>

<template>
  <div class="VPNavScreenMenuGroupSection">
    <p v-if="text" class="title">{{ text }}</p>
    <VPNavScreenMenuGroupLink v-for="item in items" :key="item.text" :item />
  </div>
</template>