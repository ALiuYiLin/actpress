import { EXTERNAL_URL_RE } from '../../shared'
import { normalizeLink } from '../support/utils'

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

export function VPButton(props: VPButtonProps = {}) {
  const size = props.size ?? 'medium'
  const theme = props.theme ?? 'brand'

  const isExternal = !!(props.href && EXTERNAL_URL_RE.test(props.href))
  const Tag: any = props.tag || (props.href ? 'a' : 'button')

  return (
    <Tag
      class={['VPButton', size, theme].filter(Boolean).join(' ')}
      href={props.href ? normalizeLink(props.href) : undefined}
      target={props.target ?? (isExternal ? '_blank' : undefined)}
      rel={props.rel ?? (isExternal ? 'noreferrer' : undefined)}
    >
      {props.children ?? props.text ?? null}
    </Tag>
  )
}
