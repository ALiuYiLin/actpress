import type { DefaultTheme } from '@actview/press/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPLink } from './VPLink'

export interface VPNavBarMenuLinkProps {
  item: DefaultTheme.NavItemWithLink
}

export function VPNavBarMenuLink(props: VPNavBarMenuLinkProps) {
  const { page } = useData()

  const item = props.item
  const href =
    typeof item.link === 'function' ? item.link(page.value) : item.link
  const isActiveLink = isActive(
    page.value.relativePath,
    item.activeMatch || href,
    !!item.activeMatch
  )

  return (
    <VPLink
      class={['VPNavBarMenuLink', isActiveLink ? 'active' : ''].join(' ')}
      href={href}
      target={item.target}
      rel={item.rel}
      noIcon={item.noIcon}
      tabindex="0"
    >
      <span>{item.text ?? ''}</span>
    </VPLink>
  )
}
