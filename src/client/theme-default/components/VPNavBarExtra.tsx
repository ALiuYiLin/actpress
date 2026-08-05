import { computed, defineComponent } from 'actview'
import { useData } from '../composables/data'
import { useLangs } from '../composables/langs'
import { VPFlyout } from './VPFlyout'
import { VPMenuLink } from './VPMenuLink'
import { VPSocialLinks } from './VPSocialLinks'
import { VPSwitchAppearance } from './VPSwitchAppearance'

export const VPNavBarExtra = defineComponent(function (props: any) {
  const { site, theme } = useData()
  const { localeLinks, currentLang } = useLangs({ correspondingLink: true })

  const hasExtraContent = computed(
    () =>
      (localeLinks.value.length && currentLang.value.label) ||
      site.value.appearance ||
      theme.value.socialLinks
  )

  return function () {
    if (!hasExtraContent.value) return null
    const appearance = site.value.appearance
    const showAppearance =
      appearance && appearance !== 'force-dark' && appearance !== 'force-auto'

    return (
      <VPFlyout class="VPNavBarExtra" label="extra navigation">
        {localeLinks.value.length && currentLang.value.label ? (
          <div class="group translations">
            <p class="trans-title">{currentLang.value.label}</p>
            {localeLinks.value.map((locale) => (
              <VPMenuLink
                key={locale.link}
                item={locale}
                external={false}
                lang={locale.lang}
                hreflang={locale.lang}
                rel="alternate"
                dir={locale.dir}
              />
            ))}
          </div>
        ) : null}
        {showAppearance ? (
          <div class="group">
            <div class="item appearance">
              <p class="label">
                {theme.value.darkModeSwitchLabel || 'Appearance'}
              </p>
              <div class="appearance-action">
                <VPSwitchAppearance />
              </div>
            </div>
          </div>
        ) : null}
        {theme.value.socialLinks ? (
          <div class="group">
            <div class="item social-links">
              <VPSocialLinks
                class="social-links-list"
                links={theme.value.socialLinks}
              />
            </div>
          </div>
        ) : null}
      </VPFlyout>
    )
  }
})
