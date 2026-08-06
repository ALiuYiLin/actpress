import path from 'node:path'
import c from 'picocolors'
import { transformWithEsbuild } from 'vite'
import {
  mergeConfig,
  normalizePath,
  searchForWorkspaceRoot,
  type EnvironmentModuleNode,
  type Plugin,
  type ResolvedConfig,
  type Rollup,
  type UserConfig
} from 'vite'
import {
  APP_PATH,
  DEFAULT_THEME_PATH,
  DIST_CLIENT_PATH,
  SITE_DATA_ID,
  SITE_DATA_REQUEST_PATH,
  resolveAliases
} from './alias'
import { isAdditionalConfigFile, resolvePages, type SiteConfig } from './config'
import {
  clearCache,
  createMarkdownToActViewRenderFn,
  type MarkdownCompileResult
} from './markdownToActView'
import { dynamicRoutesPlugin } from './plugins/dynamicRoutesPlugin'
import { localSearchPlugin } from './plugins/localSearchPlugin'
import { rewritesPlugin } from './plugins/rewritesPlugin'
import { staticDataPlugin } from './plugins/staticDataPlugin'
import { webFontsPlugin } from './plugins/webFontsPlugin'
import { slash, type PageDataPayload } from './shared'
import { deserializeFunctions, serializeFunctions } from './utils/fnSerialize'
import { cacheAllGitTimestamps } from './utils/getGitTimestamp'

declare module 'vite' {
  interface UserConfig {
    vitepress?: SiteConfig
  }
}

const themeRE = /(?:^|\/)\.vitepress\/theme\/index\.(m|c)?(j|t)s$/
const startsWithThemeRE = /^@theme(?:\/|$)/
const docsearchRE = /\/docsearch\.css(?:$|\?)/

const hashRE = /\.([-\w]+)\.js$/
const staticInjectMarkerRE = /\bcreateStaticVNode\((?:(".*")|('.*')), (\d+)\)/g
const staticStripRE = /['"`]__VP_STATIC_START__[^]*?__VP_STATIC_END__['"`]/g
const staticRestoreRE = /__VP_STATIC_(START|END)__/g

// matches client-side js blocks in MPA mode.
// in the future we may add different execution strategies like visible or
// media queries.
const scriptClientRE = /<script\b[^>]*client\b[^>]*>([^]*?)<\/script>/

const isPageChunk = (
  chunk: Rollup.OutputAsset | Rollup.OutputChunk
): chunk is Rollup.OutputChunk & { facadeModuleId: string } =>
  !!(
    chunk.type === 'chunk' &&
    chunk.isEntry &&
    chunk.facadeModuleId &&
    chunk.facadeModuleId.endsWith('.md')
  )

const cleanUrl = (url: string): string => url.replace(/[?#].*$/s, '')

export async function createVitePressPlugin(
  siteConfig: SiteConfig,
  ssr = false,
  pageToHashMap?: Record<string, string>,
  restartServer?: () => Promise<void>
) {
  const {
    srcDir,
    configPath,
    configDeps,
    markdown,
    site,
    vite: userViteConfig,
    lastUpdated,
    cleanUrls
  } = siteConfig

  let markdownToActView: Awaited<
    ReturnType<typeof createMarkdownToActViewRenderFn>
  >

  const processClientJS = (code: string, id: string) => {
    return scriptClientRE.test(code)
      ? code.replace(scriptClientRE, (_) =>
          `\n`.repeat(_.split('\n').length - 1)
        )
      : code
  }

  /**
   * 把 markdownToActView 生成的 .tsx 模块编译为可执行 JS：
   * 1. esbuild 转 JSX（automatic runtime @actview/jsx）
   * 2. @actview/plugin（Babel）把裸函数组件包成 defineComponent
   *    （渲染器只认 { __setup }，裸函数会在运行时崩）
   */
  const compileActViewSrc = async (src: string): Promise<string> => {
    // 用 vite 的 transformWithEsbuild（内部处理 esbuild 的 ESM/__filename 问题；
    // 直接 import esbuild 会在 dist ESM 产物里崩）
    const { code: js } = await transformWithEsbuild(src, 'page.md.tsx', {
      loader: 'tsx',
      jsx: 'automatic',
      jsxImportSource: '@actview/jsx',
      target: 'es2020'
    })
    const out = await rawActViewPlugin.transform(js, 'virtual-actview-md.js')
    return out?.code ?? js
  }

  let siteData = site
  let allDeadLinks: MarkdownCompileResult['deadLinks'] = []
  let config: ResolvedConfig
  let importerMap: Record<string, Set<string> | undefined> = {}

  // enforce:'pre'：必须在 rolldown-vite 的内建 import-analysis（normal 级，
  // 且排在用户 normal 插件之前）之前把 .md 转成 JS，否则它会 parse md 原文
  // 报 "Failed to parse source for import analysis ... invalid JS syntax"。
  const vitePressPlugin: Plugin = {
    name: '@actview/press',
    enforce: 'pre',

    async configResolved(resolvedConfig) {
      config = resolvedConfig
      // pre-resolve git timestamps
      if (lastUpdated) await cacheAllGitTimestamps(srcDir)
      markdownToActView = await createMarkdownToActViewRenderFn(
        srcDir,
        markdown,
        config.base,
        lastUpdated,
        cleanUrls,
        siteConfig
      )
    },

    async config() {
      // esbuild 负责 JSX → jsx() 调用；actviewPlugin（Babel 转 defineComponent）
      // 已移至顶层 plugins 数组（见 createVitePressPlugin 返回值）——rolldown-vite
      // 对 config() 钩子返回的 plugins 不保证合并进 transform 管线
      const baseConfig: UserConfig = {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: '@actview/jsx'
        },
        resolve: {
          alias: resolveAliases(siteConfig.root, ssr)
        },
        define: {
          __VP_LOCAL_SEARCH__: site.themeConfig?.search?.provider === 'local',
          __ALGOLIA__:
            site.themeConfig?.search?.provider === 'algolia' ||
            !!site.themeConfig?.algolia, // legacy
          __CARBON__: !!site.themeConfig?.carbonAds,
          __ASSETS_DIR__: JSON.stringify(siteConfig.assetsDir)
        },
        optimizeDeps: {
          exclude: [
            '@docsearch/js',
            '@docsearch/sidepanel-js',
            '@actview/press'
          ]
        },
        server: {
          fs: {
            allow: [
              DIST_CLIENT_PATH,
              srcDir,
              searchForWorkspaceRoot(process.cwd())
            ]
          }
        },
        vitepress: siteConfig
      }
      return userViteConfig
        ? mergeConfig(baseConfig, userViteConfig)
        : baseConfig
    },

    resolveId(id, importer, resolveOptions) {
      if (id === SITE_DATA_ID) {
        return SITE_DATA_REQUEST_PATH
      }
      if (startsWithThemeRE.test(id)) {
        return this.resolve(
          siteConfig.themeDir + id.slice(6),
          importer,
          Object.assign({ skipSelf: true }, resolveOptions)
        )
      }
    },

    load(id) {
      if (id === SITE_DATA_REQUEST_PATH) {
        let data = siteData
        // head info is not needed by the client in production build
        if (config.command === 'build') {
          data = { ...siteData, head: [] }
          // in production client build, the data is inlined on each page
          // to avoid config changes invalidating every chunk.
          if (!ssr) {
            return `export default window.__VP_SITE_DATA__`
          }
        }
        data = serializeFunctions(data)
        return `${deserializeFunctions};export default deserializeFunctions(JSON.parse(${JSON.stringify(JSON.stringify(data))}))`
      }
    },

    async transform(code, id) {
      if (docsearchRE.test(normalizePath(id))) {
        return code.replaceAll('[data-theme=dark]', '.dark')
      }
      if (id.endsWith('.vue')) {
        return processClientJS(code, id)
      }
      // dev 下 id 可能带 query（rolldown-vite 传 ?t= 等），先剥掉再判断扩展名
      const cleanId = cleanUrl(id)
      if (cleanId.endsWith('.md')) {
        const relativePath = path.posix.relative(srcDir, cleanId)
        // transform .md files into an ActView module (createElement-based VNode tree)
        const { actViewSrc, deadLinks, includes, pageData } =
          await markdownToActView(code, cleanId, config.publicDir)
        allDeadLinks.push(...deadLinks)
        if (includes.length) {
          includes.forEach((i) => {
            ;(importerMap[slash(i)] ??= new Set()).add(relativePath)
            this.addWatchFile(i)
          })
        }
        if (
          this.environment.mode === 'dev' &&
          this.environment.name === 'client'
        ) {
          logDeadLinks(deadLinks, siteConfig.logger, true)
          const payload: PageDataPayload = {
            path: `/${siteConfig.rewrites.map[relativePath] || relativePath}`,
            pageData
          }
          // notify the client to update page data
          this.environment.hot.send({
            type: 'custom',
            event: 'vitepress:pageData',
            data: payload
          })
        }
        return processClientJS(await compileActViewSrc(actViewSrc), id)
      }
    },

    renderStart() {
      if (allDeadLinks.length > 0) {
        logDeadLinks(allDeadLinks, siteConfig.logger)
        siteConfig.logger.info(
          c.cyan(
            '\nIf this is expected, you can disable this check via config. Refer: https://vitepress.dev/reference/site-config#ignoredeadlinks\n'
          )
        )
        throw new Error(`${allDeadLinks.length} dead link(s) found.`)
      }
    },

    configureServer(server) {
      if (configPath) {
        server.watcher.add(configPath)
        configDeps.forEach((file) => server.watcher.add(file))
      }

      // rolldown-vite：带 ?t= 时间戳 query 的 .tsx 请求不经过 JS 插件 transform
      // （@actview/plugin 的 Babel 转换被跳过 → 组件以裸函数进入运行时崩溃）。
      // 剥掉 query 落到无 query 的转换管线（moduleGraph 缓存，Babel 生效）。
      // serve our index.html after vite history fallback
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url && cleanUrl(req.url)
          if (url?.endsWith('.html')) {
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            let html = `\
<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="description" content="">
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/@fs/${APP_PATH}/index.js"></script>
  </body>
</html>`
            html = await server.transformIndexHtml(url, html, req.originalUrl)
            res.end(html)
            return
          }
          next()
        })
      }
    },

    renderChunk(code, chunk) {
      if (!ssr && isPageChunk(chunk as Rollup.OutputChunk)) {
        // For each page chunk, inject marker for start/end of static strings.
        // we do this here because in generateBundle the chunks would have been
        // minified and we won't be able to safely locate the strings.
        // Using a regexp relies on specific output from Vue compiler core,
        // which is a reasonable trade-off considering the massive perf win over
        // a full AST parse.
        code = code.replace(staticInjectMarkerRE, (_, str1, str2, flag) => {
          const str = str1 || str2
          const quote = str[0]
          return `createStaticVNode(${quote}__VP_STATIC_START__${str.slice(1, -1)}__VP_STATIC_END__${quote}, ${flag})`
        })
        return code
      }
      return null
    },

    generateBundle: {
      order: ssr ? null : 'post',
      handler(_options, bundle) {
        if (ssr) {
          this.emitFile({
            type: 'asset',
            fileName: 'package.json',
            source: '{ "private": true, "type": "module" }'
          })
          return
        }

        // client build:
        // for each .md entry chunk, adjust its name to its correct path.
        for (const name in bundle) {
          const chunk = bundle[name]
          if (isPageChunk(chunk)) {
            // record page -> hash relations
            const hash = chunk.fileName.match(hashRE)![1]
            pageToHashMap![chunk.name.toLowerCase()] = hash

            // inject another chunk with the content stripped
            this.emitFile({
              type: 'asset',
              name: name + '-lean',
              fileName: chunk.fileName.replace(/\.js$/, '.lean.js'),
              source: chunk.code.replace(staticStripRE, `""`)
            })

            // remove static markers from original code
            chunk.code = chunk.code.replace(staticRestoreRE, '')
          }
        }
      }
    },

    async hotUpdate({ file, type }) {
      if (this.environment.name !== 'client') return
      const relativePath = path.posix.relative(srcDir, file)

      // update pages, dynamicRoutes and rewrites on md file creation / deletion
      if (file.endsWith('.md') && type !== 'update') {
        await resolvePages(siteConfig)
      }

      if (type === 'delete') {
        delete importerMap[relativePath]
      }

      if (
        file === configPath ||
        configDeps.includes(file) ||
        isAdditionalConfigFile(file)
      ) {
        siteConfig.logger.info(
          c.green(
            `${path.relative(process.cwd(), file)} changed, restarting server...\n`
          ),
          { clear: true, timestamp: true }
        )

        return restartServer?.()
      }

      if (themeRE.test(relativePath) && type !== 'update') {
        siteConfig.themeDir =
          type === 'create' ? path.posix.dirname(file) : DEFAULT_THEME_PATH
        siteConfig.logger.info(c.green('page reload ') + c.dim(relativePath), {
          clear: true,
          timestamp: true
        })
        this.environment.moduleGraph.invalidateAll()
        this.environment.hot.send({ type: 'full-reload' })
        return []
      }
    }
  }

  const hmrFix: Plugin = {
    name: 'vitepress:hmr-fix',
    async hotUpdate({ file, modules: existingMods }) {
      if (this.environment.name !== 'client') return
      const modules: EnvironmentModuleNode[] = []

      if (file.endsWith('.md')) {
        const mod = this.environment.moduleGraph.getModuleById(file)
        mod && modules.push(mod)
      }

      importerMap[slash(file)]?.forEach((relativePath) => {
        clearCache(relativePath)
        const mod = this.environment.moduleGraph.getModuleById(
          path.posix.join(srcDir, relativePath)
        )
        mod && modules.push(mod)
      })

      return modules.length ? [...existingMods, ...modules] : undefined
    }
  }

  // @actview/plugin（enforce:'pre'，Babel 把函数组件转 defineComponent）
  const { actviewPlugin } = await import('@actview/plugin')
  const rawActViewPlugin = actviewPlugin()

  // rolldown-vite dev 的模块 id 带 ?t= 时间戳 query，@actview/plugin 内部
  // `id.endsWith('.tsx')` 不匹配 → Babel 转换被跳过 → 组件以裸函数进入运行时
  // （createElement('function ...') 崩溃）。剥 query 后转发；@actview/plugin
  // 1.0.6 已内置该修复，此处兜底兼容旧版本。
  const actViewPlugin = {
    ...rawActViewPlugin,
    transform(code: string, id: string) {
      return rawActViewPlugin.transform(code, id.split('?')[0] || id)
    }
  }

  return [
    actViewPlugin,
    vitePressPlugin,
    rewritesPlugin(siteConfig),
    hmrFix,
    webFontsPlugin(siteConfig.useWebFonts),
    ...(userViteConfig?.plugins || []),
    await localSearchPlugin(siteConfig),
    staticDataPlugin,
    await dynamicRoutesPlugin(siteConfig)
  ]
}

function logDeadLinks(
  deadLinks: MarkdownCompileResult['deadLinks'],
  logger: SiteConfig['logger'],
  devMode = false
) {
  const logged = new Set<string>()
  deadLinks.forEach(({ url, file, line }, i) => {
    const location = line == null ? file : `${file}:${line}`
    const key = `${location}:::${url}`
    if (logged.has(key)) return
    logged.add(key)
    const prefix = '\n'.repeat(i === 0 ? (devMode ? 1 : 2) : 0)
    logger.warn(
      c.yellow(
        `${prefix}(!) Found dead link ${c.cyan(url)} in file ${c.white(c.dim(location))}`
      )
    )
  })
}
