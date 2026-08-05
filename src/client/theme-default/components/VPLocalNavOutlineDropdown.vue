<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'
import { onContentUpdated } from 'vitepress'
import type { DefaultTheme } from 'vitepress/theme'
import { nextTick, ref, watch } from 'vue'
import { useData } from '../composables/data'
import { resolveTitle } from '../composables/outline'
import VPDocOutlineItem from './VPDocOutlineItem.vue'

const props = defineProps<{
  headers: DefaultTheme.OutlineItem[]
  navHeight: number
}>()

const { theme } = useData()
const open = ref(false)
const vh = ref(0)
const main = ref<HTMLDivElement>()
const items = ref<HTMLDivElement>()

function closeOnClickOutside(e: Event) {
  if (!main.value?.contains(e.target as Node)) {
    open.value = false
  }
}

watch(open, (value) => {
  if (value) {
    document.addEventListener('click', closeOnClickOutside)
    return
  }
  document.removeEventListener('click', closeOnClickOutside)
})

onKeyStroke('Escape', () => {
  open.value = false
})

onContentUpdated(() => {
  open.value = false
})

function toggle() {
  open.value = !open.value
  vh.value = window.innerHeight + Math.min(window.scrollY - props.navHeight, 0)
}

function onItemClick(e: Event) {
  if ((e.target as HTMLElement).classList.contains('outline-link')) {
    // disable animation on hash navigation when page jumps
    if (items.value) {
      items.value.style.transition = 'none'
    }
    nextTick(() => {
      open.value = false
    })
  }
}

function scrollToTop() {
  open.value = false
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}
</script>

<template>
  <div
    class="VPLocalNavOutlineDropdown"
    :style="{ '--vp-vh': vh + 'px' }"
    ref="main"
  >
    <button @click="toggle" :class="{ open }" v-if="headers.length > 0">
      <span class="menu-text">{{ resolveTitle(theme) }}</span>
      <span class="vpi-chevron-right icon" />
    </button>
    <button @click="scrollToTop" v-else>
      {{ theme.returnToTopLabel || 'Return to top' }}
    </button>
    <Transition name="flyout">
      <div v-if="open" ref="items" class="items" @click="onItemClick">
        <div class="header">
          <a class="top-link" href="#" @click="scrollToTop">
            {{ theme.returnToTopLabel || 'Return to top' }}
          </a>
        </div>
        <div class="outline">
          <VPDocOutlineItem :headers />
        </div>
      </div>
    </Transition>
  </div>
</template>