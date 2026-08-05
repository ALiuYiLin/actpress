<script lang="ts" setup>
import type { DefaultTheme } from 'vitepress/theme'
import { computed } from 'vue'
import { useData } from '../composables/data'
import { isActive } from '../../shared'
import VPLink from './VPLink.vue'

const props = defineProps<{
  item: DefaultTheme.NavItemWithLink
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
</script>

<template>
  <VPLink
    :class="{ VPNavBarMenuLink: true, active: isActiveLink }"
    :href
    :target="item.target"
    :rel="item.rel"
    :no-icon="item.noIcon"
    tabindex="0"
  >
    <span v-html="item.text"></span>
  </VPLink>
</template>