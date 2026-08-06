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

  const item = props.item
  const href =
    typeof item.link === 'function' ? item.link(page.value) : item.link
  const isActiveLink = isActive(page.value.relativePath, href)

  return (
    <div class="VPMenuLink">
      <VPLink
        class={isActiveLink ? 'active' : undefined}
        href={href}
        target={item.target}
        rel={props.rel ?? item.rel}
        noIcon={item.noIcon}
      >
        {/* 原 v-html：ActView 无 innerHTML，文本渲染（item.text 通常为纯文本） */}
        <span>{item.text ?? ''}</span>
      </VPLink>
    </div>
  )
}
