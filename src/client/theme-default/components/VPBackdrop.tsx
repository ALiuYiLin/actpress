import '../styles/components/VPBackdrop.css?scoped'

export interface VPBackdropProps {
  show?: boolean
  onclick?: () => void
  [key: string]: any
}

export function VPBackdrop(props: VPBackdropProps = {}) {
  // Vue 版用 <transition name="fade">；ActView Transition 无钩子/动画语义，
  // 直接按 show 渲染（fade 动画样式保留在 CSS 中）
  return props.show ? (
    <div
      class={['VPBackdrop', props.class].filter(Boolean).join(' ')}
      onclick={props.onclick}
    />
  ) : null
}
