<script lang="ts" setup>
import type { DefaultTheme } from 'vitepress/theme'
import { computed, nextTick, onMounted, ref, useSSRContext } from 'vue'
import type { SSGContext } from '../../shared'

const props = defineProps<{
  icon: DefaultTheme.SocialLinkIcon
  link: string
  ariaLabel?: string
  me: boolean
}>()

const el = ref<HTMLAnchorElement>()

onMounted(async () => {
  await nextTick()
  const span = el.value?.children[0]
  if (
    span instanceof HTMLElement &&
    span.className.startsWith('vpi-social-') &&
    (getComputedStyle(span).maskImage ||
      getComputedStyle(span).webkitMaskImage) === 'none'
  ) {
    span.style.setProperty(
      '--icon',
      `url('https://api.iconify.design/simple-icons/${props.icon}.svg')`
    )
  }
})

const svg = computed(() => {
  if (typeof props.icon === 'object') return props.icon.svg
  return `<span class="vpi-social-${props.icon}"></span>`
})

if (import.meta.env.SSR) {
  typeof props.icon === 'string' &&
    useSSRContext<SSGContext>()?.vpSocialIcons.add(props.icon)
}
</script>

<template>
  <a
    ref="el"
    class="VPSocialLink no-icon"
    :href="link"
    :aria-label="ariaLabel ?? (typeof icon === 'string' ? icon : '')"
    target="_blank"
    :rel="me ? 'me noopener' : 'noopener'"
    v-html="svg"
  ></a>
</template>