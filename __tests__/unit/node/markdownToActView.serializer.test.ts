import { describe, expect, test } from 'vitest'
import {
  createActViewSrc,
  decodeEntities,
  extractComponentNames,
  serializeHtmlToJsx,
  serializeHtmlToVNode
} from 'node/markdownToActView'
import type { PageData } from 'shared'

const pageData: PageData = {
  title: 'Test',
  relativePath: 'index.md',
  filePath: 'index.md',
  description: '',
  frontmatter: {},
  headers: []
}

describe('decodeEntities', () => {
  test('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b')).toBe('a & b')
    expect(decodeEntities('&lt;div&gt;')).toBe('<div>')
    expect(decodeEntities('&#8203;')).toBe('\u200b')
    expect(decodeEntities('&#x1F600;')).toBe('\u{1F600}')
    expect(decodeEntities('&quot;q&quot;')).toBe('"q"')
  })

  test('leaves unknown entities and bare ampersands untouched', () => {
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;')
    expect(decodeEntities('AT&T')).toBe('AT&T')
    expect(decodeEntities('&amp')).toBe('&amp')
  })

  test('does not double-decode', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;')
  })
})

describe('serializeHtmlToVNode', () => {
  test('wraps content in a root div', () => {
    expect(serializeHtmlToVNode('<p>x</p>')).toBe(
      `createElement("div", null, createElement("p", null, "x"))`
    )
  })

  test('serializes attributes with quoted keys and decoded values', () => {
    const src = serializeHtmlToVNode(
      '<a class="btn" href="/x?a=1&amp;b=2" data-id="5" tabindex="-1">go</a>'
    )
    expect(src).toContain(`"class": "btn"`)
    expect(src).toContain(`"href": "/x?a=1&b=2"`)
    expect(src).toContain(`"data-id": "5"`)
    expect(src).toContain(`"tabindex": "-1"`)
  })

  test('keeps boolean attributes', () => {
    const src = serializeHtmlToVNode('<input disabled>')
    expect(src).toContain(`"disabled": true`)
  })

  test('handles self-closing and void elements', () => {
    const src = serializeHtmlToVNode('<img src="/a.png" alt="a"><br>')
    expect(src).toContain(
      `createElement("img", { "src": "/a.png", "alt": "a" })`
    )
    expect(src).toContain(`createElement("br", null)`)
  })

  test('drops comments', () => {
    const src = serializeHtmlToVNode('<p>a<!-- comment -->b</p>')
    expect(src).not.toContain('comment')
    expect(src).toContain(`"ab"`)
  })

  test('decodes entities in text nodes', () => {
    const src = serializeHtmlToVNode('<p>1 &lt; 2 &amp;&amp; 3</p>')
    expect(src).toContain(`"1 < 2 && 3"`)
  })

  test('drops whitespace-only text outside <pre>, keeps it inside', () => {
    const src = serializeHtmlToVNode(
      '<ul>\n  <li>a</li>\n</ul>\n<pre>\ncode\n</pre>'
    )
    expect(src).toContain(`createElement("li", null, "a")`)
    expect(src).toContain(`"\\ncode\\n"`)
  })

  test('drops static on* string attributes (would be treated as events)', () => {
    const src = serializeHtmlToVNode('<button onclick="alert(1)">x</button>')
    expect(src).not.toContain('onclick')
    expect(src).toContain(`createElement("button", null, "x")`)
  })

  test('serializes nested structures', () => {
    const src = serializeHtmlToVNode(
      '<div class="tip"><h2 id="t">T</h2><p>a <strong>b</strong></p></div>'
    )
    expect(src).toContain(`createElement("div", { "class": "tip" },`)
    expect(src).toContain(`createElement("h2", { "id": "t" }, "T")`)
    expect(src).toContain(`createElement("strong", null, "b")`)
  })

  test('handles double-space separated attributes (markdown-it output)', () => {
    const src = serializeHtmlToVNode('<div  class="a"  id="b">x</div>')
    expect(src).toContain(`"class": "a"`)
    expect(src).toContain(`"id": "b"`)
  })

  test('tolerates unclosed tags', () => {
    const src = serializeHtmlToVNode('<div><p>text')
    expect(src).toContain(`createElement("p", null, "text")`)
  })

  test('renders empty html as empty div', () => {
    expect(serializeHtmlToVNode('')).toBe(`createElement("div", null)`)
  })
})

describe('createActViewSrc', () => {
  test('emits __pageData and a defineComponent-wrapped page', () => {
    const src = createActViewSrc('<h1>Hi</h1>', undefined, pageData)
    expect(src).toContain(`export const __pageData = JSON.parse(`)
    // 页面组件用 defineComponent 包裹（浏览器端渲染器只认 { __setup }）
    expect(src).toContain(`import { defineComponent } from "actview"`)
    expect(src).toContain(`export default defineComponent(function () {`)
    // 正文渲染为 JSX（顶层 <div> 包裹）
    expect(src).toContain(`return () => (`)
    expect(src).toContain(`<div>`)
    expect(src).toContain(`<h1>Hi</h1>`)
  })

  test('hoists all script blocks to module top with shared scope', () => {
    const src = createActViewSrc(
      '<p>hello</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped:
            "\nimport { ref } from 'actview'\nconst count = ref(0)\n",
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [
          {
            type: 'script',
            content: '<script lang="tsx">',
            contentStripped:
              '\nfunction Counter(){\n  return <button>{count.value}</button>\n}\n',
            tagOpen: '<script lang="tsx">',
            tagClose: '</script>'
          }
        ],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    // 所有 script 内容都在模块顶层（export default 之前）
    const defIdx = src.indexOf('export default defineComponent')
    expect(src.indexOf(`import { ref } from 'actview'`)).toBeLessThan(defIdx)
    expect(src.indexOf('const count = ref(0)')).toBeLessThan(defIdx)
    expect(src.indexOf('function Counter()')).toBeLessThan(defIdx)
    // 页面组件是 defineComponent 产物（浏览器端渲染需要 { __setup }）
    expect(src).toContain('export default defineComponent')
  })

  test('removes user export default (page component generated by compiler)', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped: '\nexport default {}\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain('removed: user export-default')
    // 组件导出只能有一个（编译器生成的）
    expect(src.match(/export default defineComponent/g)).toHaveLength(1)
  })

  test('injects styles at runtime', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: null,
        scripts: [],
        styles: [
          {
            type: 'style',
            content: '<style>',
            contentStripped: '\n.vp-doc { color: red }\n',
            tagOpen: '<style>',
            tagClose: '</style>'
          }
        ],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain(`.vp-doc { color: red }`)
    expect(src).toContain(`document.createElement('style')`)
  })

  test('keeps <script client> content as comments instead of dropping it', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: null,
        scripts: [
          {
            type: 'script',
            content: '<script client>',
            contentStripped: '\nconsole.log("client only")\n',
            tagOpen: '<script client>',
            tagClose: '</script>'
          }
        ],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain(`// <script client> (MPA client JS)`)
    expect(src).toContain(`console.log("client only")`)
  })

  test('comments out multi-line user export default', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped: '\nexport default {\n  name: "x"\n}\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain('removed: user export-default')
    // 多行 export default 被整体注释，不残留可执行的 `name: "x"` 顶层片段
    expect(src).toContain('//   name: "x"')
    expect(src).not.toMatch(/^\s*name: "x"/m)
  })

  test('keeps export const as-is at module top (legal in ESM)', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped: '\nexport const value = 42\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    // 模块顶层 export const 合法，原样保留
    expect(src).toContain(`export const value = 42`)
    expect(src.indexOf(`export const value`)).toBeLessThan(
      src.indexOf('export default defineComponent')
    )
  })

  test('keeps re-exports at module top', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped:
            "\nexport { count } from './store'\nconst local = 1\n",
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src.indexOf(`export { count } from './store'`)).toBeLessThan(
      src.indexOf('export default defineComponent')
    )
  })
})

describe('serializeHtmlToJsx', () => {
  test('renders static HTML to JSX with text preserved', () => {
    const r = serializeHtmlToJsx(
      '<h1 id="hi">Hi</h1><p>Hello <strong>world</strong> &amp; more</p>'
    )
    expect(r.warnings).toEqual([])
    expect(r.code).toContain('<div>')
    expect(r.code).toContain('<h1 id="hi">Hi</h1>')
    // 多 children 的文本用表达式字面量，保留首尾空白
    expect(r.code).toContain(`{"Hello "}`)
    expect(r.code).toContain(`{" & more"}`)
    expect(r.code).toContain('<strong>world</strong>')
  })

  test('void elements self-close, comments dropped', () => {
    const r = serializeHtmlToJsx('<!-- c --><img src="/a.png" alt="a"><br>')
    expect(r.code).toContain('<img src="/a.png" alt="a" />')
    expect(r.code).toContain('<br />')
    expect(r.code).not.toContain('<!--')
  })

  test('drops string on* attributes with warning', () => {
    const r = serializeHtmlToJsx('<button onclick="doIt()">x</button>')
    expect(r.code).toContain('<button>')
    expect(r.warnings.some((w) => w.includes('onclick'))).toBe(true)
  })

  test('uppercase tag in componentNames becomes component reference with attrs', () => {
    const r = serializeHtmlToJsx(
      '<MyButton size="lg" disabled />',
      new Set(['MyButton'])
    )
    expect(r.code).toContain('<MyButton size="lg" disabled />')
    expect(r.warnings).toEqual([])
  })

  test('unknown uppercase tag warns', () => {
    const r = serializeHtmlToJsx('<Foo />', new Set(['MyButton']))
    expect(r.warnings.some((w) => w.includes('<Foo>'))).toBe(true)
  })
})

describe('extractComponentNames', () => {
  test('collects top-level uppercase identifiers (export or not)', () => {
    const names = extractComponentNames(
      `\nexport function MyButton() {}\nexport const MyCard = () => <div/>\nexport { A, B as C }\nfunction LocalComp() {}\nconst PlainComp = () => <div/>\nfunction helper() {}\n`
    )
    // 具名导出
    expect(names.has('MyButton')).toBe(true)
    expect(names.has('MyCard')).toBe(true)
    expect(names.has('A')).toBe(true)
    expect(names.has('C')).toBe(true)
    expect(names.has('B')).toBe(false)
    // 非 export 的顶层大写标识符也可引用（无需 export）
    expect(names.has('LocalComp')).toBe(true)
    expect(names.has('PlainComp')).toBe(true)
    // 小写标识符不是组件
    expect(names.has('helper')).toBe(false)
  })

  test('ignores indented (non-top-level) declarations', () => {
    const names = extractComponentNames(
      `function outer() {\n  function Inner() {}\n  const Nested = () => <div/>\n}\n`
    )
    expect(names.has('outer')).toBe(false)
    expect(names.has('Inner')).toBe(false)
    expect(names.has('Nested')).toBe(false)
  })
})

describe('createActViewSrc — <script lang="tsx"> blocks', () => {
  test('hoists tsx named exports to module top and resolves body components', () => {
    const src = createActViewSrc(
      '<h1>Hi</h1><MyButton size="lg" />',
      {
        template: null,
        script: null,
        scriptSetup: null,
        scripts: [
          {
            type: 'script',
            content: '<script lang="tsx">',
            contentStripped:
              '\nexport function MyButton() {\n  return <button className="my">b</button>\n}\n',
            tagOpen: '<script lang="tsx">',
            tagClose: '</script>'
          }
        ],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    // 具名导出在模块顶层（页面组件之前）
    expect(src.indexOf('export function MyButton')).toBeLessThan(
      src.indexOf('export default defineComponent')
    )
    // 正文 <MyButton> 保留为组件引用（属性透传）
    expect(src).toContain('<MyButton size="lg" />')
    // 组件名集合生效（无 unknown 警告）
    expect(src).not.toContain('unknown component')
  })

  test('warns on unknown uppercase component when tsx block present', () => {
    const src = createActViewSrc(
      '<Foo />',
      {
        template: null,
        script: null,
        scriptSetup: null,
        scripts: [
          {
            type: 'script',
            content: '<script lang="tsx">',
            contentStripped: '\nexport function MyButton() {}\n',
            tagOpen: '<script lang="tsx">',
            tagClose: '</script>'
          }
        ],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain('unknown component <Foo>')
  })
})

describe('serializeHtmlToJsx — Vue syntax tolerance', () => {
  test('drops Vue v-bind/v-on shorthand attributes with warning', () => {
    const r = serializeHtmlToJsx(
      '<VPTeamMembers size="small" :members />',
      new Set(['VPTeamMembers'])
    )
    expect(r.code).toContain('<VPTeamMembers size="small" />')
    expect(r.code).not.toContain(':members')
    expect(r.warnings.some((w) => w.includes(':members'))).toBe(true)
  })

  test('{...} in text stays literal (no {expr} evaluation)', () => {
    const r = serializeHtmlToJsx('<p>当前计数: {count.value}</p>')
    // 正文 {expr} 不求值——整段作为字面文本
    expect(r.code).toContain(`{"当前计数: {count.value}"}`)
  })

  test('double-brace {{...}} also stays literal', () => {
    const r = serializeHtmlToJsx('<p>value: {{count.value}}</p>')
    expect(r.code).toContain(`{"value: {{count.value}}"}`)
  })
})
