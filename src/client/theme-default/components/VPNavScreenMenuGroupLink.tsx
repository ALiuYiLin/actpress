import type { DefaultTheme } from '@actview/press/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { useNav } from '../composables/nav'
import { VPLink } from './VPLink'

export interface VPNavScreenMenuGroupLinkProps {
  item: DefaultTheme.NavItemWithLink
}

export function VPNavScreenMenuGroupLink(props: VPNavScreenMenuGroupLinkProps) {
  const { page } = useData()
  const { closeScreen } = useNav()

  const href =
    typeof props.item.link === 'function'
      ? props.item.link(page.value)
      : props.item.link
  const isActiveLink = isActive(
    page.value.relativePath,
    props.item.activeMatch || href,
    !!props.item.activeMatch
  )

  return (
    <VPLink
      class={['VPNavScreenMenuGroupLink', isActiveLink ? 'active' : ''].join(
        ' '
      )}
      href={href}
      target={props.item.target}
      rel={props.item.rel}
      noIcon={props.item.noIcon}
      onclick={closeScreen}
    >
      <span>{props.item.text}</span>
    </VPLink>
  )
}
