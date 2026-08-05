import { defineComponent, ref, watch } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { onMounted } from 'actview'
import { useAside } from '../composables/aside'
import { useData } from '../composables/data'

export interface VPCarbonAdsProps {
  carbonAds: DefaultTheme.CarbonAdsOptions
}

export const VPCarbonAds = defineComponent(function (props: VPCarbonAdsProps) {
  const { page } = useData()
  const carbonOptions = props.carbonAds
  const { isAsideEnabled } = useAside()
  const container = ref<HTMLElement | undefined>(undefined)

  let isInitialized = false

  function init() {
    if (!isInitialized) {
      isInitialized = true
      const params = new URLSearchParams({
        serve: carbonOptions.code,
        placement: carbonOptions.placement,
        format: carbonOptions?.format || 'classic'
      })
      const s = document.createElement('script')
      s.id = '_carbonads_js'
      s.src = `//cdn.carbonads.com/carbon.js?${params.toString()}`
      s.async = true
      container.value?.appendChild(s)
    }
  }

  watch(
    () => page.value.relativePath,
    () => {
      if (isInitialized && isAsideEnabled.value) {
        ;(window as any)._carbonads?.refresh()
      }
    }
  )

  if (carbonOptions) {
    onMounted(() => {
      if (isAsideEnabled.value) {
        init()
      } else {
        watch(isAsideEnabled, (wide) => wide && init())
      }
    })
  }

  return function () {
    return <div class="VPCarbonAds" ref={container} />
  }
})
