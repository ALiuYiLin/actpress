import { isLinkExternal, normalizeLink } from '../support/utils'

export interface VPLinkProps {
  tag?: string
  href?: string
  noIcon?: boolean
  external?: boolean
  target?: string
  rel?: string
  children?: any
  [key: string]: any
}

export function VPLink(props: VPLinkProps = {}) {
  const Tag: any = props.tag ?? (props.href ? 'a' : 'span')
  const isExternal = isLinkExternal(props.href, props.target, props.external)
  const cls = [
    'VPLink',
    props.href ? 'link' : '',
    isExternal ? 'vp-external-link-icon' : '',
    props.noIcon ? 'no-icon' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag
      class={cls}
      href={props.href ? normalizeLink(props.href) : undefined}
      target={props.target ?? (isExternal ? '_blank' : undefined)}
      rel={props.rel ?? (isExternal ? 'noreferrer' : undefined)}
      {...props}
    >
      {props.children ?? null}
    </Tag>
  )
}
