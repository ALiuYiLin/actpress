import type { DefaultTheme } from '@actview/press/theme'
import { VPCarbonAds } from './VPCarbonAds'

export interface VPDocAsideCarbonAdsProps {
  carbonAds: DefaultTheme.CarbonAdsOptions
}

export function VPDocAsideCarbonAds(props: VPDocAsideCarbonAdsProps) {
  return (
    <div class="VPDocAsideCarbonAds">
      <VPCarbonAds carbonAds={props.carbonAds} />
    </div>
  )
}
