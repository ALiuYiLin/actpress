import { ref, watch } from 'actview'
import { inBrowser } from '@actview/press'
import { VPNavScreenAppearance } from './VPNavScreenAppearance'
import { VPNavScreenMenu } from './VPNavScreenMenu'
import { VPNavScreenSocialLinks } from './VPNavScreenSocialLinks'
import { VPNavScreenTranslations } from './VPNavScreenTranslations'

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

export function VPNavScreen(props: VPNavScreenProps = {}) {
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
    return (
      <div class="VPNavScreen" id="VPNavScreen">
        <div class="container">
          {props.navScreenContentBefore}
          <VPNavScreenMenu />
          <VPNavScreenTranslations />
          <VPNavScreenAppearance />
          <VPNavScreenSocialLinks />
          {props.navScreenContentAfter}
        </div>
      </div>
    )
  }
}
