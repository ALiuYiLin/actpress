// @vitest-environment happy-dom
// 复现：docs 真实 nav（3 个 item：2 link + 1 group）渲染不应出现 <undefined>

import { describe, expect, it } from 'vitest'
import { renderToString } from 'actview'
import { initData } from 'client/app/data'
import { createRouter } from 'client/app/router'
import { VPNavBarMenu } from 'client/theme-default/components/VPNavBarMenu'

const docsNav = [
  { text: 'Guide', link: '/guide/what-is-vitepress', activeMatch: '/guide/' },
  {
    text: 'Reference',
    link: '/reference/site-config',
    activeMatch: '/reference/'
  },
  {
    text: '1.6.4',
    items: [
      { text: 'v1', link: 'https://example.com/v1/' },
      { text: 'Changelog', link: 'https://example.com/CHANGELOG.md' }
    ]
  }
]

async function renderNav() {
  const router = createRouter(async () => null)
  router.route.data = {
    title: 'Page',
    description: '',
    frontmatter: {},
    headers: [],
    relativePath: 'index.md',
    filePath: 'index.md',
    site: {
      base: '/',
      lang: 'en',
      title: 'Test',
      description: '',
      themeConfig: { nav: docsNav },
      locales: {}
    } as any
  } as any
  router.route.component = { __setup: () => () => null } as any
  initData(router.route)

  // 同步渲染组件 vnode 树（避免 mount 的 queueJob 时序）
  return await renderToString(VPNavBarMenu.__setup({})())
}

describe('VPNavBarMenu 真实 nav 渲染', () => {
  it('不渲染 <undefined>，且包含 Guide/Reference 链接', async () => {
    const html = await renderNav()
    console.log('RENDERED HTML:', html)
    expect(html).not.toContain('<undefined>')
    expect(html).toContain('Guide')
    expect(html).toContain('Reference')
  })
})
