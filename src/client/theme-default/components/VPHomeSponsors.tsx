import { VPButton } from './VPButton'

export interface Sponsor {
  name: string
  img: string
  url: string
}

export interface Sponsors {
  tier: string
  size?: 'medium' | 'big'
  items: Sponsor[]
}

export interface VPHomeSponsorsProps {
  message?: string
  actionText?: string
  actionLink?: string
  data: Sponsors[]
}

export function VPHomeSponsors(props: VPHomeSponsorsProps) {
  const actionText = props.actionText ?? 'Become a sponsor'

  return (
    <section class="VPHomeSponsors">
      <div class="container">
        <div class="header">
          <div class="love">
            <span class="vpi-heart icon" />
          </div>
          {props.message ? <h2 class="message">{props.message}</h2> : null}
        </div>

        <div class="sponsors">
          {/* TODO(C): VPSponsors 后续批次迁移 */}
          {null}
        </div>

        {props.actionLink ? (
          <div class="action">
            <VPButton
              theme="sponsor"
              text={actionText}
              href={props.actionLink}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
