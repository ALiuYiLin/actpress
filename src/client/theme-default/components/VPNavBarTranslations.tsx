import '../styles/components/VPNavBarTranslations.css?scoped'
import { watch } from 'actview'
import { useData } from '../composables/data'
import { useLangs } from '../composables/langs'
import { VPFlyout } from './VPFlyout'
import { VPMenuLink } from './VPMenuLink'

export function VPNavBarTranslations(props: any = {}) {
  const { theme } = useData()
  const { localeLinks, currentLang } = useLangs({ correspondingLink: true })

  // 调试：切换语言时输出 localeLinks，观察数组是否累积
  watch(localeLinks, (val) => {
    console.log('[localeLinks]', JSON.stringify(val))
  })

  return localeLinks.value.length > 0 && !!currentLang.value.label ? (
    <VPFlyout
      class="VPNavBarTranslations"
      icon="vpi-languages"
      label={theme.value.langMenuLabel || 'Change language'}
    >
      <div class="items">
        <p class="title">{currentLang.value.label}</p>
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
    </VPFlyout>
  ) : null
}
