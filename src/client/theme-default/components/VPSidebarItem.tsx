import '../styles/components/VPSidebarItem.css?scoped'
import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { useSidebarItemControl } from '../composables/sidebar'
import { decode } from '../support/sidebar'
import { VPLink } from './VPLink'

export interface VPSidebarItemProps {
  item: DefaultTheme.SidebarItem
  depth: number
}

// defineComponent + JSX：动态 tag（section/h/a/div/p）在 render 期经
// <component is> 解析（函数体=setup 只跑一次，Tag 常量会被渲染闭包快照，
// props 变化后不更新——见 design/setup-snapshot.md）
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

  const itemRole = computed(() => (isLink.value ? undefined : 'button'))
  // render 期求值（JSX 内调用）：函数体=setup 只跑一次，派生值必须每次重渲染重新计算
  const textTagAttrs = () => ({
    is:
      !hasChildren.value || props.depth + 2 === 7 ? 'p' : `h${props.depth + 2}`,
    class: 'text',
    dangerouslySetInnerHTML: { __html: decode(props.item.text ?? '') }
  })
  const classes = computed(() =>
    [
      `level-${props.depth}`,
      collapsible.value ? 'collapsible' : '',
      collapsed.value ? 'collapsed' : '',
      isLink.value ? 'is-link' : '',
      isActiveLink.value ? 'is-active' : '',
      hasActiveLink.value ? 'has-active' : ''
    ]
      .filter(Boolean)
      .join(' ')
  )

  const onItemInteraction = (e: MouseEvent | KeyboardEvent) => {
    if ('key' in e && e.key !== 'Enter') return
    !props.item.link && toggle()
  }
  const onCaretClick = () => {
    props.item.link && toggle()
  }

  return (
    <component
      is={hasChildren.value ? 'section' : 'div'}
      class={['VPSidebarItem', classes.value].join(' ')}
    >
      {props.item.text ? (
        <div
          class="item"
          role={itemRole.value}
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
              tag={isLink.value ? 'a' : 'div'}
              class="link"
              href={props.item.link}
              rel={props.item.rel}
              target={props.item.target}
            >
              {/* 原 v-html：配置文本可含 HTML 实体/标签，解码后按 innerHTML 渲染 */}
              <component {...(textTagAttrs() as any)} />
            </VPLink>
          ) : (
            <component {...(textTagAttrs() as any)} />
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
    </component>
  )
}
