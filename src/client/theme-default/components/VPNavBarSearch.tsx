// 导航搜索入口（ActView 版）
// 逻辑对齐 Vue 原版：algolia / local 两个 provider 分支 + 键盘快捷键
// （Ctrl/Cmd+K、Ctrl/Cmd+I(askAi)、'/'）；lazy 加载搜索框本体

import { computed, defineComponent, onMounted, onUnmounted, ref } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { useData } from '../composables/data'
import { resolveMode, resolveOptionsForLanguage } from '../support/docsearch'
import { smartComputed } from '../support/reactivity'
import { VPAlgoliaSearchBox } from './VPAlgoliaSearchBox'
import { VPNavBarAskAiButton } from './VPNavBarAskAiButton'
import { VPNavBarSearchButton } from './VPNavBarSearchButton'
import { VPLocalSearchBox } from './VPLocalSearchBox'

const provider = __ALGOLIA__ ? 'algolia' : __VP_LOCAL_SEARCH__ ? 'local' : ''

export const VPNavBarSearch = defineComponent(function (props: any = {}) {
  const { theme, localeIndex, lang } = useData()

  // #region Algolia
  const algoliaOptions = smartComputed<DefaultTheme.AlgoliaSearchOptions>(() =>
    resolveOptionsForLanguage(
      theme.value.search?.options || {},
      localeIndex.value,
      lang.value
    )
  )

  const resolvedMode = computed(() => resolveMode(algoliaOptions.value))

  type OpenTarget = 'search' | 'askAi' | 'toggleAskAi'
  type OpenRequest = { target: OpenTarget; nonce: number }
  const openRequest = ref<OpenRequest | null>(null)
  let openNonce = 0

  const loaded = ref(false)
  const actuallyLoaded = ref(false)

  function loadAndOpen(target: OpenTarget) {
    if (!loaded.value) {
      loaded.value = true
    }
    openRequest.value = { target, nonce: ++openNonce }
  }

  onMounted(() => {
    if (!__ALGOLIA__) return
    const id = 'VPAlgoliaPreconnect'
    if (document.getElementById(id)) return

    const appId =
      algoliaOptions.value.appId ||
      (typeof algoliaOptions.value.askAi === 'object'
        ? algoliaOptions.value.askAi?.appId
        : undefined)
    if (!appId) return

    const rIC = window.requestIdleCallback || setTimeout
    rIC(() => {
      const preconnect = document.createElement('link')
      preconnect.id = id
      preconnect.rel = 'preconnect'
      preconnect.href = `https://${appId}-dsn.algolia.net`
      preconnect.crossOrigin = ''
      document.head.appendChild(preconnect)
    })
  })

  if (__ALGOLIA__) {
    const onKeydown = (event: KeyboardEvent) => {
      if (
        resolvedMode.value.showKeywordSearch &&
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()
        loadAndOpen('search')
      }
    }
    // 原 Vue 版用 @vueuse onKeyStroke（onMounted 时机注册）；ActView 无全局
    // 事件工具，手写监听必须放 onMounted —— setup 顶层执行会在静态生成
    // （renderToString，node 环境）时引用 document 崩溃
    onMounted(() => document.addEventListener('keydown', onKeydown))
    onUnmounted(() => document.removeEventListener('keydown', onKeydown))
  }
  // #endregion

  // #region Local
  const showSearch = ref(false)

  if (__VP_LOCAL_SEARCH__) {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        showSearch.value = true
      } else if (event.key === '/' && !isEditingContent(event)) {
        event.preventDefault()
        showSearch.value = true
      }
    }
    onMounted(() => document.addEventListener('keydown', onKeydown))
    onUnmounted(() => document.removeEventListener('keydown', onKeydown))
  }
  // #endregion

  return function () {
    if (provider === 'algolia') {
      const searchOptions = algoliaOptions.value as any
      return (
        <div class="VPNavBarSearch">
          {resolvedMode.value.showKeywordSearch ? (
            <VPNavBarSearchButton
              text={searchOptions.translations?.button?.buttonText || 'Search'}
              onclick={() => loadAndOpen('search')}
            />
          ) : null}
          <VPNavBarAskAiButton />
          {loaded.value ? (
            <VPAlgoliaSearchBox
              algoliaOptions={algoliaOptions.value}
              openRequest={openRequest.value}
              onBeforeOpen={() => {
                actuallyLoaded.value = true
              }}
            />
          ) : null}
        </div>
      )
    }

    if (provider === 'local') {
      return (
        <div class="VPNavBarSearch">
          <VPNavBarSearchButton
            text="Search"
            onclick={() => {
              showSearch.value = true
            }}
          />
          {showSearch.value ? (
            <VPLocalSearchBox
              onClose={() => {
                showSearch.value = false
              }}
            />
          ) : null}
        </div>
      )
    }

    return <div class="VPNavBarSearch" />
  }
})

function isEditingContent(event: KeyboardEvent): boolean {
  const element = event.target as HTMLElement
  const tagName = element.tagName
  return (
    element.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'SELECT' ||
    tagName === 'TEXTAREA'
  )
}
