import type { DefaultTheme } from 'actpress/theme'
import { VPSocialLink } from './VPSocialLink'

export interface VPSocialLinksProps {
  links: DefaultTheme.SocialLink[]
  me?: boolean
  [key: string]: any
}

export function VPSocialLinks(props: VPSocialLinksProps) {
  const me = props.me ?? true

  return (
    <div class="VPSocialLinks">
      {props.links.map(({ link, icon, ariaLabel }) => (
        <VPSocialLink
          key={link}
          icon={icon}
          link={link}
          ariaLabel={ariaLabel}
          me={me}
        />
      ))}
    </div>
  )
}
