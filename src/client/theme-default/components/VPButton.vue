<script setup lang="ts">
import { computed } from 'vue'
import { normalizeLink } from '../support/utils'
import { EXTERNAL_URL_RE } from '../../shared'

interface Props {
  tag?: string
  size?: 'medium' | 'big'
  theme?: 'brand' | 'alt' | 'sponsor'
  text?: string
  href?: string
  target?: string;
  rel?: string;
}
const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  theme: 'brand'
})

const isExternal = computed(
  () => props.href && EXTERNAL_URL_RE.test(props.href)
)

const component = computed(() => {
  return props.tag || (props.href ? 'a' : 'button')
})
</script>

<template>
  <component
    :is="component"
    class="VPButton"
    :class="[size, theme]"
    :href="href ? normalizeLink(href) : undefined"
    :target="props.target ?? (isExternal ? '_blank' : undefined)"
    :rel="props.rel ?? (isExternal ? 'noreferrer' : undefined)"
  >
    <slot>{{ text }}</slot>
  </component>
</template>