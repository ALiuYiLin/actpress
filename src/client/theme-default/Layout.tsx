// ============================================================
// Layout — ActView 版渲染主干（Layout.vue 迁移的中间态）
//
// B 阶段：最小可用结构（顶栏导航 + 侧边栏开关 + Content + 页脚），
// 保证 dev 端到端可用；完整主题视觉（VPNav/VPSidebar/VPDoc 等）在
// C 阶段逐个迁移 .vue 组件后恢复。
// ============================================================

import { createElement } from '@actview/jsx'
import { defineComponent, ref } from 'actview'
import { Content } from '../app/components/Content'
import { useData } from '../app/data'
import { withBase } from '../app/utils'
import { VPSkipLink } from './components/VPSkipLink'

function renderSidebarItems(items: any[] | undefined, indent: number): any[] {
  if (!Array.isArray(items)) return []
  return items.flatMap((item) => {
    if (typeof item === 'string') {
      return [
        createElement(
          'div',
          { class: 'sidebar-group', style: { marginLeft: indent * 12 + 'px' } },
          item
        )
      ]
    }
    if (item.text && item.link) {
      return [
        createElement(
          'a',
          {
            class: 'sidebar-link',
            style: { display: 'block', marginLeft: indent * 12 + 'px' },
            href: withBase(item.link)
          },
          item.text
        ),
        ...renderSidebarItems(item.items, indent + 1)
      ]
    }
    if (item.text) {
      return [
        createElement(
          'div',
          {
            class: 'sidebar-heading',
            style: { marginLeft: indent * 12 + 'px' }
          },
          item.text
        ),
        ...renderSidebarItems(item.items, indent + 1)
      ]
    }
    return []
  })
}

export const Layout = defineComponent(function (props: any) {
  const { site, theme, frontmatter } = useData()
  const sidebarOpen = ref(false)
  const openSidebar = () => {
    sidebarOpen.value = true
  }
  const closeSidebar = () => {
    sidebarOpen.value = false
  }

  return function () {
    const fm = frontmatter.value
    // layout: false → 只渲染页面内容（如 md 内 layout: false）
    if (fm.layout === false) {
      return createElement(Content, null)
    }

    const navItems = theme.value.nav ?? []
    const sidebarConfig = theme.value.sidebar
    // 简化：数组直接渲染；对象按当前路径前缀匹配（多侧边栏）
    const sidebarItems =
      sidebarConfig &&
      typeof sidebarConfig === 'object' &&
      !Array.isArray(sidebarConfig)
        ? (Object.entries(sidebarConfig).find(([prefix]) =>
            location.pathname.startsWith(withBase(prefix))
          )?.[1] as any)
        : sidebarConfig
    const footer = theme.value.footer

    const external = (link: string) => /^https?:\/\//.test(link)

    return createElement(
      'div',
      {
        class: ['Layout', fm.pageClass].filter(Boolean).join(' '),
        style: { display: 'flex', flexDirection: 'column', minHeight: '100vh' }
      },
      createElement(VPSkipLink, null),
      sidebarOpen.value
        ? createElement('div', {
            class: 'backdrop',
            onclick: closeSidebar,
            style: {
              position: 'fixed',
              inset: '0',
              background: 'rgba(0,0,0,.3)',
              zIndex: 50
            }
          })
        : null,
      // 顶部导航（简化版）
      createElement(
        'header',
        {
          class: 'nav',
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 0',
            borderBottom: '1px solid #e2e8f0'
          }
        },
        createElement(
          'button',
          {
            class: 'menu',
            onclick: openSidebar,
            style: {
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              fontSize: '18px'
            }
          },
          '\u2630'
        ),
        createElement(
          'a',
          {
            class: 'nav-title',
            href: withBase('/'),
            style: { fontWeight: 700, textDecoration: 'none', color: 'inherit' }
          },
          site.value.title
        ),
        createElement(
          'nav',
          {
            class: 'nav-links',
            style: { display: 'flex', gap: '12px', marginLeft: 'auto' }
          },
          navItems.map((item: any) =>
            createElement(
              'a',
              {
                class: 'nav-link',
                href: external(item.link) ? item.link : withBase(item.link),
                target: external(item.link) ? '_blank' : undefined,
                rel: external(item.link) ? 'noreferrer' : undefined,
                style: { textDecoration: 'none', color: 'inherit' }
              },
              item.text
            )
          )
        )
      ),
      // 主体：侧边栏 + 内容
      createElement(
        'div',
        {
          class: 'layout-body',
          style: { display: 'flex', flex: 1, gap: '24px' }
        },
        createElement(
          'aside',
          {
            class: ['sidebar', sidebarOpen.value ? 'open' : ''].join(' '),
            style: {
              width: '240px',
              flexShrink: 0,
              padding: '12px 0',
              display: sidebarOpen.value ? 'block' : undefined
            }
          },
          ...renderSidebarItems(sidebarItems, 0)
        ),
        createElement(
          'main',
          {
            id: 'main-content',
            class: 'content',
            style: { flex: 1, minWidth: 0, padding: '16px 0' }
          },
          createElement(Content, null)
        )
      ),
      footer
        ? createElement(
            'footer',
            {
              class: 'footer',
              style: {
                borderTop: '1px solid #e2e8f0',
                padding: '12px 0',
                textAlign: 'center'
              }
            },
            typeof footer === 'string' ? footer : undefined
          )
        : null
    )
  }
})
