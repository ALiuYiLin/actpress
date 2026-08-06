// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveConfig } from 'node/config'
import { createMarkdownToActViewRenderFn } from 'node/markdownToActView'
import { createApp, defineComponent, ref } from 'actview'
import { createElement } from '@actview/jsx'

describe('v1 md 模块浏览器端挂载', () => {
  let root: string | undefined
  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
      root = undefined
    }
  })

  test('生成模块:页面组件为 defineComponent 产物,具名组件提升顶层', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'vitepress-v1-mount-'))
    const file = path.join(root, 'index.md')
    const md = `<script lang="tsx">
import { ref } from 'actview'
const count = ref(0)
</script>

<script lang="tsx">
export function Counter() {
  return <button onclick={() => count.value++}>{count.value}</button>
}
</script>

<Counter />
`
    await writeFile(file, md)
    const siteConfig = await resolveConfig(root, 'build', 'production')
    const render = await createMarkdownToActViewRenderFn(
      siteConfig.srcDir,
      {},
      '/',
      false,
      false,
      siteConfig
    )
    const result = await render(md, file, 'public')
    const src = result.actViewSrc
    console.log('===== actViewSrc =====\n' + src)

    // 页面组件是 defineComponent 产物(浏览器端渲染器需要 { __setup },
    // 裸函数会 InvalidCharacterError)
    expect(src).toContain(`import { defineComponent } from "actview"`)
    expect(src).toContain(`export default defineComponent(function () {`)
    expect(src).toContain(`return () => (`)
    // 具名组件提升到顶层、正文引用组件
    expect(src.indexOf('export function Counter()')).toBeLessThan(
      src.indexOf('export default defineComponent')
    )
    expect(src).toContain('<Counter />')
  }, 30000)

  test('同构 defineComponent 页面在浏览器挂载 + 事件更新(本机 actview)', async () => {
    // 与生成形态同构:页面组件 = defineComponent(setup 返回 render)
    const count = ref(0)
    const Counter = defineComponent(function () {
      return () =>
        createElement(
          'button',
          { onclick: () => count.value++ },
          String(count.value)
        )
    })
    const Page = defineComponent(function () {
      return () => createElement('div', null, createElement(Counter, null))
    })
    const host = document.createElement('div')
    host.id = 'host2'
    document.body.appendChild(host)
    createApp(Page).mount('#host2')
    const btn = host.querySelector('button')
    expect(btn).toBeTruthy()
    expect(btn!.textContent).toBe('0')
    btn!.dispatchEvent(new MouseEvent('click'))
    await new Promise((r) => setTimeout(r, 0))
    expect(btn!.textContent).toBe('1')
  })
})
