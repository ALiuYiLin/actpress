<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { useData } from '../composables/data'

const { theme } = useData()
const route = useRoute()
const backToTop = ref()

watch(() => route.path, () => backToTop.value.focus())
</script>

<template>
  <span ref="backToTop" tabindex="-1" />
  <a href="#VPContent" class="VPSkipLink visually-hidden">
    {{ theme.skipToContentLabel || 'Skip to content' }}
  </a>
</template>