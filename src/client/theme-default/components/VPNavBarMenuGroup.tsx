import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
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

  // isActiveGroup 用 computed 包装：直接在 setup 里计算会被快照
  // （__setup 只执行一次），路由切换后菜单高亮不更新。
  // computed 让渲染函数每次重渲染都读最新 page.value / props.item。
  const isActiveGroup = computed(() => {
    const item = props.item
    return item.activeMatch
      ? isActive(page.value.relativePath, item.activeMatch, true)
      : isChildActive(item)
  })

  return (
    <VPFlyout
      class={['VPNavBarMenuGroup', isActiveGroup.value ? 'active' : ''].join(
        ' '
      )}
      button={props.item.text}
      items={props.item.items}
    />
  )
}
