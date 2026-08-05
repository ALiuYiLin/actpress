import { computed } from 'actview'
import type { Ref } from 'vitepress'
import { useData } from './data'

export function useEditLink(): Ref<{ url: string; text: string }> {
  const { theme, page } = useData()

  return computed(() => {
    const { text = 'Edit this page', pattern = '' } = theme.value.editLink || {}
    let url: string
    if (typeof pattern === 'function') {
      url = pattern(page.value)
    } else {
      url = pattern.replace(/:path/g, page.value.filePath)
    }

    return { url, text }
  })
}
