import '../styles/components/VPSidebar.css?scoped'
import { ref, watch } from 'actview'
import { inBrowser } from '@actview/press'
import { useLayout } from '../composables/layout'
import { VPSidebarGroup } from './VPSidebarGroup'

/** 手写 useScrollLock（替代 @vueuse/core）：锁定元素滚动 */
function useScrollLock(element: HTMLElement | null) {
  const isLocked = ref(false)
  watch(isLocked, (v) => {
    if (!element) return
    element.style.overflow = v ? 'hidden' : ''
  })
  return isLocked
}

export interface VPSidebarProps {
  open?: boolean
  sidebarNavBefore?: any
  sidebarNavAfter?: any
}

export function VPSidebar(props: VPSidebarProps = {}) {
  const { sidebarGroups, hasSidebar } = useLayout()

  // a11y: focus Nav element when menu has opened
  const navEl = ref<HTMLElement | null>(null)
  const isLocked = useScrollLock(inBrowser ? document.body : null)

  watch(
    [() => props.open, navEl],
    () => {
      if (props.open) {
        isLocked.value = true
        navEl.value?.focus()
      } else isLocked.value = false
    },
    { immediate: true }
  )

  const key = ref(0)
  watch(sidebarGroups, () => {
    key.value += 1
  })

  return hasSidebar.value ? (
    <aside
      class={['VPSidebar', props.open ? 'open' : ''].join(' ')}
      ref={navEl}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="curtain" />
      <nav
        class="nav"
        id="VPSidebarNav"
        aria-labelledby="sidebar-aria-label"
        tabindex="-1"
      >
        <span class="visually-hidden" id="sidebar-aria-label">
          Sidebar Navigation
        </span>
        {props.sidebarNavBefore}
        <VPSidebarGroup items={sidebarGroups.value} key={key.value} />
        {props.sidebarNavAfter}
      </nav>
    </aside>
  ) : null
}
