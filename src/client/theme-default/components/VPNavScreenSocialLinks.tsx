import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export function VPNavScreenSocialLinks() {
  const { theme } = useData()

  return (
    <>
      {theme.value.socialLinks ? (
        <VPSocialLinks
          class="VPNavScreenSocialLinks"
          links={theme.value.socialLinks}
        />
      ) : null}
    </>
  )
}
