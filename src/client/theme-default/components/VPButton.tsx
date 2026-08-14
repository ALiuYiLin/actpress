import '../styles/components/VPButton.css?scoped'
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

// 注意：组件函数体（setup）只执行一次，任何在函数体内计算的派生值都会被
// 渲染闭包快照（props 变化后不更新）。size/theme/isExternal/Tag 全部放进
// makeAttrs() 在 JSX 内调用，每次重渲染读取最新 props；动态标签经
// <component is> 在 render 期解析。详见 design/setup-snapshot.md。
export function VPButton(props: VPButtonProps = {}) {
  const makeAttrs = () => {
    const size = props.size ?? 'medium'
    const theme = props.theme ?? 'brand'
    const isExternal = !!(props.href && EXTERNAL_URL_RE.test(props.href))
    return {
      is: props.tag || (props.href ? 'a' : 'button'),
      class: ['VPButton', size, theme].filter(Boolean).join(' '),
      href: props.href ? normalizeLink(props.href) : undefined,
      target: props.target ?? (isExternal ? '_blank' : undefined),
      rel: props.rel ?? (isExternal ? 'noreferrer' : undefined)
    }
  }

  return (
    // as any：@actview/jsx 的 component 类型为严格 HTMLAttributes & { is }，
    // 不含 href/target 等通用属性（框架类型限制，运行时无影响）
    <component {...(makeAttrs() as any)}>
      {props.children ?? props.text ?? null}
    </component>
  )
}
