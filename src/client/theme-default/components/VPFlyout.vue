<script lang="ts" setup generic="T extends DefaultTheme.NavItem">
import type { DefaultTheme } from 'vitepress/theme'
import { ref } from 'vue'
import { useFlyout } from '../composables/flyout'
import VPMenu from './VPMenu.vue'

defineProps<{
  icon?: string
  button?: string
  label?: string
  items?: T[]
}>()

const open = ref(false)
const el = ref<HTMLElement>()

useFlyout({ el, onBlur })

function onBlur() {
  open.value = false
}
</script>

<template>
  <div
    class="VPFlyout"
    ref="el"
    @mouseenter="open = true"
    @mouseleave="open = false"
  >
    <button
      type="button"
      class="button"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="label"
      @click="open = !open"
    >
      <span v-if="button || icon" class="text">
        <span v-if="icon" :class="[icon, 'option-icon']" />
        <span v-if="button" v-html="button"></span>
        <span class="vpi-chevron-down text-icon" />
      </span>

      <span v-else class="vpi-more-horizontal icon" />
    </button>

    <div class="menu">
      <VPMenu :items>
        <slot />
      </VPMenu>
    </div>
  </div>
</template>