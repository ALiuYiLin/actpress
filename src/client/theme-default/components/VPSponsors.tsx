import { computed } from 'actview'
import type { GridSize } from '../composables/sponsor-grid'
import { VPSponsorsGrid } from './VPSponsorsGrid'

export interface Sponsors {
  tier?: string
  size?: GridSize
  items: Sponsor[]
}

import type { Sponsor } from './VPSponsorsGrid'

export interface VPSponsorsProps {
  mode?: 'normal' | 'aside'
  tier?: string
  size?: GridSize
  data: Sponsors[] | Sponsor[]
}

export function VPSponsors(props: VPSponsorsProps) {
  const mode = props.mode ?? 'normal'

  const sponsors = computed(() => {
    const isSponsors = props.data.some((s) => {
      return 'items' in s
    })

    if (isSponsors) {
      return props.data as Sponsors[]
    }

    return [
      {
        tier: props.tier,
        size: props.size,
        items: props.data as Sponsor[]
      }
    ]
  })

  return (
    <div class={['VPSponsors vp-sponsor', mode].join(' ')}>
      {sponsors.value.map((sponsor, index) => (
        <section key={index} class="vp-sponsor-section">
          {sponsor.tier ? (
            <h3 class="vp-sponsor-tier">{sponsor.tier}</h3>
          ) : null}
          <VPSponsorsGrid size={sponsor.size} data={sponsor.items} />
        </section>
      ))}
    </div>
  )
}
