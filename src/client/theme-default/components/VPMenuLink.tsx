import '../styles/components/VPMenuLink.css?scoped'
import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPLink } from './VPLink'

export interface VPMenuLinkProps {
  item: DefaultTheme.NavItemWithLink
  rel?: string
  [key: string]: any
}

export function VPMenuLink(props: VPMenuLinkProps) {
  const { page } = useData()

  const href = computed(() =>
    typeof props.item.link === 'function'
      ? props.item.link(page.value)
      : props.item.link
  )
  const isActiveLink = computed(() =>
    isActive(page.value.relativePath, href.value)
  )

  return (
    <div class="VPMenuLink">
      <VPLink
        class={isActiveLink.value ? 'active' : undefined}
        href={href.value}
        target={props.item.target}
        rel={props.rel ?? props.item.rel}
        noIcon={props.item.noIcon}
      >
        {/* 原 v-html：ActView 无 innerHTML，文本渲染（item.text 通常为纯文本） */}
        <span>{props.item.text ?? ''}</span>
      </VPLink>
    </div>
  )
}
