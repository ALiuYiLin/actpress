<script lang="ts" setup generic="T extends DefaultTheme.NavItemWithLink">
import type { DefaultTheme } from 'vitepress/theme'
import { computed } from 'vue'
import { useData } from '../composables/data'
import { isActive } from '../../shared'
import VPLink from './VPLink.vue'

const props = defineProps<{
  item: T
  rel?: string
}>()

const { page } = useData()

const href = computed(() =>
  typeof props.item.link === 'function'
    ? props.item.link(page.value)
    : props.item.link
)

const isActiveLink = computed(() =>
  isActive(
    page.value.relativePath,
    props.item.activeMatch || href.value,
    !!props.item.activeMatch
  )
)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="VPMenuLink">
    <VPLink
      v-bind="$attrs"
      :class="{ active: isActiveLink }"
      :href
      :target="item.target"
      :rel="props.rel ?? item.rel"
      :no-icon="item.noIcon"
    >
      <span v-html="item.text"></span>
    </VPLink>
  </div>
</template>