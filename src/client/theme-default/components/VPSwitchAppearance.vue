<script lang="ts" setup>
import { inject, ref, watchPostEffect } from 'vue'
import { useData } from '../composables/data'
import VPSwitch from './VPSwitch.vue'

const { isDark, theme } = useData()

const toggleAppearance = inject('toggle-appearance', () => {
  isDark.value = !isDark.value
})

const switchTitle = ref('')

watchPostEffect(() => {
  switchTitle.value = isDark.value
    ? theme.value.lightModeSwitchTitle || 'Switch to light theme'
    : theme.value.darkModeSwitchTitle || 'Switch to dark theme'
})
</script>

<template>
  <VPSwitch
    :title="switchTitle"
    class="VPSwitchAppearance"
    :aria-checked="isDark"
    @click="toggleAppearance"
  >
    <span class="vpi-sun sun" />
    <span class="vpi-moon moon" />
  </VPSwitch>
</template>