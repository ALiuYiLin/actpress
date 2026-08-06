import { defineComponent, ref } from 'actview'
import { inBrowser } from '@actview/press'
import { useLayout } from '../composables/layout'
import { VPNavBarAppearance } from './VPNavBarAppearance'
import { VPNavBarAskAiButton } from './VPNavBarAskAiButton'
import { VPNavBarExtra } from './VPNavBarExtra'
import { VPNavBarHamburger } from './VPNavBarHamburger'
import { VPNavBarMenu } from './VPNavBarMenu'
import { VPNavBarSearch } from './VPNavBarSearch'
import { VPNavBarSocialLinks } from './VPNavBarSocialLinks'
import { VPNavBarTitle } from './VPNavBarTitle'
import { VPNavBarTranslations } from './VPNavBarTranslations'

/** 手写 useWindowScroll（替代 @vueuse/core） */
function useWindowScroll() {
  const x = ref(inBrowser ? window.scrollX : 0)
  const y = ref(inBrowser ? window.scrollY : 0)
  if (inBrowser) {
    const onScroll = () => {
      x.value = window.scrollX
      y.value = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
  }
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
                <VPNavBarSearch class="search" />
                <VPNavBarTranslations class="translations" />
                <VPNavBarSocialLinks class="social-links" />
                <VPNavBarAppearance class="appearance" />
                <VPNavBarExtra class="extra" />
                <VPNavBarAskAiButton class="ask-ai" />
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
