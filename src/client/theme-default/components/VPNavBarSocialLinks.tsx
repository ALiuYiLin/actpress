import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export function VPNavBarSocialLinks(props: any = {}) {
  const { theme } = useData()

  return (
    <>
      {theme.value.socialLinks ? (
        <VPSocialLinks
          class="VPNavBarSocialLinks"
          links={theme.value.socialLinks}
        />
      ) : null}
    </>
  )
}
