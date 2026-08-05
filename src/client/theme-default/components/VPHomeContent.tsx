import { defineComponent, ref } from 'actview'
import { inBrowser } from 'vitepress'

/** 手写 useWindowSize（替代 @vueuse/core，仅关注宽度） */
function useWindowWidth() {
  const width = ref(inBrowser ? window.innerWidth : 0)
  if (inBrowser) {
    const onResize = () => {
      width.value = window.innerWidth
    }
    window.addEventListener('resize', onResize, { passive: true })
  }
  return width
}

export interface VPHomeContentProps {
  children?: any
}

export const VPHomeContent = defineComponent(function (
  props: VPHomeContentProps = {}
) {
  const vw = useWindowWidth()

  return function () {
    return (
      <div
        class="vp-doc container"
        style={
          vw.value
            ? ({ '--vp-offset': `calc(50% - ${vw.value / 2}px)` } as any)
            : {}
        }
      >
        {props.children}
      </div>
    )
  }
})
