<script lang="ts" setup generic="T extends DefaultTheme.NavItem">
import type { DefaultTheme } from 'vitepress/theme'
import VPMenuLink from './VPMenuLink.vue'
import VPMenuGroup from './VPMenuGroup.vue'

defineProps<{
  items?: T[]
}>()
</script>

<template>
  <div class="VPMenu">
    <div v-if="items" class="items">
      <template v-for="item in items" :key="JSON.stringify(item)">
        <VPMenuLink v-if="'link' in item" :item />
        <component
          v-else-if="'component' in item"
          :is="item.component"
          v-bind="item.props"
        />
        <VPMenuGroup v-else :text="item.text" :items="item.items" />
      </template>
    </div>

    <slot />
  </div>
</template>