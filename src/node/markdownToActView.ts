import { resolveTitleFromToken } from '@mdit-vue/shared'
import { createDebug } from 'obug'
import fs from 'fs-extra'
import { LRUCache } from 'lru-cache'
import path from 'node:path'
import type { SiteConfig } from './config'
import {
  createMarkdownRenderer,
  type MarkdownOptions,
  type MarkdownRenderer
} from './markdown/markdown'
import { getPageDataTransformer } from './plugins/dynamicRoutesPlugin'
import {
  EXTERNAL_URL_RE,
  getLocaleForPath,
  slash,
  treatAsHtml,
  type HeadConfig,
  type MarkdownEnv,
  type PageData
} from './shared'
import { getGitTimestamp } from './utils/getGitTimestamp'
import { processIncludes } from './utils/processIncludes'

const debug = createDebug('vitepress:md')
const cache = new LRUCache<string, MarkdownCompileResult>({ max: 1024 })

export interface MarkdownCompileResult {
  /** 生成的 ActView 模块源码（纯 JS，无 JSX 语法，可直接由 esbuild 编译） */
  actViewSrc: string
  pageData: PageData
  deadLinks: { url: string; file: string; line?: number }[]
  includes: string[]
}

export function clearCache(relativePath?: string) {
  if (!relativePath) {
    cache.clear()
    return
  }

  relativePath = JSON.stringify({ relativePath }).slice(1)
  cache.find((_, key) => key.endsWith(relativePath!) && cache.delete(key))
}

let __pages: string[] = []
let __dynamicRoutes = new Map<string, [string, string]>()
let __rewrites = new Map<string, string>()
let __ts: number

function getResolutionCache(siteConfig: SiteConfig) {
  // @ts-expect-error internal
  if (siteConfig.__dirty) {
    __pages = siteConfig.pages.map((p) => slash(p.replace(/\.md$/, '')))

    __dynamicRoutes = new Map(
      siteConfig.dynamicRoutes.map((r) => [
        r.fullPath,
        [slash(path.join(siteConfig.srcDir, r.route)), r.loaderPath]
      ])
    )

    __rewrites = new Map(
      Object.entries(siteConfig.rewrites.map).map(([key, value]) => [
        slash(path.join(siteConfig.srcDir, key)),
        slash(path.join(siteConfig.srcDir, value!))
      ])
    )

    __ts = Date.now()

    // @ts-expect-error internal
    siteConfig.__dirty = false
  }

  return {
    pages: __pages,
    dynamicRoutes: __dynamicRoutes,
    rewrites: __rewrites,
    ts: __ts
  }
}

export async function createMarkdownToActViewRenderFn(
  srcDir: string,
  options: MarkdownOptions = {},
  base = '/',
  includeLastUpdatedData = false,
  cleanUrls = false,
  siteConfig: SiteConfig
) {
  const md = await createMarkdownRenderer(
    srcDir,
    options,
    base,
    siteConfig?.logger
  )

  return async (
    src: string,
    file: string,
    publicDir: string
  ): Promise<MarkdownCompileResult> => {
    const { pages, dynamicRoutes, rewrites, ts } =
      getResolutionCache(siteConfig)

    const dynamicRoute = dynamicRoutes.get(file)
    const fileOrig = dynamicRoute?.[0] || file
    const transformPageData = [
      siteConfig?.transformPageData,
      getPageDataTransformer(dynamicRoute?.[1]!)
    ].filter((fn) => fn != null)

    file = rewrites.get(file) || file
    const relativePath = slash(path.relative(srcDir, file))

    const cacheKey = JSON.stringify({ src, ts, relativePath })
    if (options.cache !== false) {
      const cached = cache.get(cacheKey)
      if (cached) {
        debug(`[cache hit] ${relativePath}`)
        return cached
      }
    }

    const start = Date.now()

    // resolve params for dynamic routes
    let params
    src = src.replace(
      /^__VP_PARAMS_START([^]+?)__VP_PARAMS_END__/,
      (_, paramsString) => {
        params = JSON.parse(paramsString)
        return ''
      }
    )

    // resolve includes
    let includes: string[] = []
    src = processIncludes(md, srcDir, src, fileOrig, includes, cleanUrls)

    const localeIndex = getLocaleForPath(siteConfig?.site, relativePath)

    // reset env before render
    const env: MarkdownEnv = {
      path: file,
      relativePath,
      cleanUrls,
      includes,
      realPath: fileOrig,
      localeIndex
    }
    const html = await md.renderAsync(src, env)
    const {
      content,
      frontmatter = {},
      headers = [],
      linkLines = [],
      links = [],
      sfcBlocks,
      title = ''
    } = env
    const contentLineOffset = countLineBreaks(
      content && src.endsWith(content) ? src.slice(0, -content.length) : ''
    )

    // validate data.links
    const deadLinks: MarkdownCompileResult['deadLinks'] = []
    const recordDeadLink = (url: string, line?: number) => {
      deadLinks.push(
        line == null ? { url, file: fileOrig } : { url, file: fileOrig, line }
      )
    }

    function shouldIgnoreDeadLink(url: string) {
      if (!siteConfig?.ignoreDeadLinks) {
        return false
      }
      if (siteConfig.ignoreDeadLinks === true) {
        return true
      }
      if (siteConfig.ignoreDeadLinks === 'localhostLinks') {
        return url.replace(EXTERNAL_URL_RE, '').startsWith('//localhost')
      }

      return siteConfig.ignoreDeadLinks.some((ignore) => {
        if (typeof ignore === 'string') return url === ignore
        if (ignore instanceof RegExp) return ignore.test(url)
        if (typeof ignore === 'function') return ignore(url, fileOrig)
        return false
      })
    }

    if (links && siteConfig?.ignoreDeadLinks !== true) {
      const dir = path.dirname(file)
      for (const [index, rawUrl] of links.entries()) {
        let url = rawUrl
        const line =
          linkLines[index] == null
            ? undefined
            : linkLines[index] + contentLineOffset
        const { pathname } = new URL(url, 'http://a.com')
        if (!treatAsHtml(pathname)) continue

        url = url.replace(/[?#].*$/, '').replace(/\.(html|md)$/, '')
        if (url.endsWith('/')) url += `index`

        let resolved = decodeURIComponent(
          slash(
            url.startsWith('/')
              ? url.slice(1)
              : path.relative(srcDir, path.resolve(dir, url))
          )
        )
        resolved =
          siteConfig?.rewrites.inv[resolved + '.md']?.slice(0, -3) || resolved

        if (
          !pages.includes(resolved) &&
          !fs.existsSync(path.resolve(dir, publicDir, `${resolved}.html`)) &&
          !shouldIgnoreDeadLink(url)
        ) {
          recordDeadLink(url, line)
        }
      }
    }

    let pageData: PageData = {
      title: inferTitle(md, frontmatter, title),
      titleTemplate: frontmatter.titleTemplate as any,
      description: inferDescription(frontmatter),
      frontmatter,
      headers,
      params,
      relativePath,
      filePath: slash(path.relative(srcDir, fileOrig))
    }

    if (includeLastUpdatedData && frontmatter.lastUpdated !== false) {
      if (frontmatter.lastUpdated instanceof Date) {
        pageData.lastUpdated = +frontmatter.lastUpdated
      } else {
        pageData.lastUpdated = await getGitTimestamp(fileOrig)
      }
    }

    for (const fn of transformPageData) {
      if (fn) {
        const dataToMerge = await fn(pageData, { siteConfig })
        if (dataToMerge) pageData = { ...pageData, ...dataToMerge }
      }
    }

    const actViewSrc = createActViewSrc(html, sfcBlocks, pageData)

    debug(`[render] ${file} in ${Date.now() - start}ms.`)

    const result = { actViewSrc, pageData, deadLinks, includes }
    if (options.cache !== false) cache.set(cacheKey, result)
    return result
  }
}

// ============================================================
// ActView 模块源码生成
//
// 把 markdown 渲染结果（静态 HTML + 抽取出的 SFC 块）编译成
// 一个纯 JS 模块（无 JSX 语法，esbuild 可直接编译）：
//
//   import { defineComponent } from 'actview'
//   import { createElement } from '@actview/jsx'
//   export const __pageData = JSON.parse(...)
//   export default defineComponent(function (props) {
//     <用户 <script setup> 内容（import 已提升到顶层）>
//     return function () {
//       return createElement('div', null, ...VNode 树...)
//     }
//   })
//
// 生成的组件对应 ActView 的组件模型：`__setup(props)` 返回 render 函数，
// render 返回 VNode 树（由 createElement 构造）。
// ============================================================

const ACTVIEW_IMPORT = 'actview'

/** `<script client>` 块：MPA 模式下由 plugin 抽走，不进入最终模块 */
const scriptClientRE = /<script\b[^>]*client\b[^>]*>/i

/**
 * 生成 ActView 模块源码。
 *
 * @param deps 生成代码 import 的目标包名，默认 `actview` / `@actview/jsx`。
 *   消费方（如 ActView 项目）可以通过别名/依赖安装来满足解析。
 */
export function createActViewSrc(
  html: string,
  sfcBlocks: MarkdownEnv['sfcBlocks'],
  pageData: PageData,
  deps: { actview?: string; jsx?: string } = {}
): string {
  const parts: string[] = []
  parts.push(`// generated by markdownToActView`)
  parts.push(
    `import { defineComponent } from ${JSON.stringify(deps.actview ?? ACTVIEW_IMPORT)}`
  )

  const scripts = sfcBlocks?.scripts ?? []
  const setupScript = sfcBlocks?.scriptSetup ?? null
  const styles = sfcBlocks?.styles ?? []

  // <script lang="tsx"> 块：模块顶层具名导出（md 正文可引用的组件），收集导出名
  const tsxBlocks: string[] = []
  for (const block of scripts) {
    if (block === setupScript) continue
    if (/\blang=["']tsx["']/i.test(block.tagOpen)) {
      tsxBlocks.push(block.contentStripped)
      continue
    }
    if (scriptClientRE.test(block.tagOpen)) {
      // MPA 模式的 <script client>:内容以注释保留,避免静默丢弃
      parts.push(`// <script client> (MPA client JS)`)
      parts.push(
        block.contentStripped
          .split('\n')
          .map((l) => `//   ${l}`)
          .join('\n')
      )
      continue
    }
    parts.push(stripExportDefault(block.contentStripped))
  }

  const componentNames = new Set<string>()
  if (tsxBlocks.length) {
    parts.push(
      `// ---- <script lang="tsx"> (named exports; usable as components in body) ----`
    )
    for (const code of tsxBlocks) {
      for (const n of extractComponentNames(code)) componentNames.add(n)
      parts.push(stripExportDefault(code))
    }
  }

  // <script setup> → import 提升到顶层，其余进入组件 setup
  let setupCode = ''
  if (setupScript) {
    const { imports, body } = extractSetupBody(setupScript.contentStripped)
    if (imports.length) parts.push(imports.join('\n'))
    setupCode = body
  }

  // 主题通过 useData() 读取页面数据
  parts.push(injectPageDataCode(pageData))

  // <style> → 运行时注入 <style> 标签（全局样式；SSR 下不注入）
  if (styles.length) {
    const css = styles.map((s) => s.contentStripped).join('\n')
    parts.push(`const __vpStyles__ = ${JSON.stringify(css)}`)
    parts.push(
      `if (typeof document !== 'undefined') { const __el__ = document.createElement('style'); __el__.textContent = __vpStyles__; document.head.appendChild(__el__) }`
    )
  }

  // custom blocks（如 <i18n>）在 ActView 暂无对应机制，注明不输出
  if (sfcBlocks?.customBlocks?.length) {
    parts.push(
      `// NOTE: ${sfcBlocks.customBlocks.length} 个 custom block 未输出 (ActView 暂无对应机制)`
    )
  }

  // 正文 → JSX（组件标签解析为具名导出引用，属性透传）
  const body = serializeHtmlToJsx(html, componentNames)
  if (body.warnings.length) {
    parts.push(`// NOTE (markdownToActView):`)
    for (const w of body.warnings) parts.push(`//   - ${w}`)
  }

  // 组件：setup 执行一次，返回 render 函数（render 返回 JSX）
  parts.push(`export default defineComponent(function (props) {`)
  if (setupCode.trim()) {
    parts.push(`  // ---- <script setup> ----`)
    // 仅做前缀缩进，不 trim：保留用户代码（含多行模板字符串）的相对缩进
    parts.push(
      setupCode
        .split('\n')
        .map((l) => (l ? `  ${l}` : l))
        .join('\n')
    )
    // ActView 的 setup 是同步调用，无法支持 Vue 的顶层 await；import.meta 也只能出现在模块顶层
    if (/\bawait\b/.test(setupCode)) {
      parts.push(
        `  // NOTE: <script setup> 含顶层 await — ActView 的 setup 为同步调用, 会运行时错误`
      )
    }
    if (/\bimport\.meta\b/.test(setupCode)) {
      parts.push(
        `  // NOTE: <script setup> 使用了 import.meta — 只能在模块顶层, 请改用普通 <script> 块`
      )
    }
  }
  parts.push(`  return function () {`)
  parts.push(`    return (`)
  parts.push(`      ${body.code.split('\n').join(`\n      `)}`)
  parts.push(`    )`)
  parts.push(`  }`)
  parts.push(`})`)

  return parts.join('\n')
}

/** 顶层 __pageData 导出 */
function injectPageDataCode(data: PageData): string {
  return `export const __pageData = JSON.parse(${JSON.stringify(
    JSON.stringify(data)
  )})`
}

/** 移除代码里的 `export default ...`（ActView 组件由本模块生成，用户 options 无法转换） */
function stripExportDefault(code: string): string {
  return code
    .split('\n')
    .map((line) =>
      /^\s*export\s+default\b/.test(line)
        ? `// removed: user export-default (ActView 不支持 options API, 组件由本模块生成)`
        : line
    )
    .join('\n')
}

/**
 * 处理 <script setup> 内容：
 * - import 语句与 re-export（`export ... from '...'`）提升到模块顶层
 * - 本地 `export { a, b }`（Vue <script setup> 本身不允许）注释掉并说明
 * - `export default` 注释掉（ActView 不支持 options API）
 * - `export const/function/class/let/var` 降级为普通声明（留在 setup 内）
 */
/**
 * 把 <script setup> 里的 Vue 运行时 import 改写为 ActView 等价物。
 * Vue 依赖已从 vitepress 移除，docs/用户 md 中的 `import { ref } from 'vue'`
 * 若原样保留会在浏览器端加载失败（vue 包不存在）。
 * ref/computed/watch/onMounted/nextTick/watchEffect 等 actview 均有同名导出；
 * 缺失的（provide、h 等）运行时才会报错，编译期不拦截。
 */
function rewriteVueImports(importLine: string): string {
  return importLine
    .replace(/from\s+['"]vue['"]/g, "from 'actview'")
    .replace(/from\s+['"]@vueuse\/core['"]/g, "from 'actview'")
    .replace(/from\s+['"]@vueuse\/integrations\/[^'"]+['"]/g, "from 'actview'")
}

function extractSetupBody(code: string): { imports: string[]; body: string } {
  const imports: string[] = []
  const lines = code.split('\n')
  const out: string[] = []
  let i = 0

  const countBrackets = (s: string) =>
    [...s].reduce((acc, c) => acc + (c === '{' ? 1 : c === '}' ? -1 : 0), 0)

  while (i < lines.length) {
    const line = lines[i]

    // import 语句：收集到顶层（可跨行、可无分号）
    if (/^\s*import\s/.test(line)) {
      let buf = line
      let depth = countBrackets(line)
      i++
      // 语句结束条件：括号已平衡，且当前行不以 `{`/`,` 延续
      while (i < lines.length && (depth > 0 || /[{,]\s*$/.test(buf))) {
        buf += '\n' + lines[i]
        depth += countBrackets(lines[i])
        i++
      }
      imports.push(rewriteVueImports(buf))
      continue
    }

    // export 语句
    if (/^\s*export\s+/.test(line)) {
      const rest = line.replace(/^\s*export\s+/, '')

      // re-export（export { ... } from / export * from）→ 提升到顶层
      // 判定基于 export 目标语法（{ 或 *），避免误判字符串/注释里的 from '...'
      if (/^[{\*]/.test(rest)) {
        let buf = line
        let depth = countBrackets(line)
        i++
        while (i < lines.length && (depth > 0 || /[{,]\s*$/.test(buf))) {
          buf += '\n' + lines[i]
          depth += countBrackets(lines[i])
          i++
        }
        if (/\bfrom\s+['"]/.test(buf)) {
          imports.push(buf)
        } else {
          // 本地 export { a, b }（无 from）：Vue <script setup> 本身不允许
          out.push(
            `// removed: 本地 export { ... } (Vue <script setup> 不允许, ActView 亦不支持)`
          )
        }
        continue
      }

      // export default {...}（可能跨行）→ 整段注释
      if (/^default\b/.test(rest)) {
        let depth = countBrackets(line)
        i++
        while (i < lines.length && depth > 0) {
          depth += countBrackets(lines[i])
          i++
        }
        out.push(
          `// removed: 用户 export default (ActView 不支持 options API, 组件由本模块生成)`
        )
        continue
      }

      // export const/function/class/let/var → 去掉 export 前缀
      out.push(line.replace(/^(\s*)export\s+/, '$1'))
      i++
      continue
    }

    out.push(line)
    i++
  }

  return { imports, body: out.join('\n') }
}

// ============================================================
// HTML → VNode（createElement 调用链）序列化
//
// markdown-it 渲染出的 HTML 是编译期静态产物，这里在 node 侧
// 把它解析成 VNode 树并生成 createElement 调用源码，浏览器端
// 无运行时解析开销，与 ActView 渲染器（string 标签 / Fragment /
// Text 节点）完全兼容。
// ============================================================

/** 自闭合 void 元素 */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
])

interface HtmlNode {
  tag: string
  attrs: [string, string | boolean][]
  children: (HtmlNode | string)[]
}

/**
 * 把 HTML 字符串序列化为 createElement 调用链表达式。
 * 顶层用 <div> 包裹（与 Vue 版 `<template><div>${html}</div></template>` 一致）。
 */
export function serializeHtmlToVNode(html: string): string {
  const root: HtmlNode = { tag: '', attrs: [], children: [] }
  const stack: HtmlNode[] = [root]
  let i = 0
  let textBuf = ''

  const flushText = () => {
    if (!textBuf) return
    const parent = stack[stack.length - 1]
    // <pre> 内部文本原样保留（含空白），其余纯空白文本丢弃，避免多余文本节点
    const inPre = stack.some((n) => n.tag === 'pre')
    if (inPre || textBuf.trim() !== '') {
      // 合并相邻文本（与浏览器 innerHTML 的文本节点合并行为一致）
      const last = parent.children[parent.children.length - 1]
      if (typeof last === 'string') {
        parent.children[parent.children.length - 1] = last + textBuf
      } else {
        parent.children.push(textBuf)
      }
    }
    textBuf = ''
  }

  while (i < html.length) {
    const ch = html[i]
    if (ch !== '<') {
      textBuf += ch
      i++
      continue
    }

    // 注释
    if (html.startsWith('<!--', i)) {
      flushText()
      const end = html.indexOf('-->', i + 4)
      i = end === -1 ? html.length : end + 3
      continue
    }
    // DOCTYPE / CDATA / 处理指令
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      flushText()
      const end = html.indexOf('>', i)
      i = end === -1 ? html.length : end + 1
      continue
    }
    // 结束标签
    if (html.startsWith('</', i)) {
      flushText()
      const end = html.indexOf('>', i)
      if (end === -1) break
      const tag = html
        .slice(i + 2, end)
        .trim()
        .split(/\s+/)[0]
        .toLowerCase()
      // 弹出栈中最近的同标签（对未闭合标签容错）
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tag === tag) {
          stack.length = j
          break
        }
      }
      i = end + 1
      continue
    }

    // 开始标签
    flushText()
    const parsed = parseOpenTag(html, i)
    if (!parsed) {
      // 不是合法标签（如未转义的 `<`），按文本处理
      textBuf += '<'
      i++
      continue
    }
    const { tag, attrs, selfClosing, next } = parsed
    const node: HtmlNode = { tag: tag.toLowerCase(), attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing && !VOID_TAGS.has(tag)) stack.push(node)
    i = next
  }
  flushText()

  return renderRootExpr(root.children)
}

function parseOpenTag(
  html: string,
  start: number
): {
  tag: string
  attrs: [string, string | boolean][]
  selfClosing: boolean
  next: number
} | null {
  const len = html.length
  let i = start + 1
  let j = i
  while (j < len && !/[\s/>]/.test(html[j])) j++
  // 保留原始大小写（组件标签区分大小写，如 <MyButton>）；
  // 元素标签由调用方决定是否 toLowerCase（HTML 语义）或原样（JSX 语义）
  const tag = html.slice(i, j)
  if (!/^[a-zA-Z][\w:-]*$/.test(tag)) return null
  i = j

  const attrs: [string, string | boolean][] = []
  let selfClosing = false

  while (i < len) {
    while (i < len && /\s/.test(html[i])) i++
    if (i >= len) break
    const c = html[i]
    if (c === '>') {
      i++
      break
    }
    if (c === '/') {
      if (html[i + 1] === '>') {
        selfClosing = true
        i += 2
        break
      }
      i++
      continue
    }
    // 属性名
    let k = i
    while (k < len && !/[\s=/>]/.test(html[k])) k++
    const name = html.slice(i, k)
    i = k
    // 属性值
    while (i < len && /\s/.test(html[i])) i++
    let value: string | boolean = true
    if (html[i] === '=') {
      i++
      while (i < len && /\s/.test(html[i])) i++
      const q = html[i]
      if (q === '"' || q === "'") {
        const close = html.indexOf(q, i + 1)
        if (close === -1) {
          value = html.slice(i + 1)
          i = len
        } else {
          value = html.slice(i + 1, close)
          i = close + 1
        }
      } else {
        let v = i
        while (v < len && !/[\s>]/.test(html[v])) v++
        value = html.slice(i, v)
        i = v
      }
    }
    if (name) attrs.push([name, value])
  }

  return { tag, attrs, selfClosing, next: i }
}

function renderRootExpr(children: (HtmlNode | string)[]): string {
  const div = JSON.stringify('div')
  const exprs = children.map((c) =>
    typeof c === 'string' ? JSON.stringify(decodeEntities(c)) : nodeExpr(c)
  )
  if (!exprs.length) return `createElement(${div}, null)`
  return `createElement(${div}, null, ${exprs.join(', ')})`
}

function nodeExpr(node: HtmlNode): string {
  const attrs = node.attrs
    .filter(
      // 静态 HTML 中的 on* 字符串属性在 ActView 里会被当作事件处理器（运行时 TypeError），
      // 这里丢弃；如需事件绑定请在 <script setup> 中用 JS 表达式构造 VNode。
      ([k, v]) => !(typeof v === 'string' && /^on[a-z]/i.test(k))
    )
    .map(
      ([k, v]) =>
        `${JSON.stringify(k)}: ${
          typeof v === 'boolean' ? 'true' : JSON.stringify(decodeEntities(v))
        }`
    )
    .join(', ')
  const attrObj = attrs ? `{ ${attrs} }` : 'null'
  const head = `createElement(${JSON.stringify(node.tag)}, ${attrObj}`

  const childExprs = node.children.map((c) =>
    typeof c === 'string' ? JSON.stringify(decodeEntities(c)) : nodeExpr(c)
  )
  if (!childExprs.length) return `${head})`
  return `${head}, ${childExprs.join(', ')})`
}

// ============================================================
// HTML → JSX 序列化（md 正文渲染为 JSX 源码）
//
// 与 serializeHtmlToVNode（createElement 链）的区别：
// - 标签保留原始大小写（大写开头 = 组件引用，小写 = HTML 元素）
// - 输出 JSX 源码（自动 JSX runtime 由 vite esbuild/rolldown 处理）
// - 组件标签解析为具名导出引用，字符串属性原样透传
// ============================================================

/** 具名组件导出名的判定（首字母大写 + 标识符字符） */
const COMPONENT_TAG_RE = /^[A-Z][A-Za-z0-9_$]*$/

/** 从 `<script lang="tsx">` 块内容收集具名导出名（组件引用解析用） */
export function extractComponentNames(code: string): Set<string> {
  const names = new Set<string>()
  const add = (n: string | undefined) => {
    if (n && /^[A-Z]/.test(n)) names.add(n)
  }
  // export function Name
  for (const m of code.matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1])
  }
  // export const Name = ...
  for (const m of code.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1])
  }
  // export { A, B as C }
  for (const m of code.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim().split(/\s+as\s+/)
      add(seg[seg.length - 1]?.trim())
    }
  }
  // export let / var
  for (const m of code.matchAll(/export\s+(?:let|var)\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1])
  }
  return names
}

/** JSX 属性字符串值转义（双引号 → 实体，避免破坏属性边界） */
function escapeJsxAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * 把 HTML 字符串序列化为 JSX 源码。
 *
 * @param componentNames 可解析为组件引用的具名导出名集合（<script lang="tsx"> 导出）。
 *   大写开头标签命中集合 → 组件引用（属性透传）；大写开头未命中 → 警告注释 + 按字符串标签。
 * @returns JSX 源码（顶层 <div> 包裹，缩进 2 空格）
 */
export function serializeHtmlToJsx(
  html: string,
  componentNames: ReadonlySet<string> = new Set(),
  indent = '  '
): { code: string; warnings: string[] } {
  interface JsxNode {
    tag: string
    attrs: [string, string | boolean][]
    children: (JsxNode | string)[]
  }
  const root: JsxNode = { tag: '', attrs: [], children: [] }
  const stack: JsxNode[] = [root]
  let i = 0
  let textBuf = ''
  const warnings: string[] = []

  const flushText = () => {
    if (!textBuf) return
    const parent = stack[stack.length - 1]
    // <pre> 内部文本原样保留（含空白），其余纯空白文本丢弃
    const inPre = stack.some((n) => n.tag === 'pre')
    if (inPre || textBuf.trim() !== '') {
      const last = parent.children[parent.children.length - 1]
      if (typeof last === 'string') {
        parent.children[parent.children.length - 1] = last + textBuf
      } else {
        parent.children.push(textBuf)
      }
    }
    textBuf = ''
  }

  while (i < html.length) {
    const ch = html[i]
    if (ch !== '<') {
      textBuf += ch
      i++
      continue
    }
    // 注释 / DOCTYPE / 处理指令
    if (html.startsWith('<!--', i)) {
      flushText()
      const end = html.indexOf('-->', i + 4)
      i = end === -1 ? html.length : end + 3
      continue
    }
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      flushText()
      const end = html.indexOf('>', i)
      i = end === -1 ? html.length : end + 1
      continue
    }
    // 结束标签
    if (html.startsWith('</', i)) {
      flushText()
      const end = html.indexOf('>', i)
      if (end === -1) break
      const tag = html
        .slice(i + 2, end)
        .trim()
        .split(/\s+/)[0]
        .toLowerCase()
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tag.toLowerCase() === tag) {
          stack.length = j
          break
        }
      }
      i = end + 1
      continue
    }
    // 开始标签
    flushText()
    const parsed = parseOpenTag(html, i)
    if (!parsed) {
      textBuf += '<'
      i++
      continue
    }
    const { tag, attrs, selfClosing, next } = parsed
    const node: JsxNode = { tag, attrs, children: [] }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing && !VOID_TAGS.has(tag.toLowerCase())) stack.push(node)
    i = next
  }
  flushText()

  // 序列化
  const lines: string[] = []
  const renderChildren = (children: (JsxNode | string)[], depth: number) => {
    for (const child of children) {
      if (typeof child === 'string') {
        const decoded = decodeEntities(child)
        // 多行 JSX 会 trim 文本首尾空白，用表达式字面量保留原样（含 <pre> 内空白）
        if (decoded.trim() !== '' || decoded.includes('\n')) {
          lines.push(`${indent.repeat(depth)}{${JSON.stringify(decoded)}}`)
        }
        continue
      }
      renderNode(child, depth)
    }
  }
  const renderNode = (node: JsxNode, depth: number) => {
    const pad = indent.repeat(depth)
    const rawTag = node.tag
    // 大写开头但不在具名导出集合 → 警告（JSX 中会按字符串标签渲染）
    if (COMPONENT_TAG_RE.test(rawTag) && !componentNames.has(rawTag)) {
      warnings.push(
        `unknown component <${rawTag}> (not in <script lang="tsx"> named exports)`
      )
    }
    const tag = rawTag
    // 属性序列化
    const attrParts: string[] = []
    for (const [k, v] of node.attrs) {
      if (typeof v === 'string' && /^on[a-z]/i.test(k)) {
        warnings.push(
          `dropped string event attribute on*="${k}" (JSX event must be a function)`
        )
        continue
      }
      // Vue v-bind 简写（:foo）与 v-on 简写（@click）在 JSX 中非法 → 丢弃 + 警告
      if (/^[:@]/.test(k)) {
        warnings.push(
          `dropped Vue binding attribute "${k}" (ActView 无 v-bind/v-on, 用 JSX 表达式替代)`
        )
        continue
      }
      if (v === true) attrParts.push(k)
      else attrParts.push(`${k}="${escapeJsxAttr(decodeEntities(String(v)))}"`)
    }
    const attrStr = attrParts.length ? ` ${attrParts.join(' ')}` : ''
    if (node.children.length === 0) {
      lines.push(`${pad}<${tag}${attrStr} />`)
      return
    }
    // 单文本子节点 → 单行（含 JSX 特殊字符时用 JSON 字符串表达式，避免转义嵌套）
    if (
      node.children.length === 1 &&
      typeof node.children[0] === 'string' &&
      !node.children[0].includes('\n')
    ) {
      const decoded = decodeEntities(node.children[0])
      if (decoded.trim() === '') {
        lines.push(`${pad}<${tag}${attrStr} />`)
      } else if (/[{}<>'"]/.test(decoded)) {
        lines.push(
          `${pad}<${tag}${attrStr}>{${JSON.stringify(decoded)}}</${tag}>`
        )
      } else {
        lines.push(`${pad}<${tag}${attrStr}>${decoded}</${tag}>`)
      }
      return
    }
    lines.push(`${pad}<${tag}${attrStr}>`)
    renderChildren(node.children, depth + 1)
    lines.push(`${pad}</${tag}>`)
  }

  lines.push('<div>')
  renderChildren(root.children, 1)
  lines.push('</div>')

  return { code: lines.join('\n'), warnings }
}

// ============================================================
// HTML 实体解码（与浏览器 innerHTML 语义一致：单遍解码）
// ============================================================

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  iexcl: '\u00A1',
  cent: '\u00A2',
  pound: '\u00A3',
  curren: '\u00A4',
  yen: '\u00A5',
  brvbar: '\u00A6',
  sect: '\u00A7',
  uml: '\u00A8',
  copy: '\u00A9',
  ordf: '\u00AA',
  laquo: '\u00AB',
  not: '\u00AC',
  shy: '\u00AD',
  reg: '\u00AE',
  macr: '\u00AF',
  deg: '\u00B0',
  plusmn: '\u00B1',
  sup2: '\u00B2',
  sup3: '\u00B3',
  acute: '\u00B4',
  micro: '\u00B5',
  para: '\u00B6',
  middot: '\u00B7',
  cedil: '\u00B8',
  sup1: '\u00B9',
  ordm: '\u00BA',
  raquo: '\u00BB',
  frac14: '\u00BC',
  frac12: '\u00BD',
  frac34: '\u00BE',
  iquest: '\u00BF',
  Agrave: '\u00C0',
  Aacute: '\u00C1',
  Acirc: '\u00C2',
  Atilde: '\u00C3',
  Auml: '\u00C4',
  Aring: '\u00C5',
  AElig: '\u00C6',
  Ccedil: '\u00C7',
  Egrave: '\u00C8',
  Eacute: '\u00C9',
  Ecirc: '\u00CA',
  Euml: '\u00CB',
  Igrave: '\u00CC',
  Iacute: '\u00CD',
  Icirc: '\u00CE',
  Iuml: '\u00CF',
  ETH: '\u00D0',
  Ntilde: '\u00D1',
  Ograve: '\u00D2',
  Oacute: '\u00D3',
  Ocirc: '\u00D4',
  Otilde: '\u00D5',
  Ouml: '\u00D6',
  times: '\u00D7',
  Oslash: '\u00D8',
  Ugrave: '\u00D9',
  Uacute: '\u00DA',
  Ucirc: '\u00DB',
  Uuml: '\u00DC',
  Yacute: '\u00DD',
  THORN: '\u00DE',
  szlig: '\u00DF',
  agrave: '\u00E0',
  aacute: '\u00E1',
  acirc: '\u00E2',
  atilde: '\u00E3',
  auml: '\u00E4',
  aring: '\u00E5',
  aelig: '\u00E6',
  ccedil: '\u00E7',
  egrave: '\u00E8',
  eacute: '\u00E9',
  ecirc: '\u00EA',
  euml: '\u00EB',
  igrave: '\u00EC',
  iacute: '\u00ED',
  icirc: '\u00EE',
  iuml: '\u00EF',
  eth: '\u00F0',
  ntilde: '\u00F1',
  ograve: '\u00F2',
  oacute: '\u00F3',
  ocirc: '\u00F4',
  otilde: '\u00F5',
  ouml: '\u00F6',
  divide: '\u00F7',
  oslash: '\u00F8',
  ugrave: '\u00F9',
  uacute: '\u00FA',
  ucirc: '\u00FB',
  uuml: '\u00FC',
  yacute: '\u00FD',
  thorn: '\u00FE',
  yuml: '\u00FF',
  OElig: '\u0152',
  oelig: '\u0153',
  Scaron: '\u0160',
  scaron: '\u0161',
  Yuml: '\u0178',
  fnof: '\u0192',
  circ: '\u02C6',
  tilde: '\u02DC',
  ensp: '\u2002',
  emsp: '\u2003',
  thinsp: '\u2009',
  zwnj: '\u200C',
  zwj: '\u200D',
  lrm: '\u200E',
  rlm: '\u200F',
  ndash: '\u2013',
  mdash: '\u2014',
  lsquo: '\u2018',
  rsquo: '\u2019',
  sbquo: '\u201A',
  ldquo: '\u201C',
  rdquo: '\u201D',
  bdquo: '\u201E',
  dagger: '\u2020',
  Dagger: '\u2021',
  bull: '\u2022',
  hellip: '\u2026',
  permil: '\u2030',
  prime: '\u2032',
  Prime: '\u2033',
  lsaquo: '\u2039',
  rsaquo: '\u203A',
  oline: '\u203E',
  frasl: '\u2044',
  euro: '\u20AC',
  image: '\u2111',
  weierp: '\u2118',
  real: '\u211C',
  trade: '\u2122',
  alefsym: '\u2135',
  larr: '\u2190',
  uarr: '\u2191',
  rarr: '\u2192',
  darr: '\u2193',
  harr: '\u2194',
  crarr: '\u21B5',
  lArr: '\u21D0',
  uArr: '\u21D1',
  rArr: '\u21D2',
  dArr: '\u21D3',
  hArr: '\u21D4',
  forall: '\u2200',
  part: '\u2202',
  exist: '\u2203',
  empty: '\u2205',
  nabla: '\u2207',
  isin: '\u2208',
  notin: '\u2209',
  ni: '\u220B',
  prod: '\u220F',
  sum: '\u2211',
  minus: '\u2212',
  lowast: '\u2217',
  radic: '\u221A',
  prop: '\u221D',
  infin: '\u221E',
  ang: '\u2220',
  and: '\u2227',
  or: '\u2228',
  cap: '\u2229',
  cup: '\u222A',
  int: '\u222B',
  there4: '\u2234',
  sim: '\u223C',
  cong: '\u2245',
  asymp: '\u2248',
  ne: '\u2260',
  equiv: '\u2261',
  le: '\u2264',
  ge: '\u2265',
  sub: '\u2282',
  sup: '\u2283',
  nsub: '\u2284',
  sube: '\u2286',
  supe: '\u2287',
  oplus: '\u2295',
  otimes: '\u2297',
  perp: '\u22A5',
  sdot: '\u22C5',
  lceil: '\u2308',
  rceil: '\u2309',
  lfloor: '\u230A',
  rfloor: '\u230B',
  lang: '\u2329',
  rang: '\u232A',
  loz: '\u25CA',
  spades: '\u2660',
  clubs: '\u2663',
  hearts: '\u2665',
  diams: '\u2666'
}

export function decodeEntities(str: string): string {
  return str.replace(
    /&(#(?:x[0-9a-fA-F]+|[0-9]+)|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, ent: string) => {
      if (ent[0] === '#') {
        const code =
          ent[1] === 'x' || ent[1] === 'X'
            ? parseInt(ent.slice(2), 16)
            : parseInt(ent.slice(1), 10)
        if (Number.isFinite(code) && code > 0) {
          try {
            return String.fromCodePoint(code)
          } catch {
            return match
          }
        }
        return match
      }
      return NAMED_ENTITIES[ent] ?? match
    }
  )
}

const inferTitle = (
  md: MarkdownRenderer,
  frontmatter: Record<string, any>,
  title: string
) => {
  if (typeof frontmatter.title === 'string') {
    const titleToken = md.parseInline(frontmatter.title, {})[0]
    if (titleToken) {
      return resolveTitleFromToken(titleToken, {
        shouldAllowHtml: false,
        shouldEscapeText: false
      })
    }
  }
  return title
}

const inferDescription = (frontmatter: Record<string, any>) => {
  const { description, head } = frontmatter

  if (description !== undefined) {
    return description
  }

  return (head && getHeadMetaContent(head, 'description')) || ''
}

function countLineBreaks(str: string) {
  return str.match(/\r?\n/g)?.length ?? 0
}

const getHeadMetaContent = (head: HeadConfig[], name: string) => {
  if (!head || !head.length) {
    return undefined
  }

  const meta = head.find(([tag, attrs = {}]) => {
    return tag === 'meta' && attrs.name === name && attrs.content
  })

  return meta && meta[1].content
}
