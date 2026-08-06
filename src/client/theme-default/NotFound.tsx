import { withBase } from '@actview/press'
import { useData } from './composables/data'
import { useLangs } from './composables/langs'

export function NotFound() {
  const { theme } = useData()
  const { currentLang } = useLangs()

  return (
    <div class="NotFound">
      <p class="code">{theme.value.notFound?.code ?? '404'}</p>
      <h1 class="title">{theme.value.notFound?.title ?? 'PAGE NOT FOUND'}</h1>
      <div class="divider" />
      <blockquote class="quote">
        {theme.value.notFound?.quote ??
          "But if you don't change your direction, and if you keep looking, you may end up where you are heading."}
      </blockquote>

      <div class="action">
        <a
          class="link"
          href={withBase(theme.value.notFound?.link ?? currentLang.value.link)}
          aria-label={theme.value.notFound?.linkLabel ?? 'go to home'}
        >
          {theme.value.notFound?.linkText ?? 'Take me home'}
        </a>
      </div>
    </div>
  )
}
