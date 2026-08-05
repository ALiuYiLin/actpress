import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'

export interface VPBadgeProps {
  text?: string
  type?: 'info' | 'tip' | 'warning' | 'danger'
  children?: any
}

export const VPBadge = defineComponent(function (props: VPBadgeProps = {}) {
  const type = props.type ?? 'tip'

  return function () {
    return createElement(
      'span',
      { class: ['VPBadge', type].filter(Boolean).join(' ') },
      // slot 内容优先，否则 text（原模板 <slot>{{ text }}</slot>）
      props.children ?? props.text ?? null
    )
  }
})
