import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'

export const VPFooter = defineComponent(function () {
  const { theme, frontmatter } = useData()
  const { hasSidebar } = useLayout()

  return function () {
    const footer = theme.value.footer
    if (!footer || frontmatter.value.footer === false) return null

    return (
      <footer
        class={['VPFooter', hasSidebar.value ? 'has-sidebar' : ''].join(' ')}
      >
        <div class="container">
          {/* 原 v-html：ActView 无 innerHTML，文本渲染（footer.message/copyright 通常为纯文本） */}
          {footer.message ? <p class="message">{footer.message}</p> : null}
          {footer.copyright ? (
            <p class="copyright">{footer.copyright}</p>
          ) : null}
        </div>
      </footer>
    )
  }
})
