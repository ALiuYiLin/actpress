import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { VPMenuGroup } from './VPMenuGroup'
import { VPMenuLink } from './VPMenuLink'

export interface VPMenuProps {
  items?: DefaultTheme.NavItem[]
  children?: any
}

export const VPMenu = defineComponent(function (props: VPMenuProps = {}) {
  return function () {
    const items = props.items ?? []
    return createElement(
      'div',
      { class: 'VPMenu' },
      items.length
        ? createElement(
            'div',
            { class: 'items' },
            items.map((item, i) => {
              const key = JSON.stringify(item)
              if ('link' in item) {
                return createElement(VPMenuLink, {
                  item: item as DefaultTheme.NavItemWithLink,
                  key
                })
              }
              if ('component' in item) {
                // 动态组件：ActView 组件对象直接作为 type
                const comp = (item as DefaultTheme.NavItemComponent).component
                const compProps = (item as DefaultTheme.NavItemComponent).props
                return createElement(comp as any, { key, ...(compProps ?? {}) })
              }
              const group = item as DefaultTheme.NavItemChildren
              return createElement(VPMenuGroup, {
                key,
                text: group.text,
                items: group.items
              })
            })
          )
        : null,
      props.children ?? null
    )
  }
})
