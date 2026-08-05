<script lang="ts" setup>
import { useWindowScroll } from '@vueuse/core'
import { useLayout } from '../composables/layout'
import VPNavBarAppearance from './VPNavBarAppearance.vue'
import VPNavBarExtra from './VPNavBarExtra.vue'
import VPNavBarHamburger from './VPNavBarHamburger.vue'
import VPNavBarMenu from './VPNavBarMenu.vue'
import VPNavBarSearch from './VPNavBarSearch.vue'
import VPNavBarSocialLinks from './VPNavBarSocialLinks.vue'
import VPNavBarTitle from './VPNavBarTitle.vue'
import VPNavBarTranslations from './VPNavBarTranslations.vue'

const props = defineProps<{
  isScreenOpen: boolean
}>()

defineEmits<{
  (e: 'toggle-screen'): void
}>()

const { y } = useWindowScroll()
const { isHome, hasSidebar } = useLayout()
</script>

<template>
  <div
    class="VPNavBar"
    :class="{
      'has-sidebar': hasSidebar,
      'home': isHome,
      'top': y === 0,
      'screen-open': isScreenOpen
    }"
  >
    <div class="wrapper">
      <div class="container">
        <div class="title">
          <VPNavBarTitle>
            <template #nav-bar-title-before><slot name="nav-bar-title-before" /></template>
            <template #nav-bar-title-after><slot name="nav-bar-title-after" /></template>
          </VPNavBarTitle>
        </div>

        <div class="content">
          <div class="content-body">
            <slot name="nav-bar-content-before" />
            <VPNavBarSearch class="search" />
            <VPNavBarMenu class="menu" />
            <VPNavBarTranslations class="translations" />
            <VPNavBarAppearance class="appearance" />
            <VPNavBarSocialLinks class="social-links" />
            <VPNavBarExtra class="extra" />
            <slot name="nav-bar-content-after" />
            <VPNavBarHamburger
              class="hamburger"
              :active="isScreenOpen"
              @click="$emit('toggle-screen')"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="divider">
      <div class="divider-line" />
    </div>
  </div>
</template>