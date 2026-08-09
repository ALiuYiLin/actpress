import '../styles/components/VPDocFooter.css?scoped'
import { computed } from 'actview'
import { useData } from '../composables/data'
import { useEditLink } from '../composables/edit-link'
import { usePrevNext } from '../composables/prev-next'
import { VPLink } from './VPLink'
import { VPDocFooterLastUpdated } from './VPDocFooterLastUpdated'

export interface VPDocFooterProps {
  docFooterBefore?: any
}

export function VPDocFooter(props: VPDocFooterProps = {}) {
  const { theme, page, frontmatter } = useData()

  const editLink = useEditLink()
  const control = usePrevNext()

  const hasEditLink = computed(
    () => theme.value.editLink && frontmatter.value.editLink !== false
  )
  const hasLastUpdated = computed(() => page.value.lastUpdated)
  const showFooter = computed(
    () =>
      hasEditLink.value ||
      hasLastUpdated.value ||
      control.value.prev?.link ||
      control.value.next?.link
  )

  return showFooter.value ? (
    <footer class="VPDocFooter">
      {props.docFooterBefore}
      {hasEditLink.value || hasLastUpdated.value ? (
        <div class="edit-info">
          {hasEditLink.value ? (
            <div class="edit-link">
              <VPLink class="edit-link-button" href={editLink.value.url} noIcon>
                <span class="vpi-square-pen edit-link-icon" />
                {editLink.value.text}
              </VPLink>
            </div>
          ) : null}
          {hasLastUpdated.value ? (
            <div class="last-updated">
              <VPDocFooterLastUpdated />
            </div>
          ) : null}
        </div>
      ) : null}

      {control.value.prev?.link || control.value.next?.link ? (
        <nav class="prev-next" aria-labelledby="doc-footer-aria-label">
          <span class="visually-hidden" id="doc-footer-aria-label">
            Pager
          </span>
          <div class="pager">
            {control.value.prev?.link ? (
              <VPLink class="pager-link prev" href={control.value.prev.link}>
                {/* 原 v-html：文本渲染 */}
                <span class="desc">
                  {theme.value.docFooter?.prev || 'Previous page'}
                </span>
                <span class="title">{control.value.prev.text}</span>
              </VPLink>
            ) : null}
          </div>
          <div class="pager">
            {control.value.next?.link ? (
              <VPLink class="pager-link next" href={control.value.next.link}>
                <span class="desc">
                  {theme.value.docFooter?.next || 'Next page'}
                </span>
                <span class="title">{control.value.next.text}</span>
              </VPLink>
            ) : null}
          </div>
        </nav>
      ) : null}
    </footer>
  ) : null
}
