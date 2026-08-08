import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { useSidebarItemControl } from '../composables/sidebar'
import { VPLink } from './VPLink'

export interface VPSidebarItemProps {
  item: DefaultTheme.SidebarItem
  depth: number
}

// defineComponent + JSX：动态 tag（section/h/a/div/p）用大写变量，递归渲染
export function VPSidebarItem(props: VPSidebarItemProps) {
  const {
    collapsed,
    collapsible,
    isLink,
    isActiveLink,
    hasActiveLink,
    hasChildren,
    toggle
  } = useSidebarItemControl(computed(() => props.item))

  const SectionTag: any = hasChildren.value ? 'section' : 'div'
  const LinkTag: any = isLink.value ? 'a' : 'div'
  const TextTag: any =
    !hasChildren.value || props.depth + 2 === 7 ? 'p' : `h${props.depth + 2}`
  const itemRole = isLink.value ? undefined : 'button'
  const classes = [
    `level-${props.depth}`,
    collapsible.value ? 'collapsible' : '',
    collapsed.value ? 'collapsed' : '',
    isLink.value ? 'is-link' : '',
    isActiveLink.value ? 'is-active' : '',
    hasActiveLink.value ? 'has-active' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const onItemInteraction = (e: MouseEvent | KeyboardEvent) => {
    if ('key' in e && e.key !== 'Enter') return
    !props.item.link && toggle()
  }
  const onCaretClick = () => {
    props.item.link && toggle()
  }

  return (
    <SectionTag class={['VPSidebarItem', classes].join(' ')}>
      {props.item.text ? (
        <div
          class="item"
          role={itemRole}
          {...(props.item.items
            ? {
                onclick: onItemInteraction,
                onkeydown: onItemInteraction,
                tabindex: 0
              }
            : {})}
        >
          <div class="indicator" />
          {props.item.link ? (
            <VPLink
              tag={LinkTag}
              class="link"
              href={props.item.link}
              rel={props.item.rel}
              target={props.item.target}
            >
              {/* 原 v-html：ActView 无 innerHTML，文本渲染 */}
              <TextTag class="text">{props.item.text ?? ''}</TextTag>
            </VPLink>
          ) : (
            <TextTag class="text">{props.item.text ?? ''}</TextTag>
          )}
          {props.item.collapsed != null &&
          props.item.items &&
          props.item.items.length ? (
            <div
              class="caret"
              role="button"
              aria-label="toggle section"
              onclick={onCaretClick}
              onkeydown={onCaretClick}
              tabindex="0"
            >
              <span class="vpi-chevron-right caret-icon" />
            </div>
          ) : null}
        </div>
      ) : null}
      {props.item.items && props.item.items.length && props.depth < 5 ? (
        <div class="items">
          {props.item.items.map((i) => (
            <VPSidebarItem key={i.text} item={i} depth={props.depth + 1} />
          ))}
        </div>
      ) : null}
    </SectionTag>
  )
}
