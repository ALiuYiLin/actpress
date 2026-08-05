<script setup lang="ts">
import type { DefaultTheme } from 'vitepress/theme'
import VPImage from './VPImage.vue'
import VPLink from './VPLink.vue'

defineProps<{
  icon?: DefaultTheme.FeatureIcon
  title: string
  details?: string
  link?: string
  linkText?: string
  rel?: string
  target?: string
}>()
</script>

<template>
  <VPLink
    class="VPFeature"
    :href="link"
    :rel
    :target
    :no-icon="true"
    :tag="link ? 'a' : 'div'"
  >
    <article class="box">
      <div v-if="typeof icon === 'object' && icon.wrap" class="icon">
        <VPImage
          :image="icon"
          :alt="icon.alt"
          :height="icon.height || 48"
          :width="icon.width || 48"
        />
      </div>
      <VPImage
        v-else-if="typeof icon === 'object'"
        :image="icon"
        :alt="icon.alt"
        :height="icon.height || 48"
        :width="icon.width || 48"
      />
      <div v-else-if="icon" class="icon" v-html="icon"></div>
      <h2 class="title" v-html="title"></h2>
      <ul v-if="Array.isArray(details)" class="details">
        <li v-for="item in details" :key="item" v-html="item"></li>
      </ul>
      <p v-else-if="details" class="details" v-html="details"></p>
      <div v-if="linkText" class="link-text">
        <p class="link-text-value">
          {{ linkText }} <span class="vpi-arrow-right link-text-icon" />
        </p>
      </div>
    </article>
  </VPLink>
</template>