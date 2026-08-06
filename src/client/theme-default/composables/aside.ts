import { computed, ref } from 'actview'
import type { Ref } from '@actview/press'
import { inBrowser } from '../../shared'
import { useLayout } from './layout'

/** 手写 useMediaQuery（替代 @vueuse/core）：matchMedia + change 监听 */
function useMediaQuery(query: string): Ref<boolean> {
  const media = inBrowser ? window.matchMedia(query) : null
  const isMatch = ref(media?.matches ?? false)
  if (media) {
    const onChange = (e: MediaQueryListEvent) => {
      isMatch.value = e.matches
    }
    media.addEventListener('change', onChange)
  }
  return isMatch
}

export function useAside(): { isAsideEnabled: Ref<boolean> } {
  const { hasSidebar } = useLayout()
  const is960 = useMediaQuery('(min-width: 960px)')
  const is1280 = useMediaQuery('(min-width: 1280px)')

  const isAsideEnabled = computed(() => {
    if (!is1280.value && !is960.value) {
      return false
    }

    return hasSidebar.value ? is1280.value : is960.value
  })

  return {
    isAsideEnabled
  }
}
