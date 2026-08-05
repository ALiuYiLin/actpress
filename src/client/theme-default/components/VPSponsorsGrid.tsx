import { ref } from 'actview'
import type { GridSize } from '../composables/sponsor-grid'
import { useSponsorsGrid } from '../composables/sponsor-grid'

export interface Sponsor {
  name: string
  img: string
  url: string
}

export interface VPSponsorsGridProps {
  size?: GridSize
  data: Sponsor[]
  [key: string]: any
}

export function VPSponsorsGrid(props: VPSponsorsGridProps) {
  const size = props.size ?? 'medium'
  const el = ref<HTMLElement | null>(null)

  useSponsorsGrid({ el, size })

  return (
    <div class={['VPSponsorsGrid vp-sponsor-grid', size].join(' ')} ref={el}>
      {props.data.map((sponsor) => (
        <div key={sponsor.name} class="vp-sponsor-grid-item">
          <a
            class="vp-sponsor-grid-link"
            href={sponsor.url}
            target="_blank"
            rel="sponsored noopener"
          >
            <article class="vp-sponsor-grid-box">
              <img
                class="vp-sponsor-grid-image"
                src={sponsor.img}
                alt={sponsor.name}
              />
            </article>
          </a>
        </div>
      ))}
    </div>
  )
}
