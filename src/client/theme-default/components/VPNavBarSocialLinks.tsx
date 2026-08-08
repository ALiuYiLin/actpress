import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export function VPNavBarSocialLinks(props: any = {}) {
  const { theme } = useData()

  return function () {
    if (!theme.value.socialLinks) return null
    return (
      <VPSocialLinks
        class="VPNavBarSocialLinks"
        links={theme.value.socialLinks}
      />
    )
  }
}
