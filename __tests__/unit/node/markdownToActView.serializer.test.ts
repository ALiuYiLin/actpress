import { describe, expect, test } from 'vitest'
import {
  createActViewSrc,
  decodeEntities,
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
  test('emits imports, __pageData and a defineComponent page', () => {
    const src = createActViewSrc('<h1>Hi</h1>', undefined, pageData)
    expect(src).toContain(`import { defineComponent } from "actview"`)
    expect(src).toContain(`import { createElement } from "@actview/jsx"`)
    expect(src).toContain(`export const __pageData = JSON.parse(`)
    expect(src).toContain(`export default defineComponent(function (props) {`)
    expect(src).toContain(`return function () {`)
    expect(src).toContain(`return createElement("div", null,`)
  })

  test('hoists <script setup> imports to module top and keeps body in setup', () => {
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
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )

    expect(src.indexOf(`import { ref } from 'actview'`)).toBeLessThan(
      src.indexOf('export default')
    )
    // setup 代码留在组件体内（不被误吞进 import 语句）
    const componentStart = src.indexOf('export default defineComponent')
    const componentBody = src.slice(componentStart)
    expect(componentBody).toContain(`const count = ref(0)`)
    // import 不应出现在组件函数体内
    expect(componentBody).not.toContain(`import { ref }`)
  })

  test('removes export default from <script setup>', () => {
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
    expect(src).toContain('removed: 用户 export default')
    // 组件导出只能有一个
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

  test('supports configurable import sources via deps', () => {
    const src = createActViewSrc('<p>x</p>', undefined, pageData, {
      actview: '@my/actview',
      jsx: '@my/actview-jsx'
    })
    expect(src).toContain(`import { defineComponent } from "@my/actview"`)
    expect(src).toContain(`import { createElement } from "@my/actview-jsx"`)
  })

  test('hoists re-exports to module top', () => {
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
    // re-export 不应被吞进 setup 体
    const componentStart = src.indexOf('export default defineComponent')
    expect(src.slice(componentStart)).not.toContain(`export { count }`)
  })

  test('comments out local export {} blocks', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped: '\nconst a = 1\nexport { a }\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain('removed: 本地 export { ... }')
    // 不能残留非法的 `{ a }` 块语句
    expect(src).not.toMatch(/[^/]\s*\{\s*a\s*\}/)
  })

  test('demotes export const to a plain declaration in setup', () => {
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
    expect(src).toContain(`const value = 42`)
    expect(src).not.toContain(`export const value`)
  })

  test('preserves relative indentation of multi-line template strings', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped: '\nconst s = `line1\n    line2`\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    // 仅前缀缩进，模板字符串内部相对缩进保持不变
    expect(src).toContain('const s = `line1\n      line2`')
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

  test('warns about top-level await and import.meta in setup', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped:
            "\nconst data = await fetch('/x')\nconsole.log(import.meta.env)\n",
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    expect(src).toContain('含顶层 await')
    expect(src).toContain('import.meta')
  })

  test('comments out multi-line export default without leaking a dangling brace', () => {
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
    expect(src).toContain('removed: 用户 export default')
    // 不能残留对象字面量片段（`name: "x"` / 孤立 `}`）
    expect(src).not.toContain('name: "x"')
    // 组件体内 export default 只出现一次（真正的组件导出）
    expect(src.match(/export default defineComponent/g)).toHaveLength(1)
  })

  test('does not mistake from inside strings for a re-export', () => {
    const src = createActViewSrc(
      '<p>x</p>',
      {
        template: null,
        script: null,
        scriptSetup: {
          type: 'script',
          content: '<script setup>',
          contentStripped:
            '\nexport const message = "a string with from \'x\' inside"\n',
          tagOpen: '<script setup>',
          tagClose: '</script>'
        },
        scripts: [],
        styles: [],
        customBlocks: []
      },
      pageData
    )
    // 应作为 export const 降级留在 setup 内，而不是被提升为 re-export
    const componentStart = src.indexOf('export default defineComponent')
    expect(src.slice(componentStart)).toContain(
      `const message = "a string with from 'x' inside"`
    )
  })
})
