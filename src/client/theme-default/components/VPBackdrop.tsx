import { defineComponent } from 'actview'

export interface VPBackdropProps {
  show?: boolean
  onclick?: () => void
  [key: string]: any
}

export const VPBackdrop = defineComponent(function (
  props: VPBackdropProps = {}
) {
  // Vue 版用 <transition name="fade">；ActView Transition 无钩子/动画语义，
  // 直接按 show 渲染（fade 动画样式保留在 CSS 中）
  // 注意：show 必须在 render 内判断（setup 早退会导致 props 变化不响应）
  return function () {
    if (!props.show) return null
    return <div class="VPBackdrop" onclick={props.onclick} />
  }
})
