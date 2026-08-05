import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'

export const VPSwitch = defineComponent(function (props: any = {}) {
  return function () {
    return createElement(
      'button',
      { class: 'VPSwitch', type: 'button', role: 'switch' },
      createElement(
        'span',
        { class: 'check' },
        props.children != null
          ? createElement('span', { class: 'icon' }, props.children)
          : null
      )
    )
  }
})
