<script setup lang="ts">
import { ref } from 'vue'
import { useLangs } from '../composables/langs'
import VPLink from './VPLink.vue'

const { localeLinks, currentLang } = useLangs({ correspondingLink: true })
const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div
    v-if="localeLinks.length && currentLang.label"
    class="VPNavScreenTranslations"
    :class="{ open: isOpen }"
  >
    <button class="title" @click="toggle">
      <span class="vpi-languages icon lang" />
      {{ currentLang.label }}
      <span class="vpi-chevron-down icon chevron" />
    </button>

    <ul class="list">
      <li v-for="locale in localeLinks" :key="locale.link" class="item">
        <VPLink
          class="link"
          :href="locale.link"
          :external="false"
          :lang="locale.lang"
          :hreflang="locale.lang"
          rel="alternate"
          :dir="locale.dir"
        >
          {{ locale.text }}
        </VPLink>
      </li>
    </ul>
  </div>
</template>