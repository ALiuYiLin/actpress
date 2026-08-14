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

// 注意：组件函数体（setup）只执行一次，任何在函数体内计算的派生值都会被
// 渲染闭包快照（props 变化后不更新——曾导致导航高亮不更新 bug）。
// 因此 Tag / cls / external 判定全部放进 makeAttrs()，在 JSX 表达式内调用，
// 每次重渲染都读取最新 props；动态标签经 <component is> 在 render 期解析。
export function VPLink(props: VPLinkProps = {}) {
  const makeAttrs = () => {
    const isExternal = isLinkExternal(props.href, props.target, props.external)
    return {
      ...props,
      is: props.tag ?? (props.href ? 'a' : 'span'),
      class: [
        'VPLink',
        props.href ? 'link' : '',
        isExternal ? 'vp-external-link-icon' : '',
        props.noIcon ? 'no-icon' : '',
        props.class ?? ''
      ]
        .filter(Boolean)
        .join(' '),
      href: props.href ? normalizeLink(props.href) : undefined,
      target: props.target ?? (isExternal ? '_blank' : undefined),
      rel: props.rel ?? (isExternal ? 'noreferrer' : undefined)
    }
  }

  return (
    // as any：@actview/jsx 的 component 类型为严格 HTMLAttributes & { is }，
    // 不含 href/target 等通用属性（框架类型限制，运行时无影响）
    <component {...(makeAttrs() as any)}>{props.children ?? null}</component>
  )
}
