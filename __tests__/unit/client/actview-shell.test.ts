// @vitest-environment happy-dom
import { createElement } from '@actview/jsx'
import { createApp } from 'actview'
import { initData } from 'client/app/data'
import { createRouter } from 'client/app/router'
import { Layout } from 'client/theme-default/Layout'
import { VPBadge } from 'client/theme-default/components/VPBadge'

describe('actview rendering shell (phase B smoke)', () => {
  it('renders a markdown page through Layout + Content', async () => {
    // md 页面组件（markdownToActView 产物形态）
    const pageComponent = {
      __setup: () => () =>
        createElement(
          'div',
          { class: 'vp-doc' },
          createElement('h1', null, 'Hello md page'),
          createElement('p', null, 'paragraph & text')
        )
    }

    const router = createRouter(async () => null)
    router.route.data = {
      title: 'Page',
      description: '',
      frontmatter: {},
      headers: [],
      relativePath: 'index.md',
      filePath: 'index.md'
    } as any
    router.route.component = pageComponent as any

    initData(router.route)

    const host = document.createElement('div')
    host.id = 'shell-host'
    document.body.appendChild(host)
    createApp(Layout).mount('#shell-host')

    const html = host.innerHTML
    expect(host.querySelector('.Layout')).toBeTruthy()
    expect(html).toContain('Hello md page')
    // 文本经 HTML 序列化正确转义
    expect(html).toContain('paragraph &amp; text')
    // 站点标题出现在顶栏
    expect(html).toContain('Test Site')
  })
})

describe('actview JSX component rendering', () => {
  it('renders a JSX function component (VPBadge) via actviewPlugin transform', () => {
    const host = document.createElement('div')
    host.id = 'badge-host'
    document.body.appendChild(host)
    createApp(VPBadge).mount('#badge-host')
    const span = host.querySelector('span')
    expect(span?.className).toBe('VPBadge tip')
  })
})
