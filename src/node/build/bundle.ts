import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as vite from 'vite'
import {
  build,
  normalizePath,
  type BuildOptions,
  type Rollup,
  type InlineConfig as ViteInlineConfig
} from 'vite'
import { APP_PATH } from '../alias'
import type { SiteConfig } from '../config'
import { createVitePressPlugin } from '../plugin'
import { escapeRegExp, sanitizeFileName, slash } from '../shared'
import { task } from '../utils/task'

const clientDir = normalizePath(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../client')
)

// these deps are also being used in the client code (outside of the theme)
// exclude them from the theme chunk so there is no circular dependency
const excludedModules = [
  '/@siteData',
  clientDir,
  // framework（client/app，含 data.ts 顶层 `siteDataRef = shallowRef(readonly(siteData))`）
  // 与 theme 共用的 actview 运行时依赖。若不排除，@actview/core（readonly/markRaw 等）
  // 会被打进 theme chunk，导致 framework 顶层初始化依赖 theme，形成
  // framework ↔ theme 循环：浏览器按「入口 → theme → framework」加载时，
  // framework 顶层执行 readonly(siteData) 时 theme 的 `var rawSet = new WeakSet`
  // 尚未赋值（var 提升为 undefined）→ `rawSet.has(...)` 崩溃。
  // 注意 '/actview' 只匹配裸包 actview，不匹配 @actview/*（路径为 /@actview/...），
  // 避免误排除 @actview/press 自身的 theme 代码。
  '@actview/core',
  '@actview/jsx',
  '@actview/router',
  '/actview'
]

// bundles the VitePress app for both client AND server.
export async function bundle(
  config: SiteConfig,
  options: BuildOptions
): Promise<{
  clientResult: Rollup.RollupOutput | null
  serverResult: Rollup.RollupOutput
  pageToHashMap: Record<string, string>
}> {
  const pageToHashMap = Object.create(null) as Record<string, string>

  // define custom rollup input
  // this is a multi-entry build - every page is considered an entry chunk
  // the loading is done via filename conversion rules so that the
  // metadata doesn't need to be included in the main chunk.
  const input: Record<string, string> = {}
  config.pages.forEach((file) => {
    // page filename conversion
    // foo/bar.md -> foo_bar.md
    const alias = config.rewrites.map[file] || file
    input[slash(alias).replace(/\//g, '_')] = path.resolve(config.srcDir, file)
  })

  const themeEntryRE = new RegExp(
    `^${escapeRegExp(
      path.resolve(config.themeDir, 'index.js').replace(/\\/g, '/')
    ).slice(0, -2)}m?(j|t)s`
  )

  // resolve options to pass to vite
  const { rollupOptions } = options

  const resolveViteConfig = async (
    ssr: boolean
  ): Promise<ViteInlineConfig> => ({
    root: config.srcDir,
    cacheDir: config.cacheDir,
    base: config.site.base,
    logLevel: config.vite?.logLevel ?? 'warn',
    plugins: await createVitePressPlugin(config, ssr, pageToHashMap),
    ssr: {
      noExternal: ['@actview/press', '@docsearch/css']
    },
    build: {
      ...options,
      emptyOutDir: true,
      ssr,
      minify: options.minify ?? !process.env.DEBUG,
      outDir: ssr ? config.tempDir : config.outDir,
      cssCodeSplit: false,
      rollupOptions: {
        ...rollupOptions,
        input: {
          // use different entry based on ssr or not
          app: path.resolve(APP_PATH, ssr ? 'ssr.js' : 'index.js'),
          ...input
        },
        // important so that each page chunk and the index export things for each
        // other
        preserveEntrySignatures: 'allow-extension',
        output: {
          sanitizeFileName,
          ...rollupOptions?.output,
          assetFileNames: `${config.assetsDir}/[name].[hash].[ext]`,
          ...(ssr
            ? {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].[hash].js'
              }
            : {
                entryFileNames: `${config.assetsDir}/[name].[hash].js`,
                chunkFileNames(chunk) {
                  // avoid ads chunk being intercepted by adblock
                  return /(?:Carbon|BuySell)Ads/.test(chunk.name)
                    ? `${config.assetsDir}/chunks/ui-custom.[hash].js`
                    : `${config.assetsDir}/chunks/[name].[hash].js`
                },
                // @ts-ignore skip setting it for rolldown-vite since it doesn't support `manualChunks`
                ...(vite.rolldownVersion
                  ? undefined
                  : {
                      manualChunks(
                        id: string,
                        ctx: Pick<Rollup.PluginContext, 'getModuleInfo'>
                      ) {
                        // move known framework code into a stable chunk so that
                        // custom theme changes do not invalidate hash for all pages
                        if (
                          id.startsWith('\0vite') ||
                          ctx.getModuleInfo(id)?.meta['vite:asset']
                        ) {
                          return 'framework'
                        }
                        if (
                          id.includes(`${clientDir}/app`) &&
                          id !== `${clientDir}/app/index.js`
                        ) {
                          return 'framework'
                        }
                        if (
                          (id.startsWith(`${clientDir}/theme-default`) ||
                            !excludedModules.some((i) => id.includes(i))) &&
                          staticImportedByEntry(
                            id,
                            ctx.getModuleInfo,
                            cacheTheme,
                            themeEntryRE
                          )
                        ) {
                          return 'theme'
                        }
                      }
                    })
              })
        }
      }
    },
    configFile: config.vite?.configFile
  })

  let clientResult!: Rollup.RollupOutput | null
  let serverResult!: Rollup.RollupOutput

  // client bundle：浏览器产物；server bundle：node 构建期渲染入口
  // （app.js 导出 render()，页面 chunk 导出 __pageData）。
  // 两者均为单次构建；vue/SSR 已移除，server bundle 只服务静态生成。
  await task('building client + server bundles', async () => {
    clientResult = (await build(
      await resolveViteConfig(false)
    )) as Rollup.RollupOutput
    serverResult = (await build(
      await resolveViteConfig(true)
    )) as Rollup.RollupOutput
  })

  // sort pageToHashMap to ensure stable output
  const sortedPageToHashMap = Object.create(null) as Record<string, string>
  Object.keys(pageToHashMap)
    .sort()
    .forEach((key) => {
      sortedPageToHashMap[key] = pageToHashMap[key]
    })

  return { clientResult, serverResult, pageToHashMap: sortedPageToHashMap }
}

const cacheTheme = new Map<string, boolean>()
function staticImportedByEntry(
  id: string,
  getModuleInfo: Rollup.GetModuleInfo,
  cache: Map<string, boolean>,
  entryRE: RegExp | null = null,
  importStack: string[] = []
): boolean {
  if (cache.has(id)) {
    return !!cache.get(id)
  }
  if (importStack.includes(id)) {
    // circular deps!
    cache.set(id, false)
    return false
  }
  const mod = getModuleInfo(id)
  if (!mod) {
    cache.set(id, false)
    return false
  }

  if (entryRE ? entryRE.test(id) : mod.isEntry) {
    cache.set(id, true)
    return true
  }
  const someImporterIs = mod.importers.some((importer: string) =>
    staticImportedByEntry(
      importer,
      getModuleInfo,
      cache,
      entryRE,
      importStack.concat(id)
    )
  )
  cache.set(id, someImporterIs)
  return someImporterIs
}
