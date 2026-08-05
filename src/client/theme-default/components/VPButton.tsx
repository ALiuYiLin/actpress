import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import { normalizeLink } from '../support/utils'
import { EXTERNAL_URL_RE } from '../../shared'

export interface VPButtonProps {
  tag?: string
  size?: 'medium' | 'big'
  theme?: 'brand' | 'alt' | 'sponsor'
  text?: string
  href?: string
  target?: string
  rel?: string
  children?: any
}

export const VPButton = defineComponent(function (props: VPButtonProps = {}) {
  const size = props.size ?? 'medium'
  const theme = props.theme ?? 'brand'

  return function () {
    const isExternal = !!(props.href && EXTERNAL_URL_RE.test(props.href))
    const tag = props.tag || (props.href ? 'a' : 'button')
    const attrs: Record<string, any> = {
      class: ['VPButton', size, theme].filter(Boolean).join(' '),
      href: props.href ? normalizeLink(props.href) : undefined,
      target: props.target ?? (isExternal ? '_blank' : undefined),
      rel: props.rel ?? (isExternal ? 'noreferrer' : undefined)
    }
    return createElement(tag, attrs, props.children ?? props.text ?? null)
  }
})
