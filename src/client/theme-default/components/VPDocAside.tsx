import { useData } from '../composables/data'
import { VPDocAsideCarbonAds } from './VPDocAsideCarbonAds'
import { VPDocAsideOutline } from './VPDocAsideOutline'

export interface VPDocAsideProps {
  asideTop?: any
  asideBottom?: any
  asideOutlineBefore?: any
  asideOutlineAfter?: any
  asideAdsBefore?: any
  asideAdsAfter?: any
}

export function VPDocAside(props: VPDocAsideProps = {}) {
  const { theme } = useData()

  return (
    <div class="VPDocAside">
      {props.asideTop}
      {props.asideOutlineBefore}
      <VPDocAsideOutline />
      {props.asideOutlineAfter}

      <div class="spacer" />

      {props.asideAdsBefore}
      {theme.value.carbonAds ? (
        <VPDocAsideCarbonAds carbonAds={theme.value.carbonAds} />
      ) : null}
      {theme.value.carbonAds ? null : null}
      {props.asideAdsAfter}

      {props.asideBottom}
    </div>
  )
}
