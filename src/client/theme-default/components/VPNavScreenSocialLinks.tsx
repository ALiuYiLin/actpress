import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export const VPNavScreenSocialLinks = defineComponent(function () {
  const { theme } = useData()

  return function () {
    if (!theme.value.socialLinks) return null
    return (
      <VPSocialLinks
        class="VPNavScreenSocialLinks"
        links={theme.value.socialLinks}
      />
    )
  }
})
