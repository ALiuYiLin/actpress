<script lang="ts" setup>
import { useData } from '../composables/data'
import VPSwitchAppearance from './VPSwitchAppearance.vue'

const { site, theme } = useData()
</script>

<template>
  <div
    v-if="
      site.appearance &&
      site.appearance !== 'force-dark' &&
      site.appearance !== 'force-auto'
    "
    class="VPNavScreenAppearance"
  >
    <p class="text">
      {{ theme.darkModeSwitchLabel || 'Appearance' }}
    </p>
    <VPSwitchAppearance />
  </div>
</template>