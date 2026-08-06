// 本地搜索框（ActView 最小可用版）
//
// 相对 Vue 原版（~900 行）的取舍：
// - 去掉：web worker 构建、focus-trap（@vueuse/integrations）、详细视图
//   （fetchExcerpt 挂载页面组件提取标题，依赖 provide/createApp）、
//   mark.js 高亮（改用手写高亮拆分）、本地存储的展示偏好
// - 保留：minisearch 索引加载、防抖搜索、键盘导航（↑↓/Enter/Escape）、
//   结果高亮、遮罩点击/返回按钮关闭
// - close 通过 props.onClose 回调（ActView 无组件事件 emit）

import { defineComponent, onMounted, ref, watch } from 'actview'
import type { SearchResult } from 'minisearch'
import { useRouter } from 'actpress'
import { Teleport } from 'actview'
import { escapeRegExp } from '../../shared'
import { useData } from '../composables/data'

interface Result {
  title: string
  titles: string[]
  text?: string
}

export interface VPLocalSearchBoxProps {
  onClose?: () => void
}

const resultsLimit = 16

export const VPLocalSearchBox = defineComponent(function (
  props: VPLocalSearchBoxProps
) {
  const { localeIndex } = useData()
  const router = useRouter()

  const searchInput = ref<HTMLInputElement | undefined>(undefined)
  const filterText = ref('')
  const results = ref<(SearchResult & Result)[]>([])
  const enableNoResults = ref(false)
  const selectedIndex = ref(-1)
  const loading = ref(true)

  const close = () => props.onClose?.()

  // ---- 索引加载（原版 computedAsync + MiniSearch.loadJSON）----
  const indexRef = ref<any>(undefined)
  const loadIndex = async () => {
    try {
      const data = (await await import('@localSearchIndex')) as any
      const loader = data.default?.[localeIndex.value]
      const json = loader ? (await loader())?.default : undefined
      if (!json) {
        indexRef.value = undefined
        return
      }
      const MiniSearch = (await import('minisearch')).default
      indexRef.value = MiniSearch.loadJSON<Result>(json, {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 }
        }
      })
    } catch (e) {
      console.error('[vitepress] local search index load failed', e)
    } finally {
      loading.value = false
    }
  }

  // ---- 搜索（原版 watchDebounced 核心，去详细视图）----
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  watch(filterText, () => {
    enableNoResults.value = false
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const index = indexRef.value
      if (!index) return
      results.value = index
        .search(filterText.value)
        .slice(0, resultsLimit) as (SearchResult & Result)[]
      enableNoResults.value = true
    }, 200)
  })

  // ---- 键盘导航 ----
  const scrollToSelectedResult = () => {
    document
      .querySelector('.result.selected')
      ?.scrollIntoView({ block: 'nearest' })
  }

  const selectPreviousResult = (event: KeyboardEvent) => {
    event.preventDefault()
    selectedIndex.value--
    scrollToSelectedResult()
  }
  const selectNextResult = (event: KeyboardEvent) => {
    event.preventDefault()
    selectedIndex.value++
    scrollToSelectedResult()
  }
  const goToSelectedResult = (event: KeyboardEvent) => {
    event.preventDefault()
    const selected = results.value[selectedIndex.value]
    if (selected) {
      router.go(selected.id)
      close()
    }
  }

  watch(results, (r) => {
    selectedIndex.value = r.length ? 0 : -1
  })

  const onKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        selectNextResult(event)
        break
      case 'ArrowUp':
        selectPreviousResult(event)
        break
      case 'Enter':
        goToSelectedResult(event)
        break
      case 'Escape':
        event.preventDefault()
        close()
        break
    }
  }

  onMounted(() => {
    loadIndex()
    searchInput.value?.focus()
    // '/' 快捷键聚焦搜索（手写，替代 @vueuse/core onKeyStroke）
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === '/' && !isEditingContent(event)) {
        event.preventDefault()
        searchInput.value?.focus()
      }
    }
    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  })

  // ---- 高亮（原版 mark.js → 手写拆分）----
  const highlight = (text: string) => {
    const query = filterText.value.trim()
    if (!query) return [text]
    const q = escapeRegExp(query)
    if (!q) return [text]
    const re = new RegExp(`(${q})`, 'ig')
    return text
      .split(re)
      .map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
  }

  return function () {
    return (
      <Teleport to="body">
        <div
          class="VPLocalSearchBox"
          role="button"
          aria-expanded="true"
          aria-haspopup="listbox"
          aria-labelledby="localsearch-label"
        >
          <div class="backdrop" onclick={close} />

          <div class="shell">
            <form
              class="search-bar"
              onsubmit={(e: Event) => e.preventDefault()}
            >
              <label
                id="localsearch-label"
                for="localsearch-input"
                title="Search"
              >
                <span
                  aria-hidden="true"
                  class="vpi-search search-icon local-search-icon"
                />
              </label>
              <div class="search-actions before">
                <button class="back-button" title="Go back" onclick={close}>
                  <span class="vpi-arrow-left local-search-icon" />
                </button>
              </div>
              <input
                ref={searchInput}
                value={filterText.value}
                oninput={(e: Event) => {
                  filterText.value = (e.target as HTMLInputElement).value
                }}
                onkeydown={onKeydown}
                aria-activedescendant={
                  selectedIndex.value > -1
                    ? `localsearch-item-${selectedIndex.value}`
                    : undefined
                }
                aria-autocomplete="both"
                aria-controls={
                  results.value.length ? 'localsearch-list' : undefined
                }
                aria-labelledby="localsearch-label"
                autocapitalize="off"
                autocomplete="off"
                autocorrect="off"
                class="search-input"
                id="localsearch-input"
                enterkeyhint="go"
                maxLength={64}
                placeholder="Search"
                spellcheck={false}
                type="search"
              />
              <div class="search-actions">
                <button
                  class="clear-button"
                  type="reset"
                  disabled={filterText.value.length <= 0}
                  title="Clear search"
                  onclick={() => {
                    filterText.value = ''
                    searchInput.value?.focus()
                  }}
                >
                  <span class="vpi-delete local-search-icon" />
                </button>
              </div>
            </form>

            {loading.value ? (
              <div class="search-no-results">Loading index…</div>
            ) : !filterText.value.trim() ? (
              <div class="search-no-results">Search</div>
            ) : results.value.length ? (
              <ul
                id="localsearch-list"
                role="listbox"
                aria-labelledby="localsearch-label"
                class="results"
              >
                {results.value.map((p, index) => (
                  <li
                    key={p.id}
                    id={`localsearch-item-${index}`}
                    aria-selected={
                      selectedIndex.value === index ? 'true' : 'false'
                    }
                    role="option"
                  >
                    <a
                      href={p.id}
                      class={[
                        'result',
                        selectedIndex.value === index ? 'selected' : ''
                      ].join(' ')}
                      onmouseenter={() => {
                        selectedIndex.value = index
                      }}
                      onclick={(e: Event) => {
                        e.preventDefault()
                        router.go(p.id)
                        close()
                      }}
                    >
                      <div class="title">
                        {highlight(p.title)}
                        <span class="title-icon" />
                      </div>
                      {p.titles.length > 1 ? (
                        <div class="titles">
                          {p.titles.slice(0, -1).map((t, i) => (
                            <span key={i} class="title-icon">
                              {highlight(t)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div class="search-no-results">No results found</div>
            )}
          </div>
        </div>
      </Teleport>
    )
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
