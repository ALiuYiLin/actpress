import siteData from '@siteData'
import { computed, readonly, ref, shallowReactive, watch } from 'actview'
import type { InjectionKey } from '@actview/press'
import {
  APPEARANCE_KEY,
  createTitle,
  inBrowser,
  resolveSiteDataByRoute,
  type Ref,
  type SiteData,
  type VitePressData
} from '../shared'
import type { Route } from './router'

// dataSymbol 仍被主题（VPLocalSearchBox.vue）以 Vue 的 app.provide 消费，
// 主题迁移后移除。这里仅保留类型层面的 vue 引用（编译期擦除）。
export const dataSymbol: InjectionKey<VitePressData> = Symbol()
export type { VitePressData } from '../shared'

/**
 * shallowRef：ActView 无 shallowRef，用 shallowReactive 包一层 { value } 模拟。
 * 只代理容器层，内部值（如 siteData 大对象）不做深度代理。
 */
function shallowRef<T>(value: T): Ref<T> {
  const state = shallowReactive({ value, __v_isRef: true })
  return state as unknown as Ref<T>
}

// site data is a singleton
export const siteDataRef: Ref<SiteData> = shallowRef(
  readonly(siteData) as SiteData
)

// ------------------------------------------------------------
// 手写 usePreferredDark / useDark（替代 @vueuse/core）
// ------------------------------------------------------------

function usePreferredDark(): Ref<boolean> {
  const media = inBrowser
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
  const isDark = ref(media?.matches ?? false)
  if (media) {
    const onChange = (e: MediaQueryListEvent) => {
      isDark.value = e.matches
    }
    media.addEventListener('change', onChange)
  }
  return isDark
}

function useDark(options: Record<string, any> = {}): {
  isDark: Ref<boolean>
  setAppearance: (v: 'dark' | 'light' | 'auto') => void
} {
  const storageKey = (options.storageKey as string) ?? APPEARANCE_KEY
  const initialValue =
    typeof options.initialValue === 'function'
      ? options.initialValue()
      : ((options.initialValue as string | undefined) ?? 'auto')
  const stored = inBrowser ? localStorage.getItem(storageKey) : null
  const preference = ref(stored ?? initialValue)
  const preferredDark = usePreferredDark()
  const isDark = computed(
    () =>
      preference.value === 'dark' ||
      (preference.value === 'auto' && preferredDark.value)
  )
  // 同步 documentElement.dark class（主题暗色样式依赖）
  const syncClass = () => {
    if (inBrowser)
      document.documentElement.classList.toggle('dark', isDark.value)
  }
  if (inBrowser) {
    watch(isDark, syncClass)
    syncClass()
    // 跨标签页同步偏好
    window.addEventListener('storage', (e) => {
      if (e.key === storageKey && e.newValue) {
        preference.value = e.newValue
      }
    })
  }
  // ActView 的 computed 只有 getter（只读），主题切换不能直接写 isDark.value
  // （会抛 "Cannot set property value ... only a getter"，Bug #3），
  // 必须写底层 preference 并持久化。
  const setAppearance = (value: 'dark' | 'light' | 'auto') => {
    preference.value = value
    if (inBrowser) localStorage.setItem(storageKey, value)
  }
  return { isDark, setAppearance }
}

// ------------------------------------------------------------
// per-app data — ActView 无 provide/inject，用模块级单例 context
// （VitePress app 是单实例，语义等价）
// ------------------------------------------------------------

let currentData: VitePressData | null = null

export function initData(route: Route): VitePressData {
  const site = computed(() =>
    resolveSiteDataByRoute(siteDataRef.value, route.data.relativePath)
  )

  const appearance = site.value.appearance // fine with reactivity being lost here, config change triggers a restart
  // ActView 的 computed 只有 getter，isDark 只读；主题切换须经 setAppearance
  // 写 useDark 的 preference（Bug #3）。force-dark/force-auto 时按钮不渲染，
  // setAppearance 保持 noop 仅用于类型完备。
  let setAppearance: (value: 'dark' | 'light' | 'auto') => void = () => {}
  let isDark: Ref<boolean>
  if (appearance === 'force-dark') {
    isDark = ref(true)
  } else if (appearance === 'force-auto') {
    isDark = usePreferredDark()
  } else if (appearance) {
    const dark = useDark({
      storageKey: APPEARANCE_KEY,
      initialValue: () => (appearance === 'dark' ? 'dark' : 'auto'),
      ...(typeof appearance === 'object' ? appearance : {})
    })
    isDark = dark.isDark
    setAppearance = dark.setAppearance
  } else {
    isDark = ref(false)
  }

  const hashRef = ref(inBrowser ? location.hash : '')

  if (inBrowser) {
    window.addEventListener('hashchange', () => {
      hashRef.value = location.hash
    })
  }

  watch(
    () => route.data,
    () => {
      hashRef.value = inBrowser ? location.hash : ''
    }
  )

  const data: VitePressData = {
    site,
    theme: computed(() => site.value.themeConfig),
    page: computed(() => route.data),
    frontmatter: computed(() => route.data.frontmatter),
    params: computed(() => route.data.params),
    lang: computed(() => site.value.lang),
    dir: computed(() => route.data.frontmatter.dir || site.value.dir),
    localeIndex: computed(() => site.value.localeIndex || 'root'),
    title: computed(() => createTitle(site.value, route.data)),
    description: computed(
      () => route.data.description || site.value.description
    ),
    isDark,
    setAppearance,
    hash: computed(() => hashRef.value)
  }

  currentData = data
  return data
}

export function useData<T = any>(): VitePressData<T> {
  if (!currentData) {
    throw new Error('vitepress data not properly initialized in app')
  }
  return currentData as VitePressData<T>
}
