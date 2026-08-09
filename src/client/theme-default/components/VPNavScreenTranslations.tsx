import '../styles/components/VPNavScreenTranslations.css?scoped'
import { ref } from 'actview'
import { useLangs } from '../composables/langs'
import { VPLink } from './VPLink'

export function VPNavScreenTranslations() {
  const { localeLinks, currentLang } = useLangs({ correspondingLink: true })
  const isOpen = ref(false)
  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return (
    <>
      {localeLinks.value.length > 0 && !!currentLang.value.label ? (
        <div
          class={['VPNavScreenTranslations', isOpen.value ? 'open' : ''].join(
            ' '
          )}
        >
          <button class="title" onclick={toggle}>
            <span class="vpi-languages icon lang" />
            {currentLang.value.label}
            <span class="vpi-chevron-down icon chevron" />
          </button>
          <ul class="list">
            {localeLinks.value.map((locale) => (
              <li key={locale.link} class="item">
                <VPLink
                  class="link"
                  href={locale.link}
                  external={false}
                  lang={locale.lang}
                  hreflang={locale.lang}
                  rel="alternate"
                  dir={locale.dir}
                >
                  {locale.text}
                </VPLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
