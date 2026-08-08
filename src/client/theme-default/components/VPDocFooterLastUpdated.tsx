import { computed, onMounted, ref, watchEffect } from 'actview'
import { useData } from '../composables/data'

/** 手写 useNavigatorLanguage（替代 @vueuse/core） */
function useNavigatorLanguage() {
  return { language: ref(navigator.language) }
}

export function VPDocFooterLastUpdated(props: any) {
  const { theme, page, lang: pageLang } = useData()
  const { language: browserLang } = useNavigatorLanguage()

  const timeRef = ref<HTMLElement | undefined>(undefined)

  const date = computed(() => new Date(page.value.lastUpdated!))
  const isoDatetime = computed(() => date.value.toISOString())
  const datetime = ref('')

  // set time on mounted hook to avoid hydration mismatch due to
  // potential differences in timezones of the server and clients
  onMounted(() => {
    watchEffect(() => {
      const lang = theme.value.lastUpdated?.formatOptions?.forceLocale
        ? pageLang.value
        : browserLang.value

      datetime.value = new Intl.DateTimeFormat(
        lang,
        theme.value.lastUpdated?.formatOptions ?? {
          dateStyle: 'medium',
          timeStyle: 'medium'
        }
      ).format(date.value)

      if (lang && pageLang.value !== lang) {
        timeRef.value?.setAttribute('lang', lang)
      } else {
        timeRef.value?.removeAttribute('lang')
      }
    })
  })

  return (
    <p class="VPLastUpdated">
      {theme.value.lastUpdated?.text ||
        theme.value.lastUpdatedText ||
        'Last updated'}
      :
      <time ref={timeRef} datetime={isoDatetime.value}>
        {datetime.value}
      </time>
    </p>
  )
}
