import { inBrowser, onContentUpdated, useRoute } from 'vitepress'
import { computed, readonly, watch } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import type { InjectionKey } from 'vue'
import type { Ref } from 'vitepress'
import { getSidebar, getSidebarGroups } from '../support/sidebar'
import { shallowRef } from '../support/reactivity'
import { useData } from './data'
import { getHeaders } from './outline'
import { useCloseSidebarOnEscape } from './sidebar'

const headers = shallowRef<DefaultTheme.OutlineItem[]>([])
const sidebar = shallowRef<DefaultTheme.SidebarItem[]>([])

const is960 = shallowRef(false)

export function useLayout() {
  const { frontmatter, theme } = useData()

  const isHome = computed(() => {
    return !!(frontmatter.value.isHome ?? frontmatter.value.layout === 'home')
  })

  const hasSidebar = computed(() => {
    return (
      frontmatter.value.sidebar !== false &&
      sidebar.value.length > 0 &&
      !isHome.value
    )
  })

  const isSidebarEnabled = computed(() => hasSidebar.value && is960.value)

  const sidebarGroups = computed(() => {
    return hasSidebar.value ? getSidebarGroups(sidebar.value) : []
  })

  const hasAside = computed(() => {
    if (isHome.value) return false
    if (frontmatter.value.aside != null) return !!frontmatter.value.aside
    return theme.value.aside !== false
  })

  const leftAside = computed(() => {
    if (!hasAside.value) return false
    return frontmatter.value.aside == null
      ? theme.value.aside === 'left'
      : frontmatter.value.aside === 'left'
  })

  const hasLocalNav = computed(() => {
    return headers.value.length > 0
  })

  return {
    isHome,
    sidebar: readonly(sidebar),
    sidebarGroups,
    hasSidebar,
    isSidebarEnabled,
    hasAside,
    leftAside,
    headers: readonly(headers),
    hasLocalNav
  }
}

interface RegisterWatchersOptions {
  closeSidebar: () => void
}

export function registerWatchers({ closeSidebar }: RegisterWatchersOptions) {
  const { frontmatter, page, theme } = useData()

  // ActView watch 无 deep/flush 选项；getter 每次返回新数组 → 恒触发，
  // 与 Vue 版 deep+sync 的关键场景一致（immediate 由 options 提供）
  watch(
    () => [page.value.relativePath, theme.value.sidebar] as const,
    ([relativePath, sidebarConfig]) => {
      const newSidebar = sidebarConfig
        ? getSidebar(sidebarConfig, relativePath)
        : []
      if (JSON.stringify(newSidebar) !== JSON.stringify(sidebar.value)) {
        sidebar.value = newSidebar
      }
    },
    { immediate: true }
  )

  onContentUpdated(() => {
    headers.value = getHeaders(frontmatter.value.outline ?? theme.value.outline)
  })

  if (inBrowser) {
    is960.value = window.innerWidth >= 960
    window.addEventListener(
      'resize',
      () => {
        is960.value = window.innerWidth >= 960
      },
      { passive: true }
    )
  }

  const route = useRoute()
  watch(() => route.path, closeSidebar)

  watch(is960, closeSidebar)
  useCloseSidebarOnEscape(closeSidebar)
}

export interface LayoutInfo {
  heroImageSlotExists: Ref<boolean>
}

export const layoutInfoInjectionKey: InjectionKey<LayoutInfo> =
  Symbol('layout-info')
