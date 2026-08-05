import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveConfig } from 'node/config'
import { createMarkdownToActViewRenderFn } from 'node/markdownToActView'

// 最小 ActView 运行时 stub：与 @actview/jsx 的 jsxFactory / core 的
// defineComponent 语义一致，用于实际执行生成的模块并校验 VNode 树。
vi.mock('actview', () => ({
  defineComponent: (setup) => ({ __setup: setup })
}))
vi.mock('@actview/jsx', () => ({
  createElement: (type, config, ...children) => {
    const props = config ? { ...config } : {}
    const key = props.key ?? null
    delete props.key
    if (children.length === 1) props.children = children[0]
    else if (children.length > 1) props.children = children
    return {
      $$typeof: Symbol.for('react.element'),
      type,
      key,
      ref: null,
      props
    }
  }
}))

describe('node/markdownToActView', () => {
  let root: string | undefined

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
      root = undefined
    }
  })

  test('records source line numbers for dead links', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'vitepress-dead-link-'))

    const file = path.join(root, 'index.md')
    const src = '# Home\n\nIntro\n\n[Missing](./missing.md)\n'
    await writeFile(file, src)

    const siteConfig = await resolveConfig(root, 'build', 'production')
    const render = await createMarkdownToActViewRenderFn(
      siteConfig.srcDir,
      { cache: false },
      '/',
      false,
      false,
      siteConfig
    )

    const result = await render(src, file, 'public')

    expect(result.deadLinks).toContainEqual({
      url: './missing',
      file,
      line: 5
    })
  })

  test('records source line numbers after frontmatter', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'vitepress-dead-link-'))

    const file = path.join(root, 'index.md')
    const src =
      '---\ntitle: Home\n---\n# Home\n\nIntro\n\n[Missing](./missing.md)\n'
    await writeFile(file, src)

    const siteConfig = await resolveConfig(root, 'build', 'production')
    const render = await createMarkdownToActViewRenderFn(
      siteConfig.srcDir,
      { cache: false },
      '/',
      false,
      false,
      siteConfig
    )

    const result = await render(src, file, 'public')

    expect(result.deadLinks).toContainEqual({
      url: './missing',
      file,
      line: 8
    })
  })

  test('generated module executes and produces a correct VNode tree', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'vitepress-actview-e2e-'))

    const file = path.join(root, 'index.md')
    const src =
      '# Hi\n\nHello **world** &amp; more\n\n<img src="/a.png" alt="a">\n'
    await writeFile(file, src)

    const siteConfig = await resolveConfig(root, 'build', 'production')
    const render = await createMarkdownToActViewRenderFn(
      siteConfig.srcDir,
      { cache: false },
      '/',
      false,
      false,
      siteConfig
    )

    const result = await render(src, file, 'public')
    expect(result.actViewSrc).toContain(`createElement("div", null,`)

    // 把生成的模块写到临时文件并实际执行（actview 相关 import 已被 vi.mock 替换）
    const modFile = path.join(root, 'page.js')
    await writeFile(modFile, result.actViewSrc)
    const mod = await import(pathToFileURL(modFile).href + '?t=' + Date.now())

    // __pageData 导出
    expect(mod.__pageData).toMatchObject({ title: 'Hi' })

    // 组件模型：defineComponent 产物 → __setup(props) 返回 render
    const page = mod.default
    expect(page.__setup).toBeTypeOf('function')
    const renderTree = page.__setup({})()
    expect(renderTree.type).toBe('div')

    const children = renderTree.props.children
    const h1 = children.find((c: any) => c.type === 'h1')
    expect(h1).toBeTruthy()
    expect(h1.props['tabindex']).toBe('-1')
    // h1 文本 + header-anchor（&#8203; 已解码为 \u200b）
    expect(JSON.stringify(h1.props.children)).toContain('\u200b')

    const p = children.find((c: any) => c.type === 'p')
    expect(p.props.children).toEqual([
      'Hello ',
      expect.objectContaining({ type: 'strong', props: { children: 'world' } }),
      ' & more'
    ])

    const img = children.find((c: any) => c.type === 'img')
    expect(img.props).toMatchObject({ src: '/a.png', alt: 'a' })
  }, 30000)
})
