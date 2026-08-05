import { ref, watch } from 'actview'
import { useRoute } from 'vitepress'
import { useData } from '../composables/data'

export function VPSkipLink() {
  const { theme } = useData()
  const route = useRoute()
  const backToTop = ref<HTMLElement | undefined>(undefined)

  watch(
    () => route.path,
    () => backToTop.value?.focus()
  )

  return (
    <>
      <span ref={backToTop} tabindex="-1" />
      <a href="#VPContent" class="VPSkipLink visually-hidden">
        {theme.value.skipToContentLabel || 'Skip to content'}
      </a>
    </>
  )
}
