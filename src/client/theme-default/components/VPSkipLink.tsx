import { createElement, Fragment } from '@actview/jsx'
import { defineComponent, ref, watch } from 'actview'
import { useRoute } from 'vitepress'
import { useData } from '../composables/data'

export const VPSkipLink = defineComponent(function (props: any) {
  const { theme } = useData()
  const route = useRoute()
  const backToTop = ref<HTMLElement | undefined>(undefined)

  watch(
    () => route.path,
    () => backToTop.value?.focus()
  )

  return function () {
    return createElement(
      Fragment,
      null,
      createElement('span', { ref: backToTop, tabindex: '-1' }),
      createElement(
        'a',
        { href: '#VPContent', class: 'VPSkipLink visually-hidden' },
        theme.value.skipToContentLabel || 'Skip to content'
      )
    )
  }
})
