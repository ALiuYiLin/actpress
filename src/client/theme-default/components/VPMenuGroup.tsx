import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { VPMenuLink } from './VPMenuLink'

export interface VPMenuGroupProps {
  text?: string
  items: Array<
    | DefaultTheme.NavItemComponent
    | DefaultTheme.NavItemChildren
    | DefaultTheme.NavItemWithLink
  >
}

export const VPMenuGroup = defineComponent(function (props: VPMenuGroupProps) {
  return function () {
    return createElement(
      'div',
      { class: 'VPMenuGroup' },
      props.text ? createElement('p', { class: 'title' }, props.text) : null,
      props.items.map((item, i) =>
        'link' in item
          ? createElement(VPMenuLink, {
              item: item as DefaultTheme.NavItemWithLink,
              key: i
            })
          : null
      )
    )
  }
})
