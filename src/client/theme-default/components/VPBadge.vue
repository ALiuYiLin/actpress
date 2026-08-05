<script setup lang="ts">
interface Props {
  text?: string
  type?: 'info' | 'tip' | 'warning' | 'danger'
}
withDefaults(defineProps<Props>(), {
  type: 'tip'
})
</script>

<template>
  <span class="VPBadge" :class="type">
    <slot>{{ text }}</slot>
  </span>
</template>