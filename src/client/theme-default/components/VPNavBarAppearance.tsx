import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { VPSwitchAppearance } from './VPSwitchAppearance'

// 显式 defineComponent：render 内允许早退 return null
export const VPNavBarAppearance = defineComponent(function (props: any) {
  const { site } = useData()

  return function () {
    const appearance = site.value.appearance
    if (
      !appearance ||
      appearance === 'force-dark' ||
      appearance === 'force-auto'
    ) {
      return null
    }
    return (
      <div class="VPNavBarAppearance">
        <VPSwitchAppearance />
      </div>
    )
  }
})
