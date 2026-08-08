import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export function VPNavBarSocialLinks(props: any = {}) {
  const { theme } = useData()

  if (!theme.value.socialLinks) return null
  return (
    <VPSocialLinks
      class="VPNavBarSocialLinks"
      links={theme.value.socialLinks}
    />
  )
}
