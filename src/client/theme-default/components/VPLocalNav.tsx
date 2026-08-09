import '../styles/components/VPLocalNav.css?scoped'
import { onMounted, ref } from 'actview'
import { inBrowser } from '@actview/press'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'
import { VPLocalNavOutlineDropdown } from './VPLocalNavOutlineDropdown'

/** 手写 useWindowScroll（替代 @vueuse/core） */
function useWindowScroll() {
  const y = ref(inBrowser ? window.scrollY : 0)
  if (inBrowser) {
    const onScroll = () => {
      y.value = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  return { y }
}

export interface VPLocalNavProps {
  open?: boolean
  onOpenMenu?: () => void
}

export function VPLocalNav(props: VPLocalNavProps = {}) {
  const { theme } = useData()
  const { isHome, hasSidebar, headers, hasLocalNav } = useLayout()
  const { y } = useWindowScroll()

  const navHeight = ref(0)
  onMounted(() => {
    navHeight.value = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--vp-nav-height'
      )
    )
  })

  return isHome.value &&
    !(
      hasLocalNav.value ||
      hasSidebar.value ||
      y.value >= navHeight.value
    ) ? null : (
    <div
      class={[
        'VPLocalNav',
        hasSidebar.value ? 'has-sidebar' : '',
        !hasLocalNav.value ? 'empty' : '',
        !hasLocalNav.value && !hasSidebar.value ? 'fixed' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div class="container">
        {hasSidebar.value ? (
          <button
            class="menu"
            aria-expanded={props.open}
            aria-controls="VPSidebarNav"
            onclick={props.onOpenMenu}
          >
            <span class="vpi-align-left menu-icon" />
            <span class="menu-text">
              {theme.value.sidebarMenuLabel || 'Menu'}
            </span>
          </button>
        ) : null}
        <VPLocalNavOutlineDropdown
          headers={headers.value}
          navHeight={navHeight.value}
        />
      </div>
    </div>
  )
}
