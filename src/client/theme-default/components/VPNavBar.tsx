import { createElement } from '@actview/jsx'
import { defineComponent, ref } from 'actview'
import { useLayout } from '../composables/layout'
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
    return createElement(
      'div',
      {
        class: [
          'VPNavBar',
          hasSidebar.value ? 'has-sidebar' : '',
          isHome.value ? 'home' : '',
          y.value === 0 ? 'top' : '',
          props.isScreenOpen ? 'screen-open' : ''
        ]
          .filter(Boolean)
          .join(' ')
      },
      createElement(
        'div',
        { class: 'wrapper' },
        createElement(
          'div',
          { class: 'container' },
          createElement(
            'div',
            { class: 'title' },
            createElement(VPNavBarTitle, {
              navBarTitleBefore: props.navBarTitleBefore,
              navBarTitleAfter: props.navBarTitleAfter
            })
          ),
          createElement(
            'div',
            { class: 'content' },
            createElement(
              'div',
              { class: 'content-body' },
              props.navBarContentBefore,
              createElement(VPNavBarMenu, { class: 'menu' }),
              // TODO(C): VPNavBarSearch / VPNavBarTranslations /
              // VPNavBarAppearance / VPNavBarSocialLinks / VPNavBarExtra
              // 尚未迁移（后续批次）
              createElement(VPNavBarHamburger, {
                class: 'hamburger',
                active: props.isScreenOpen,
                onclick: props.onToggleScreen
              }),
              props.navBarContentAfter
            )
          )
        )
      ),
      createElement(
        'div',
        { class: 'divider' },
        createElement('div', { class: 'divider-line' })
      )
    )
  }
})
