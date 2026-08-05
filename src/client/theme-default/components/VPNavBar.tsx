import { defineComponent, ref } from 'actview'
import { useLayout } from '../composables/layout'
import { VPNavBarAppearance } from './VPNavBarAppearance'
import { VPNavBarHamburger } from './VPNavBarHamburger'
import { VPNavBarMenu } from './VPNavBarMenu'
import { VPNavBarTitle } from './VPNavBarTitle'

/** 手写 useWindowScroll（替代 @vueuse/core） */
function useWindowScroll() {
  const x = ref(window.scrollX)
  const y = ref(window.scrollY)
  const onScroll = () => {
    x.value = window.scrollX
    y.value = window.scrollY
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  return { x, y }
}

export interface VPNavBarProps {
  isScreenOpen?: boolean
  onToggleScreen?: () => void
  /** 具名插槽（Layout/VPNav 透传）：nav-bar-title-before/after、nav-bar-content-before/after */
  navBarTitleBefore?: any
  navBarTitleAfter?: any
  navBarContentBefore?: any
  navBarContentAfter?: any
}

export const VPNavBar = defineComponent(function (props: VPNavBarProps = {}) {
  const { y } = useWindowScroll()
  const { isHome, hasSidebar } = useLayout()

  return function () {
    return (
      <div
        class={[
          'VPNavBar',
          hasSidebar.value ? 'has-sidebar' : '',
          isHome.value ? 'home' : '',
          y.value === 0 ? 'top' : '',
          props.isScreenOpen ? 'screen-open' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div class="wrapper">
          <div class="container">
            <div class="title">
              <VPNavBarTitle
                navBarTitleBefore={props.navBarTitleBefore}
                navBarTitleAfter={props.navBarTitleAfter}
              />
            </div>
            <div class="content">
              <div class="content-body">
                {props.navBarContentBefore}
                <VPNavBarMenu class="menu" />
                {/* TODO(C): VPNavBarSearch / VPNavBarTranslations /
                    VPNavBarSocialLinks / VPNavBarExtra / VPNavBarAskAiButton
                    尚未迁移（后续批次） */}
                <VPNavBarAppearance class="appearance" />
                <VPNavBarHamburger
                  class="hamburger"
                  active={props.isScreenOpen}
                  onclick={props.onToggleScreen}
                />
                {props.navBarContentAfter}
              </div>
            </div>
          </div>
        </div>
        <div class="divider">
          <div class="divider-line" />
        </div>
      </div>
    )
  }
})
