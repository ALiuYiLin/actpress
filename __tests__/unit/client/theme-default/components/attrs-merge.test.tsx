// @vitest-environment happy-dom
// 回归测试：ActView 移除 attribute fallthrough（core 1.0.29，方案3）后，
// 组件需显式合并 class / 转发 attrs。覆盖：
//   A —— 根元素 class 合并（VPBackdrop / VPFeatures / VPHero(含 VPImage) / VPNavBarSearch / VPFlyout）
//   B —— class 转发给子组件（VPNavBarSocialLinks → VPSocialLinks）
//   C —— 未声明 attrs 转发（VPMenuLink → VPLink 的 hreflang/dir/lang）
//   D —— Content 恢复 vp-doc class 合并
// 断言目标：升级前后（旧运行时透传 vs 新运行时显式合并）渲染结果一致。

import { describe, expect, it } from 'vitest'
import { renderToString } from 'actview'
import { jsx } from '@actview/jsx'
import { initData, siteDataRef } from 'client/app/data'
import { createRouter } from 'client/app/router'
import { Content } from 'client/app/components/Content'
import { VPBackdrop } from 'client/theme-default/components/VPBackdrop'
import { VPFeatures } from 'client/theme-default/components/VPFeatures'
import { VPHero } from 'client/theme-default/components/VPHero'
import { VPFlyout } from 'client/theme-default/components/VPFlyout'
import { VPNavBarSearch } from 'client/theme-default/components/VPNavBarSearch'
import { VPNavBarSocialLinks } from 'client/theme-default/components/VPNavBarSocialLinks'
import { VPMenuLink } from 'client/theme-default/components/VPMenuLink'

/** 参照 nav-render.test.tsx：初始化模块级 data 单例（依赖 useData 的组件需要） */
function setupData(themeConfig: any = {}) {
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
      themeConfig,
      locales: {}
    } as any
  } as any
  router.route.component = { __setup: () => () => null } as any
  initData(router.route)
  return router
}

describe('attrs merge（attribute fallthrough 移除后的显式合并）', () => {
  // ---------- A：根元素 class 合并 ----------

  it('A: VPBackdrop 合并调用方 class（Layout: class="backdrop"）', async () => {
    const html = await renderToString(
      jsx(VPBackdrop, { class: 'backdrop', show: true })
    )
    expect(html).toContain('class="VPBackdrop backdrop"')
  })

  it('A: VPBackdrop show=false 不渲染', async () => {
    const html = await renderToString(
      jsx(VPBackdrop, { class: 'backdrop', show: false })
    )
    expect(html).toBe('')
  })

  it('A: VPFeatures 合并 class 且不透传业务 props（VPHomeFeatures 调用链）', async () => {
    const html = await renderToString(
      jsx(VPFeatures, {
        class: 'VPHomeFeatures',
        features: [{ title: 'A', details: 'd' }]
      })
    )
    expect(html).toContain('class="VPFeatures VPHomeFeatures"')
    // 业务 prop 不得以 DOM 属性形式泄漏到根元素（旧版全量透传的 bug 回归）
    expect(html).not.toContain('features=')
  })

  it('A: VPHero 合并 class（VPHomeHero 调用链）', async () => {
    const html = await renderToString(
      jsx(VPHero, {
        class: 'VPHomeHero',
        name: 'T',
        text: 'X',
        tagline: 't',
        image: '/img.png'
      })
    )
    expect(html).toContain('class="VPHero has-image VPHomeHero"')
  })

  it('A: VPImage 合并 class（VPHero 内 image-src，rest 展开不得覆盖 class）', async () => {
    const html = await renderToString(
      jsx(VPHero, {
        class: 'VPHomeHero',
        name: 'T',
        image: '/img.png'
      })
    )
    expect(html).toContain('class="VPImage image-src"')
    expect(html).not.toContain('class="image-src"')
  })

  it('A: VPNavBarSearch 合并 class（VPNavBar: class="search"，无 provider 分支）', async () => {
    setupData()
    const html = await renderToString(jsx(VPNavBarSearch, { class: 'search' }))
    expect(html).toContain('class="VPNavBarSearch search"')
  })

  it('A: VPFlyout 合并 class（VPNavBarExtra/VPNavBarTranslations 调用链）', async () => {
    const html = await renderToString(
      jsx(VPFlyout, { class: 'VPNavBarExtra', label: 'extra navigation' })
    )
    expect(html).toContain('class="VPFlyout VPNavBarExtra"')
  })

  // ---------- B：class 转发给子组件 ----------

  it('B: VPNavBarSocialLinks 把调用方 class 并入 VPSocialLinks', async () => {
    setupData()
    // useData().site 来自 @siteData 单例（shims.ts），需要覆盖其 themeConfig
    siteDataRef.value = {
      ...siteDataRef.value,
      themeConfig: {
        ...(siteDataRef.value as any).themeConfig,
        socialLinks: [
          { link: 'https://github.com/x', icon: 'github', ariaLabel: 'GitHub' }
        ]
      }
    } as any
    const html = await renderToString(
      jsx(VPNavBarSocialLinks, { class: 'social-links' })
    )
    expect(html).toContain(
      'class="VPSocialLinks VPNavBarSocialLinks social-links"'
    )
  })

  // ---------- C：未声明 attrs 转发 ----------

  it('C: VPMenuLink 把 hreflang/dir/lang 转发到内层 <a>（RTL/SEO）', async () => {
    setupData()
    const html = await renderToString(
      jsx(VPMenuLink, {
        item: { text: '中文', link: '/zh/' },
        external: false,
        lang: 'zh-CN',
        hreflang: 'zh-CN',
        dir: 'rtl'
      })
    )
    expect(html).toContain('hreflang="zh-CN"')
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('lang="zh-CN"')
  })

  // ---------- D：Content 恢复 vp-doc ----------

  it('D: Content 合并调用方 class（VPDoc: class="vp-doc ..."）', async () => {
    setupData()
    const html = await renderToString(
      jsx(Content, { class: 'vp-doc index_md' })
    )
    expect(html).toContain('class="vp-doc index_md"')
  })
})
