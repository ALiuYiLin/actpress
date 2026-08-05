<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import { computed } from 'vue'
import VPFeature from './VPFeature.vue'

export interface Feature {
  icon?: DefaultTheme.FeatureIcon
  title: string
  details: string
  link?: string
  linkText?: string
  rel?: string
  target?: string
}

const props = defineProps<{
  features: Feature[]
}>()

const grid = computed(() => {
  const length = props.features.length

  if (!length) {
    return
  } else if (length === 2) {
    return 'grid-2'
  } else if (length === 3) {
    return 'grid-3'
  } else if (length % 3 === 0) {
    return 'grid-6'
  } else if (length > 3) {
    return 'grid-4'
  }
})
</script>

<template>
  <div v-if="features" class="VPFeatures">
    <div class="container">
      <div class="items">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="item"
          :class="[grid]"
        >
          <VPFeature
            :icon="feature.icon"
            :title="feature.title"
            :details="feature.details"
            :link="feature.link"
            :link-text="feature.linkText"
            :rel="feature.rel"
            :target="feature.target"
          />
        </div>
      </div>
    </div>
  </div>
</template>