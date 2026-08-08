import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export function VPNavScreenSocialLinks() {
  const { theme } = useData()

  if (!theme.value.socialLinks) return null
  return (
    <VPSocialLinks
      class="VPNavScreenSocialLinks"
      links={theme.value.socialLinks}
    />
  )
}
