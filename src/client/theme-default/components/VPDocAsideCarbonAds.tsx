import { defineComponent } from 'actview'
import type { DefaultTheme } from 'actpress/theme'
import { VPCarbonAds } from './VPCarbonAds'

export interface VPDocAsideCarbonAdsProps {
  carbonAds: DefaultTheme.CarbonAdsOptions
}

export const VPDocAsideCarbonAds = defineComponent(function (
  props: VPDocAsideCarbonAdsProps
) {
  return function () {
    return (
      <div class="VPDocAsideCarbonAds">
        <VPCarbonAds carbonAds={props.carbonAds} />
      </div>
    )
  }
})
