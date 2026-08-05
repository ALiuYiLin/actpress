import type { DefaultTheme } from 'vitepress/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPFlyout } from './VPFlyout'

export interface VPNavBarMenuGroupProps {
  item: DefaultTheme.NavItemWithChildren
}

export function VPNavBarMenuGroup(props: VPNavBarMenuGroupProps) {
  const { page } = useData()

  const isChildActive = (navItem: DefaultTheme.NavItem): boolean => {
    if ('component' in navItem) return false
    if ('link' in navItem) {
      const href =
        typeof navItem.link === 'function'
          ? navItem.link(page.value)
          : navItem.link
      return isActive(
        page.value.relativePath,
        navItem.activeMatch || href,
        !!navItem.activeMatch
      )
    }
    return navItem.items.some(isChildActive)
  }

  const item = props.item
  const isActiveGroup = item.activeMatch
    ? isActive(page.value.relativePath, item.activeMatch, true)
    : isChildActive(item)

  return (
    <VPFlyout
      class={['VPNavBarMenuGroup', isActiveGroup ? 'active' : ''].join(' ')}
      button={item.text}
      items={item.items}
    />
  )
}
