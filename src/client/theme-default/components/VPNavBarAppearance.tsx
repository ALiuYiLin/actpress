import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { VPSwitchAppearance } from './VPSwitchAppearance'

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
    return createElement(
      'div',
      { class: 'VPNavBarAppearance' },
      createElement(VPSwitchAppearance, null)
    )
  }
})
