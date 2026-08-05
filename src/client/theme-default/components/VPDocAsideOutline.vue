<script setup lang="ts">
import { ref } from 'vue'
import { useData } from '../composables/data'
import { resolveTitle, useActiveAnchor } from '../composables/outline'
import VPDocOutlineItem from './VPDocOutlineItem.vue'
import { useLayout } from '../composables/layout'

const { theme } = useData()

const container = ref()
const marker = ref()

const { headers, hasLocalNav } = useLayout()

useActiveAnchor(container, marker)
</script>

<template>
  <nav
    aria-labelledby="doc-outline-aria-label"
    class="VPDocAsideOutline"
    :class="{ 'has-outline': hasLocalNav }"
    ref="container"
  >
    <div class="content">
      <div class="outline-marker" ref="marker" />

      <div
        aria-level="2"
        class="outline-title"
        id="doc-outline-aria-label"
        role="heading"
      >
        {{ resolveTitle(theme) }}
      </div>

      <VPDocOutlineItem :headers :root="true" />
    </div>
  </nav>
</template>