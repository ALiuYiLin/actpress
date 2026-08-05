import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPLink } from './VPLink'

export interface VPMenuLinkProps {
  item: DefaultTheme.NavItemWithLink
  rel?: string
}

export const VPMenuLink = defineComponent(function (props: VPMenuLinkProps) {
  const { page } = useData()

  return function () {
    const item = props.item
    const href =
      typeof item.link === 'function' ? item.link(page.value) : item.link
    const isActiveLink = isActive(page.value.relativePath, href)

    return createElement(
      'div',
      { class: 'VPMenuLink' },
      createElement(
        VPLink,
        {
          class: isActiveLink ? 'active' : undefined,
          href,
          target: item.target,
          rel: props.rel ?? item.rel,
          noIcon: item.noIcon
        },
        // 原 v-html：ActView 无 innerHTML，文本渲染（item.text 通常为纯文本）
        createElement('span', null, item.text ?? '')
      )
    )
  }
})
