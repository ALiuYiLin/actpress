import '../styles/components/VPDocAsideOutline.css?scoped'
import { ref } from 'actview'
import { useData } from '../composables/data'
import { resolveTitle, useActiveAnchor } from '../composables/outline'
import { useLayout } from '../composables/layout'
import { VPDocOutlineItem } from './VPDocOutlineItem'

export function VPDocAsideOutline(props: any) {
  const { theme } = useData()

  const container = ref<HTMLElement | undefined>(undefined)
  const marker = ref<HTMLElement | undefined>(undefined)

  const { headers, hasLocalNav } = useLayout()

  useActiveAnchor(container, marker)

  return (
    <nav
      aria-labelledby="doc-outline-aria-label"
      class={['VPDocAsideOutline', hasLocalNav.value ? 'has-outline' : '']
        .filter(Boolean)
        .join(' ')}
      ref={container}
    >
      <div class="content">
        <div class="outline-marker" ref={marker} />
        <div
          aria-level="2"
          class="outline-title"
          id="doc-outline-aria-label"
          role="heading"
        >
          {resolveTitle(theme.value)}
        </div>
        <VPDocOutlineItem headers={headers.value} root />
      </div>
    </nav>
  )
}
