<script lang="ts" setup>
import { computed, ref } from 'vue'
import VPNavScreenMenuGroupLink from './VPNavScreenMenuGroupLink.vue'
import VPNavScreenMenuGroupSection from './VPNavScreenMenuGroupSection.vue'

const props = defineProps<{
  text: string
  items: any[]
}>()

const isOpen = ref(false)

const groupId = computed(
  () => `NavScreenGroup-${props.text.replace(' ', '-').toLowerCase()}`
)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="VPNavScreenMenuGroup" :class="{ open: isOpen }">
    <button
      class="button"
      :aria-controls="groupId"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="button-text" v-html="text"></span>
      <span class="vpi-plus button-icon" />
    </button>

    <div :id="groupId" class="items">
      <template v-for="item in items" :key="JSON.stringify(item)">
        <div v-if="'link' in item" class="item">
          <VPNavScreenMenuGroupLink :item />
        </div>

        <div v-else-if="'component' in item" class="item">
          <component :is="item.component" v-bind="item.props" screen-menu />
        </div>

        <div v-else class="group">
          <VPNavScreenMenuGroupSection :text="item.text" :items="item.items" />
        </div>
      </template>
    </div>
  </div>
</template>