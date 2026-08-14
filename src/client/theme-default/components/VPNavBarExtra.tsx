import '../styles/components/VPNavBarExtra.css?scoped'
import { computed } from 'actview'
import { useData } from '../composables/data'
import { useLangs } from '../composables/langs'
import { VPFlyout } from './VPFlyout'
import { VPMenuLink } from './VPMenuLink'
import { VPSocialLinks } from './VPSocialLinks'
import { VPSwitchAppearance } from './VPSwitchAppearance'

export function VPNavBarExtra(props: any) {
  const { site, theme } = useData()
  const { localeLinks, currentLang } = useLangs({ correspondingLink: true })

  const hasExtraContent = computed(() =>
    Boolean(
      (localeLinks.value.length > 0 && !!currentLang.value.label) ||
      site.value.appearance ||
      theme.value.socialLinks
    )
  )

  const appearance = computed(() => site.value.appearance)
  const showAppearance = computed(() => {
    const a = appearance.value
    return !!a && a !== 'force-dark' && a !== 'force-auto'
  })

  return hasExtraContent.value ? (
    <VPFlyout
      class={['VPNavBarExtra', props.class].filter(Boolean).join(' ')}
      label="extra navigation"
    >
      {localeLinks.value.length > 0 && !!currentLang.value.label ? (
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
      {showAppearance.value ? (
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
  ) : null
}
