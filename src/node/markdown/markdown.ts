import {
  componentPlugin,
  type ComponentPluginOptions
} from '@mdit-vue/plugin-component'
import {
  frontmatterPlugin,
  type FrontmatterPluginOptions
} from '@mdit-vue/plugin-frontmatter'
import {
  headersPlugin,
  type HeadersPluginOptions
} from '@mdit-vue/plugin-headers'
import { titlePlugin } from '@mdit-vue/plugin-title'
import { tocPlugin, type TocPluginOptions } from '@mdit-vue/plugin-toc'
import { slugify as defaultSlugify } from '@mdit-vue/shared'
import type {
  CodeToHastOptions,
  LanguageInput,
  ShikiTransformer,
  ThemeRegistrationAny
} from '@shikijs/types'
import anchorPlugin from 'markdown-it-anchor'
import { MarkdownItAsync, type MarkdownItAsyncOptions } from 'markdown-it-async'
import attrsPlugin, { type MarkdownItAttrsOptions } from 'markdown-it-attrs'
import mditCjkFriendly from 'markdown-it-cjk-friendly'
import { full as emojiPlugin } from 'markdown-it-emoji'
import type { BuiltinLanguage, BuiltinTheme, Highlighter } from 'shiki'
import type { Logger } from 'vite'
import type { Awaitable } from '../shared'
import { containerPlugin, type ContainerOptions } from './plugins/containers'
import { gitHubAlertsPlugin } from './plugins/githubAlerts'
import { highlight as createHighlighter } from './plugins/highlight'
import { imagePlugin, type Options as ImageOptions } from './plugins/image'
import { lineNumberPlugin } from './plugins/lineNumbers'
import { linkPlugin } from './plugins/link'
import { preWrapperPlugin } from './plugins/preWrapper'
import { restoreEntities } from './plugins/restoreEntities'
import { snippetPlugin } from './plugins/snippet'

export type { Header } from '../shared'

export type ThemeOptions =
  | ThemeRegistrationAny
  | BuiltinTheme
  | {
      light: ThemeRegistrationAny | BuiltinTheme
      dark: ThemeRegistrationAny | BuiltinTheme
    }

export interface MarkdownOptions extends MarkdownItAsyncOptions {
  /* ==================== General Options ==================== */

  /**
   * Setup markdown-it instance before applying plugins
   */
  preConfig?: (md: MarkdownItAsync) => Awaitable<void>
  /**
   * Setup markdown-it instance
   */
  config?: (md: MarkdownItAsync) => Awaitable<void>
  /**
   * Disable cache (experimental)
   */
  cache?: boolean
  externalLinks?: Record<string, string>

  /* ==================== Syntax Highlighting ==================== */

  /**
   * Custom theme for syntax highlighting.
   *
   * You can also pass an object with `light` and `dark` themes to support dual themes.
   *
   * @example { theme: 'github-dark' }
   * @example { theme: { light: 'github-light', dark: 'github-dark' } }
   *
   * You can use an existing theme.
   * @see https://shiki.style/themes
   * Or add your own theme.
   * @see https://shiki.style/guide/load-theme
   */
  theme?: ThemeOptions
  /**
   * Custom languages for syntax highlighting or pre-load built-in languages.
   * @see https://shiki.style/languages
   */
  languages?: (LanguageInput | BuiltinLanguage)[]
  /**
   * Custom language aliases for syntax highlighting.
   * Maps custom language names to existing languages.
   * Alias lookup is case-insensitive and underscores in language names are displayed as spaces.
   *
   * @example
   *
   * Maps `my_lang` to use Python syntax highlighting.
   * ```js
   * { 'my_lang': 'python' }
   * ```
   *
   * Usage in markdown:
   * ````md
   * ```My_Lang
   * # This will be highlighted as Python code
   * # and will show "My Lang" as the language label
   * print("Hello, World!")
   * ```
   * ````
   *
   * @see https://shiki.style/guide/load-lang#custom-language-aliases
   */
  languageAlias?: Record<string, string>
  /**
   * Custom language labels for display.
   * Overrides the default language label shown in code blocks.
   * Keys are case-insensitive.
   *
   * @example { 'vue': 'Vue SFC' }
   */
  languageLabel?: Record<string, string>
  /**
   * Show line numbers in code blocks
   * @default false
   */
  lineNumbers?: boolean
  /**
   * Fallback language when the specified language is not available.
   */
  defaultHighlightLang?: string
  /**
   * Transformers applied to code blocks
   * @see https://shiki.style/guide/transformers
   */
  codeTransformers?: ShikiTransformer[]
  /**
   * Color replacements applied during syntax highlighting.
   * Accepts either a flat color map or per-theme replacements.
   * @see https://shiki.style/guide/theme-colors#color-replacements
   */
  colorReplacements?: CodeToHastOptions['colorReplacements']
  /**
   * Setup Shiki instance
   */
  shikiSetup?: (shiki: Highlighter) => void | Promise<void>
  /**
   * The tooltip text for the copy button in code blocks
   * @default 'Copy Code'
   */
  codeCopyButtonTitle?: string

  /* ==================== Markdown It Plugins ==================== */

  /**
   * Options for `markdown-it-anchor`
   * @see https://github.com/valeriangalliat/markdown-it-anchor
   */
  anchor?: anchorPlugin.AnchorOptions
  /**
   * Options for `markdown-it-attrs`
   * @see https://github.com/arve0/markdown-it-attrs
   */
  attrs?: MarkdownItAttrsOptions & { disable?: boolean }
  /**
   * Options for `markdown-it-emoji`
   * @see https://github.com/markdown-it/markdown-it-emoji
   */
  emoji?: {
    defs?: Record<string, string>
    enabled?: string[]
    shortcuts?: Record<string, string | string[]>
  }
  /**
   * Options for `@mdit-vue/plugin-frontmatter`
   * @see https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-frontmatter
   */
  frontmatter?: FrontmatterPluginOptions
  /**
   * Options for `@mdit-vue/plugin-headers`
   * @see https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-headers
   */
  headers?: HeadersPluginOptions | boolean
  /**
   * Options for `@mdit-vue/plugin-toc`
   * @see https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-toc
   */
  toc?: TocPluginOptions
  /**
   * Options for `@mdit-vue/plugin-component`
   * @see https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-component
   */
  component?: ComponentPluginOptions
  /**
   * Options for `markdown-it-container`
   * @see https://github.com/markdown-it/markdown-it-container
   */
  container?: ContainerOptions
  /**
   * Math support
   *
   * You need to install `markdown-it-mathjax3` and set `math` to `true` to enable it.
   * You can also pass options to `markdown-it-mathjax3` here.
   * @default false
   * @see https://vitepress.dev/guide/markdown#math-equations
   */
  math?: boolean | any
  image?: ImageOptions
  /**
   * Allows disabling the github alerts plugin
   * @default true
   * @see https://vitepress.dev/guide/markdown#github-flavored-alerts
   */
  gfmAlerts?: boolean
  /**
   * Allows disabling the CJK-friendly plugin.
   * This plugin adds support for emphasis marks (**bold**) in Japanese, Chinese, and Korean text.
   * @default true
   * @see https://github.com/tats-u/markdown-cjk-friendly
   */
  cjkFriendlyEmphasis?: boolean
  /**
   * @see cjkFriendlyEmphasis
   * @deprecated use `cjkFriendly` instead
   */
  cjkFriendly?: boolean
}

export type MarkdownRenderer = MarkdownItAsync

/**
 * 匹配独占一行的 `<script ...>...</script>` 块：
 * 带 `lang="tsx"` 或 `setup` 属性的（页面逻辑代码）→ 提取提升到模块顶层；
 * 其他（如 `<script>console.log(...)</script>`）→ 当 HTML 原样渲染。
 */
const TSX_SCRIPT_BLOCK_RE =
  /^<script\b[^>]*(?:\blang=["']tsx["']|\bsetup\b)[^>]*>([\s\S]*)<\/script>\s*$/is

/**
 * 自定义 SFC 提取插件（替代 @mdit-vue/plugin-sfc）。
 *
 * 提取 `<script lang="tsx">` 与 `<script setup>` 块到 `env.sfcBlocks.scripts`，
 * 供 markdownToActView 提升到模块顶层共享作用域。
 * 其余所有标签（普通 `<script>`、`<style>`、custom block 等）一律留在 HTML
 * 原样渲染——「md = 一个 tsx 文件，其他标签当 HTML」。
 */
function tsxSfcPlugin(md: MarkdownRenderer) {
  const htmlBlockRule = md.renderer.rules.html_block
  md.renderer.rules.html_block = (
    tokens: any[],
    idx: number,
    options: any,
    env: any,
    self: any
  ) => {
    if (!env) return htmlBlockRule!(tokens, idx, options, env, self)
    // 懒初始化 sfcBlocks 契约（与 @mdit-vue/plugin-sfc 一致）
    if (!env.sfcBlocks) {
      env.sfcBlocks = {
        template: null,
        script: null,
        scriptSetup: null,
        scripts: [],
        styles: [],
        customBlocks: []
      }
    }
    const content = tokens[idx].content
    const match = content.match(TSX_SCRIPT_BLOCK_RE)
    if (!match) return htmlBlockRule!(tokens, idx, options, env, self)
    env.sfcBlocks.scripts.push({
      type: 'script',
      content,
      // markdownToActView 预处理的 script 占位块（规避 html_block 截断）：
      // 内容为占位 key 时，从 env.__avScriptBlocks 还原原始 script 块
      contentStripped: restoreScriptPlaceholder(match[1], env),
      tagOpen: content.slice(0, content.indexOf('>') + 1),
      tagClose: '</script>'
    })
    return ''
  }
}

/**
 * 还原 script 占位内容：markdownToActView 渲染前把 `<script setup>` 块替换为
 * `<script setup>\n<KEY>\n</script>`（markdown-it 的 html_block type 7 以任意
 * `</(script|pre|style|textarea)>` 终止，script 块内组件 JSX 含 `</pre>` 等
 * 闭合标签会被提前截断）。这里把占位 key 还原为原始 script 块内容。
 */
function restoreScriptPlaceholder(stripped: string, env: any): string {
  const blocks: { key: string; content: string }[] | undefined =
    env?.__avScriptBlocks
  if (!blocks) return stripped
  const key = stripped.trim()
  for (const block of blocks) {
    if (block.key !== key) continue
    const m = /^<script\b[^>]*>([\s\S]*)<\/script>\s*$/is.exec(block.content)
    return m ? m[1] : stripped
  }
  return stripped
}

// highlight is marked as any to avoid type conflicts with plugins expecting
// regular markdown-it which has sync highlight function. Such plugins will fail
// if they access highlight directly but currently none of the ones we use do that.
let md: (MarkdownRenderer & { options: { highlight?: any } }) | undefined
let _disposeHighlighter: (() => void) | undefined

export function disposeMdItInstance() {
  if (md) {
    md = undefined
    _disposeHighlighter?.()
  }
}

/**
 * @experimental
 */
export async function createMarkdownRenderer(
  srcDir: string,
  options: MarkdownOptions = {},
  base = '/',
  logger: Pick<Logger, 'warn'> = console
): Promise<MarkdownRenderer> {
  if (md) return md

  const theme = options.theme ?? { light: 'github-light', dark: 'github-dark' }
  const codeCopyButtonTitle = options.codeCopyButtonTitle || 'Copy Code'

  let [highlight, dispose] = options.highlight
    ? [options.highlight, () => {}]
    : await createHighlighter(theme, options, logger)

  _disposeHighlighter = dispose

  md = new MarkdownItAsync({ html: true, linkify: true, highlight, ...options })

  md.linkify.set({ fuzzyLink: false })
  restoreEntities(md)

  if (options.preConfig) {
    await options.preConfig(md)
  }

  const slugify = options.anchor?.slugify ?? defaultSlugify

  // custom plugins
  componentPlugin(md, options.component)
  preWrapperPlugin(md, {
    codeCopyButtonTitle,
    languageLabel: options.languageLabel
  })
  snippetPlugin(md, srcDir)
  containerPlugin(md, options.container)
  imagePlugin(md, options.image)
  linkPlugin(
    md,
    { target: '_blank', rel: 'noreferrer', ...options.externalLinks },
    base,
    slugify
  )
  lineNumberPlugin(md, options.lineNumbers)

  const tableOpen = md.renderer.rules.table_open
  md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx]
    if (token.attrIndex('tabindex') < 0) token.attrPush(['tabindex', '0'])
    return tableOpen
      ? tableOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }

  if (options.gfmAlerts !== false) {
    gitHubAlertsPlugin(md, options.container)
  }

  // third party plugins
  if (!options.attrs?.disable) {
    attrsPlugin(md, options.attrs)
  }
  emojiPlugin(md, options.emoji)

  // mdit-vue plugins
  anchorPlugin(md, {
    slugify,
    getTokensText: (tokens) => {
      return tokens
        .filter((t) => !['html_inline', 'emoji'].includes(t.type))
        .map((t) => t.content)
        .join('')
    },
    permalink: (slug, _, state, idx) => {
      const title =
        state.tokens[idx + 1]?.children
          ?.filter((token) => ['text', 'code_inline'].includes(token.type))
          .reduce((acc, t) => acc + t.content, '')
          .trim() || ''

      const linkTokens = [
        Object.assign(new state.Token('text', '', 0), { content: ' ' }),
        Object.assign(new state.Token('link_open', 'a', 1), {
          attrs: [
            ['class', 'header-anchor'],
            ['href', `#${slug}`],
            ['aria-label', `Permalink to “${title}”`]
          ]
        }),
        Object.assign(new state.Token('html_inline', '', 0), {
          content: '&#8203;',
          meta: { isPermalinkSymbol: true }
        }),
        new state.Token('link_close', 'a', -1)
      ]

      state.tokens[idx + 1].children?.push(...linkTokens)
    },
    ...options.anchor
  })

  frontmatterPlugin(md, options.frontmatter)

  if (options.headers) {
    headersPlugin(md, {
      level: [2, 3, 4, 5, 6],
      slugify,
      ...(typeof options.headers === 'boolean' ? undefined : options.headers)
    })
  }

  // 自定义 SFC 提取：只提取 `<script lang="tsx">` 块（含 `<script lang="tsx" setup>`）
  // 到 env.sfcBlocks.scripts（内容提升到模块顶层共享作用域）。
  // 其余 `<script>` / `<style>` / 其他标签一律留在 HTML 原样渲染（当 HTML）。
  tsxSfcPlugin(md)
  titlePlugin(md)
  tocPlugin(md, {
    slugify,
    ...options.toc,
    format: (s) => {
      const title = s.replaceAll('&amp;', '&') // encoded twice because of restoreEntities
      return options.toc?.format?.(title) ?? title
    }
  })

  if (options.math) {
    try {
      const mathPlugin = await import('markdown-it-mathjax3')
      ;(mathPlugin.default ?? mathPlugin)(md, {
        ...(typeof options.math === 'boolean' ? {} : options.math)
      })
      const origMathInline = md.renderer.rules.math_inline!
      md.renderer.rules.math_inline = function (...args) {
        return origMathInline
          .apply(this, args)
          .replace(/^<mjx-container /, '<mjx-container v-pre ')
      }
      const origMathBlock = md.renderer.rules.math_block!
      md.renderer.rules.math_block = function (...args) {
        return origMathBlock
          .apply(this, args)
          .replace(/^<mjx-container /, '<mjx-container v-pre tabindex="0" ')
      }
    } catch (error) {
      throw new Error(
        'You need to install `markdown-it-mathjax3@^4` to use math support.'
      )
    }
  }

  if (options.cjkFriendlyEmphasis !== false && options.cjkFriendly !== false) {
    mditCjkFriendly(md)
  }

  // apply user config
  if (options.config) {
    await options.config(md)
  }

  return md
}
