<script setup lang="ts">
import VPButton from './VPButton.vue'
import VPSponsors from './VPSponsors.vue'

export interface Sponsors {
  tier: string
  size?: 'medium' | 'big'
  items: Sponsor[]
}

export interface Sponsor {
  name: string
  img: string
  url: string
}
interface Props {
  message?: string
  actionText?: string
  actionLink?: string
  data: Sponsors[]
}

withDefaults(defineProps<Props>(), {
  actionText: 'Become a sponsor'
})
</script>

<template>
  <section class="VPHomeSponsors">
    <div class="container">
      <div class="header">
        <div class="love">
          <span class="vpi-heart icon" />
        </div>
        <h2 v-if="message" class="message">{{ message }}</h2>
      </div>

      <div class="sponsors">
        <VPSponsors :data />
      </div>

      <div v-if="actionLink" class="action">
        <VPButton theme="sponsor" :text="actionText" :href="actionLink" />
      </div>
    </div>
  </section>
</template>