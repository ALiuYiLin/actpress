export interface VPBackdropProps {
  show?: boolean
}

export function VPBackdrop(props: VPBackdropProps = {}) {
  // Vue 版用 <transition name="fade">；ActView Transition 无钩子/动画语义，
  // 直接按 show 渲染（fade 动画样式保留在 CSS 中）
  if (!props.show) return null
  return <div class="VPBackdrop" />
}
