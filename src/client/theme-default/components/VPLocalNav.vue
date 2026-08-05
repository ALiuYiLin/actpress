<script lang="ts" setup>
import { useWindowScroll } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'
import VPLocalNavOutlineDropdown from './VPLocalNavOutlineDropdown.vue'

defineProps<{
  open: boolean
}>()

defineEmits<{
  (e: 'open-menu'): void
}>()

const { theme } = useData()
const { isHome, hasSidebar, headers, hasLocalNav } = useLayout()
const { y } = useWindowScroll()

const navHeight = ref(0)

onMounted(() => {
  navHeight.value = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--vp-nav-height'
    )
  )
})

const classes = computed(() => {
  return {
    VPLocalNav: true,
    'has-sidebar': hasSidebar.value,
    empty: !hasLocalNav.value,
    fixed: !hasLocalNav.value && !hasSidebar.value
  }
})
</script>

<template>
  <div
    v-if="!isHome && (hasLocalNav || hasSidebar || y >= navHeight)"
    :class="classes"
  >
    <div class="container">
      <button
        v-if="hasSidebar"
        class="menu"
        :aria-expanded="open"
        aria-controls="VPSidebarNav"
        @click="$emit('open-menu')"
      >
        <span class="vpi-align-left menu-icon"></span>
        <span class="menu-text">
          {{ theme.sidebarMenuLabel || 'Menu' }}
        </span>
      </button>

      <VPLocalNavOutlineDropdown :headers :navHeight />
    </div>
  </div>
</template>