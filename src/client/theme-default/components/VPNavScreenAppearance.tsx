import { useData } from '../composables/data'
import { VPSwitchAppearance } from './VPSwitchAppearance'

export function VPNavScreenAppearance() {
  const { site, theme } = useData()

  const appearance = site.value.appearance
  if (
    !appearance ||
    appearance === 'force-dark' ||
    appearance === 'force-auto'
  ) {
    return null
  }

  return (
    <div class="VPNavScreenAppearance">
      <p class="text">{theme.value.darkModeSwitchLabel || 'Appearance'}</p>
      <VPSwitchAppearance />
    </div>
  )
}
