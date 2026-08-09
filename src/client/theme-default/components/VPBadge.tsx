import '../styles/components/VPBadge.css'
export interface VPBadgeProps {
  text?: string
  type?: 'info' | 'tip' | 'warning' | 'danger'
  children?: any
}

export function VPBadge(props: VPBadgeProps = {}) {
  const type = props.type ?? 'tip'

  return (
    <span class={['VPBadge', type].filter(Boolean).join(' ')}>
      {/* slot 内容优先，否则 text（原模板 <slot>{{ text }}</slot>） */}
      {props.children ?? props.text ?? null}
    </span>
  )
}
