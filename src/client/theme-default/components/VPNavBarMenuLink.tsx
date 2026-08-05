import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPLink } from './VPLink'

export interface VPNavBarMenuLinkProps {
  item: DefaultTheme.NavItemWithLink
}

export const VPNavBarMenuLink = defineComponent(function (
  props: VPNavBarMenuLinkProps
) {
  const { page } = useData()

  return function () {
    const item = props.item
    const href =
      typeof item.link === 'function' ? item.link(page.value) : item.link
    const isActiveLink = isActive(
      page.value.relativePath,
      item.activeMatch || href,
      !!item.activeMatch
    )
    return createElement(
      VPLink,
      {
        class: ['VPNavBarMenuLink', isActiveLink ? 'active' : ''].join(' '),
        href,
        target: item.target,
        rel: item.rel,
        noIcon: item.noIcon,
        tabindex: '0'
      },
      createElement('span', null, item.text ?? '')
    )
  }
})
