import '../styles/components/VPLocalNavOutlineDropdown.css?scoped'
import { nextTick, ref, watch } from 'actview'
import { inBrowser, onContentUpdated } from '@actview/press'
import type { DefaultTheme } from '@actview/press/theme'
import { useData } from '../composables/data'
import { resolveTitle } from '../composables/outline'
import { VPDocOutlineItem } from './VPDocOutlineItem'

export interface VPLocalNavOutlineDropdownProps {
  headers: DefaultTheme.OutlineItem[]
  navHeight: number
}

export function VPLocalNavOutlineDropdown(
  props: VPLocalNavOutlineDropdownProps
) {
  const { theme } = useData()
  const open = ref(false)
  const vh = ref(0)
  const main = ref<HTMLDivElement | undefined>(undefined)
  const items = ref<HTMLDivElement | undefined>(undefined)

  function closeOnClickOutside(e: Event) {
    if (!main.value?.contains(e.target as Node)) {
      open.value = false
    }
  }

  watch(open, (value) => {
    if (value) {
      document.addEventListener('click', closeOnClickOutside)
      return
    }
    document.removeEventListener('click', closeOnClickOutside)
  })

  // onKeyStroke('Escape') 手写（替代 @vueuse/core）；node 静态生成期不监听
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') open.value = false
  }
  if (inBrowser) document.addEventListener('keydown', onKeydown)

  onContentUpdated(() => {
    open.value = false
  })

  function toggle() {
    open.value = !open.value
    vh.value =
      window.innerHeight + Math.min(window.scrollY - props.navHeight, 0)
  }

  function onItemClick(e: Event) {
    if ((e.target as HTMLElement).classList.contains('outline-link')) {
      // disable animation on hash navigation when page jumps
      if (items.value) {
        items.value.style.transition = 'none'
      }
      nextTick(() => {
        open.value = false
      })
    }
  }

  function scrollToTop() {
    open.value = false
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  return (
    <div
      class="VPLocalNavOutlineDropdown"
      style={{ '--vp-vh': vh.value + 'px' } as any}
      ref={main}
    >
      {props.headers.length > 0 ? (
        <button class={open.value ? 'open' : ''} onclick={toggle}>
          <span class="menu-text">{resolveTitle(theme.value)}</span>
          <span class="vpi-chevron-right icon" />
        </button>
      ) : (
        <button onclick={scrollToTop}>
          {theme.value.returnToTopLabel || 'Return to top'}
        </button>
      )}
      {/* Vue 版 <Transition name="flyout">；ActView Transition 无动画语义，直接条件渲染 */}
      {open.value ? (
        <div ref={items} class="items" onclick={onItemClick}>
          <div class="header">
            <a class="top-link" href="#" onclick={scrollToTop}>
              {theme.value.returnToTopLabel || 'Return to top'}
            </a>
          </div>
          <div class="outline">
            <VPDocOutlineItem headers={props.headers} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
