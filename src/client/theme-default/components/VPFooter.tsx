import '../styles/components/VPFooter.css?scoped'
import { computed } from 'actview'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'

export function VPFooter() {
  const { theme, frontmatter } = useData()
  const { hasSidebar } = useLayout()

  const footer = computed(() => theme.value.footer)

  return footer.value && frontmatter.value.footer !== false ? (
    <footer
      class={['VPFooter', hasSidebar.value ? 'has-sidebar' : ''].join(' ')}
    >
      <div class="container">
        {/* 原 v-html：ActView 无 innerHTML，文本渲染（footer.message/copyright 通常为纯文本） */}
        {footer.value?.message ? (
          <p class="message">{footer.value.message}</p>
        ) : null}
        {footer.value?.copyright ? (
          <p class="copyright">{footer.value.copyright}</p>
        ) : null}
      </div>
    </footer>
  ) : null
}
