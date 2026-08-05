<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { ref, watch, onMounted } from 'vue'
import { useAside } from '../composables/aside'
import { useData } from '../composables/data'

const { page } = useData()
const props = defineProps<{
  carbonAds: DefaultTheme.CarbonAdsOptions
}>()

const carbonOptions = props.carbonAds

const { isAsideEnabled } = useAside()
const container = ref()

let isInitialized = false

function init() {
  if (!isInitialized) {
    isInitialized = true
    const params = new URLSearchParams({
      serve: carbonOptions.code,
      placement: carbonOptions.placement,
      format: carbonOptions?.format || 'classic',
    })
    const s = document.createElement('script')
    s.id = '_carbonads_js'
    s.src = `//cdn.carbonads.com/carbon.js?${params.toString()}`
    s.async = true
    container.value.appendChild(s)
  }
}

watch(() => page.value.relativePath, () => {
  if (isInitialized && isAsideEnabled.value) {
    ;(window as any)._carbonads?.refresh()
  }
})

// no need to account for option changes during dev, we can just
// refresh the page
if (carbonOptions) {
  onMounted(() => {
    // if the page is loaded when aside is active, load carbon directly.
    // otherwise, only load it if the page resizes to wide enough. this avoids
    // loading carbon at all on mobile where it's never shown
    if (isAsideEnabled.value) {
      init()
    } else {
      watch(isAsideEnabled, (wide) => wide && init())
    }
  })
}
</script>

<template>
  <div class="VPCarbonAds" ref="container" />
</template>