<script setup lang="ts">
import { useRoute } from 'vitepress'
import { computed } from 'vue'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'
import VPDocAside from './VPDocAside.vue'
import VPDocFooter from './VPDocFooter.vue'

const { theme } = useData()

const route = useRoute()
const { hasSidebar, hasAside, leftAside } = useLayout()

const pageName = computed(() =>
  route.path.replace(/[./]+/g, '_').replace(/_html$/, '')
)
</script>

<template>
  <div
    class="VPDoc"
    :class="{ 'has-sidebar': hasSidebar, 'has-aside': hasAside }"
  >
    <slot name="doc-top" />
    <div class="container">
      <div v-if="hasAside" class="aside" :class="{'left-aside': leftAside}">
        <div class="aside-curtain" />
        <div class="aside-container">
          <div class="aside-content">
            <VPDocAside>
              <template #aside-top><slot name="aside-top" /></template>
              <template #aside-bottom><slot name="aside-bottom" /></template>
              <template #aside-outline-before><slot name="aside-outline-before" /></template>
              <template #aside-outline-after><slot name="aside-outline-after" /></template>
              <template #aside-ads-before><slot name="aside-ads-before" /></template>
              <template #aside-ads-after><slot name="aside-ads-after" /></template>
            </VPDocAside>
          </div>
        </div>
      </div>

      <div class="content">
        <div class="content-container">
          <slot name="doc-before" />
          <main class="main">
            <Content
              class="vp-doc"
              :class="[
                pageName,
                theme.externalLinkIcon && 'external-link-icon-enabled'
              ]"
            />
          </main>
          <VPDocFooter>
            <template #doc-footer-before><slot name="doc-footer-before" /></template>
          </VPDocFooter>
          <slot name="doc-after" />
        </div>
      </div>
    </div>
    <slot name="doc-bottom" />
  </div>
</template>