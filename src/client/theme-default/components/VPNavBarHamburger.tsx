import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'

export interface VPNavBarHamburgerProps {
  active?: boolean
  onclick?: () => void
}

export const VPNavBarHamburger = defineComponent(function (
  props: VPNavBarHamburgerProps = {}
) {
  return function () {
    return createElement(
      'button',
      {
        type: 'button',
        class: ['VPNavBarHamburger', props.active ? 'active' : ''].join(' '),
        'aria-label': 'mobile navigation',
        'aria-expanded': props.active,
        'aria-controls': 'VPNavScreen',
        onclick: props.onclick
      },
      createElement(
        'span',
        { class: 'container' },
        createElement('span', { class: 'top' }),
        createElement('span', { class: 'middle' }),
        createElement('span', { class: 'bottom' })
      )
    )
  }
})
