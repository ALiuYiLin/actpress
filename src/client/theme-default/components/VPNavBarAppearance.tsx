import '../styles/components/VPNavBarAppearance.css?scoped'
import { useData } from '../composables/data'
import { VPSwitchAppearance } from './VPSwitchAppearance'

// 显式 defineComponent：render 内允许早退 return null
export function VPNavBarAppearance(props: any) {
  const { site } = useData()

  const appearance = site.value.appearance
  if (
    !appearance ||
    appearance === 'force-dark' ||
    appearance === 'force-auto'
  ) {
    return null
  }
  return (
    <div class={['VPNavBarAppearance', props.class].filter(Boolean).join(' ')}>
      <VPSwitchAppearance />
    </div>
  )
}
