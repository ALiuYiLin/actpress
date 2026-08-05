<script lang="ts" setup generic="T extends (DefaultTheme.NavItemComponent | DefaultTheme.NavItemChildren | DefaultTheme.NavItemWithLink)">
import type { DefaultTheme } from 'vitepress/theme'
import VPMenuLink from './VPMenuLink.vue'

defineProps<{
  text?: string
  items: T[]
}>()
</script>

<template>
  <div class="VPMenuGroup">
    <p v-if="text" class="title">{{ text }}</p>

    <template v-for="item in items" :key="JSON.stringify(item)">
      <VPMenuLink v-if="'link' in item" :item />
    </template>
  </div>
</template>