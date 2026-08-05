import { createElement } from '@actview/jsx'
import { defineComponent, ref } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { useFlyout } from '../composables/flyout'
import { VPMenu } from './VPMenu'

export interface VPFlyoutProps {
  icon?: string
  button?: string
  label?: string
  items?: DefaultTheme.NavItem[]
  children?: any
}

export const VPFlyout = defineComponent(function (props: VPFlyoutProps = {}) {
  const open = ref(false)
  const el = ref<HTMLElement | undefined>(undefined)

  useFlyout({
    el,
    onBlur: () => {
      open.value = false
    }
  })

  return function () {
    return createElement(
      'div',
      {
        class: 'VPFlyout',
        ref: el,
        onmouseenter: () => {
          open.value = true
        },
        onmouseleave: () => {
          open.value = false
        }
      },
      createElement(
        'button',
        {
          type: 'button',
          class: 'button',
          'aria-haspopup': 'true',
          'aria-expanded': open.value,
          'aria-label': props.label,
          onclick: () => {
            open.value = !open.value
          }
        },
        props.button || props.icon
          ? createElement(
              'span',
              { class: 'text' },
              props.icon
                ? createElement('span', {
                    class: [props.icon, 'option-icon'].join(' ')
                  })
                : null,
              props.button ? createElement('span', null, props.button) : null,
              createElement('span', { class: 'vpi-chevron-down text-icon' })
            )
          : createElement('span', { class: 'vpi-more-horizontal icon' })
      ),
      createElement(
        'div',
        { class: 'menu' },
        createElement(VPMenu, { items: props.items }, props.children)
      )
    )
  }
})
