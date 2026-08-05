import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { useData } from '../composables/data'
import { VPNavBarMenuGroup } from './VPNavBarMenuGroup'
import { VPNavBarMenuLink } from './VPNavBarMenuLink'

export const VPNavBarMenu = defineComponent(function (props: any) {
  const { theme } = useData()

  return function () {
    const nav = theme.value.nav ?? []
    if (!nav.length) return null
    return createElement(
      'nav',
      { 'aria-labelledby': 'main-nav-aria-label', class: 'VPNavBarMenu' },
      createElement(
        'span',
        { id: 'main-nav-aria-label', class: 'visually-hidden' },
        'Main Navigation'
      ),
      nav.map((item: DefaultTheme.NavItem, i: number) => {
        const key = JSON.stringify(item)
        if ('link' in item) {
          return createElement(VPNavBarMenuLink, {
            item: item as DefaultTheme.NavItemWithLink,
            key
          })
        }
        if ('component' in item) {
          const comp = (item as DefaultTheme.NavItemComponent).component
          const compProps = (item as DefaultTheme.NavItemComponent).props
          return createElement(comp as any, { key, ...(compProps ?? {}) })
        }
        return createElement(VPNavBarMenuGroup, {
          item: item as DefaultTheme.NavItemWithChildren,
          key
        })
      })
    )
  }
})
