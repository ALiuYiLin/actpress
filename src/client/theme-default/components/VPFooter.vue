<script setup lang="ts">
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'

const { theme, frontmatter } = useData()
const { hasSidebar } = useLayout()
</script>

<template>
  <footer v-if="theme.footer && frontmatter.footer !== false" class="VPFooter" :class="{ 'has-sidebar': hasSidebar }">
    <div class="container">
      <p v-if="theme.footer.message" class="message" v-html="theme.footer.message"></p>
      <p v-if="theme.footer.copyright" class="copyright" v-html="theme.footer.copyright"></p>
    </div>
  </footer>
</template>