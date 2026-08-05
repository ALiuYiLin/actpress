<script setup lang="ts">
import { useScrollLock } from '@vueuse/core'
import { inBrowser } from 'vitepress'
import VPNavScreenAppearance from './VPNavScreenAppearance.vue'
import VPNavScreenMenu from './VPNavScreenMenu.vue'
import VPNavScreenSocialLinks from './VPNavScreenSocialLinks.vue'
import VPNavScreenTranslations from './VPNavScreenTranslations.vue'

defineProps<{
  open: boolean
}>()

const isLocked = useScrollLock(inBrowser ? document.body : null)
</script>

<template>
  <transition
    name="fade"
    @enter="isLocked = true"
    @after-leave="isLocked = false"
  >
    <div v-if="open" class="VPNavScreen" id="VPNavScreen">
      <div class="container">
        <slot name="nav-screen-content-before" />
        <VPNavScreenMenu class="menu" />
        <VPNavScreenTranslations class="translations" />
        <VPNavScreenAppearance class="appearance" />
        <VPNavScreenSocialLinks class="social-links" />
        <slot name="nav-screen-content-after" />
      </div>
    </div>
  </transition>
</template>