import { createElement } from '@actview/jsx'
import { defineComponent, ref, watch } from 'actview'
import { inBrowser } from 'vitepress'

/** 手写 useScrollLock（替代 @vueuse/core）：锁定元素滚动 */
function useScrollLock(element: HTMLElement | null) {
  const isLocked = ref(false)
  watch(isLocked, (v) => {
    if (!element) return
    element.style.overflow = v ? 'hidden' : ''
  })
  return isLocked
}

export interface VPNavScreenProps {
  open?: boolean
  navScreenContentBefore?: any
  navScreenContentAfter?: any
}

export const VPNavScreen = defineComponent(function (
  props: VPNavScreenProps = {}
) {
  const isLocked = useScrollLock(inBrowser ? document.body : null)
  // Vue 版在 Transition enter/after-leave 钩子里切换锁；ActView Transition 无钩子，
  // 直接随 open 状态切换
  watch(
    () => props.open,
    (v) => {
      isLocked.value = !!v
    },
    { immediate: true }
  )

  return function () {
    if (!props.open) return null
    return createElement(
      'div',
      { class: 'VPNavScreen', id: 'VPNavScreen' },
      createElement(
        'div',
        { class: 'container' },
        props.navScreenContentBefore,
        // TODO(C): VPNavScreenMenu / VPNavScreenTranslations /
        // VPNavScreenAppearance / VPNavScreenSocialLinks 后续批次迁移
        props.navScreenContentAfter
      )
    )
  }
})
