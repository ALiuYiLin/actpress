<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'

defineProps<{
  headers: DefaultTheme.OutlineItem[]
  root?: boolean
}>()
</script>

<template>
  <ul class="VPDocOutlineItem" :class="root ? 'root' : 'nested'">
    <li v-for="{ children, link, title } in headers">
      <a class="outline-link" :href="link" :title>
        {{ title }}
      </a>
      <template v-if="children?.length">
        <VPDocOutlineItem :headers="children" />
      </template>
    </li>
  </ul>
</template>