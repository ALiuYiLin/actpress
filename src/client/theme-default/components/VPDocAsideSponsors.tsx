import type { Sponsors } from './VPSponsors'
import type { Sponsor } from './VPSponsorsGrid'
import { VPSponsors } from './VPSponsors'

export interface VPDocAsideSponsorsProps {
  tier?: string
  size?: 'xmini' | 'mini' | 'small'
  data: Sponsors[] | Sponsor[]
}

export function VPDocAsideSponsors(props: VPDocAsideSponsorsProps) {
  return (
    <div class="VPDocAsideSponsors">
      <VPSponsors
        mode="aside"
        tier={props.tier}
        size={props.size}
        data={props.data}
      />
    </div>
  )
}
