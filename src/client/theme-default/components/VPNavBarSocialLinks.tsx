import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { VPSocialLinks } from './VPSocialLinks'

export const VPNavBarSocialLinks = defineComponent(function (props: any = {}) {
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
})
