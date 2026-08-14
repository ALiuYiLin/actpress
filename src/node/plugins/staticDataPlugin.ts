import { readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import pm from 'picomatch'
import {
  normalizePath,
  transformWithEsbuild,
  type EnvironmentModuleNode,
  type Plugin,
  type ViteDevServer
} from 'vite'
import type { Awaitable } from '../shared'
import { glob, normalizeGlob, type GlobOptions } from '../utils/glob'

const loaderMatch = /\.data\.m?(j|t)s($|\?)/

let server: ViteDevServer

export interface LoaderModule<T = any> {
  watch?: string[] | string
  load: (watchedFiles: string[]) => Awaitable<T>
  options?: { globOptions?: GlobOptions }
}

/**
 * Helper for defining loaders with type inference
 */
export function defineLoader<T>(loader: LoaderModule<T>): LoaderModule<T> {
  return loader
}

// Map from loader module id to its module info
const idToLoaderModulesMap: Record<
  string,
  (Required<Omit<LoaderModule, 'watch'>> & { watch: string[] }) | undefined
> = Object.create(null)

/**
 * 加载并执行 data loader 模块（返回其 default 导出的 LoaderModule）。
 *
 * 替代 vite 的 loadConfigFromFile：后者通过 config bundle 解析 import，
 * 无法处理 `import { defineLoader } from 'vitepress'`（Vue 版 vitepress 的
 * 写法，actpress 环境无该包）。这里直接读取源文件、把 `vitepress` 导入
 * 重写为 `@actview/press`、esbuild 转译后写入同目录临时文件再 import——
 * 同目录保证相对导入与 node_modules 包解析（@actview/press）均可解析。
 */
async function loadLoaderModule(id: string): Promise<LoaderModule> {
  const cleanId = id.replace(/\?.*$/, '')
  let code = await readFile(cleanId, 'utf-8')
  code = code.replace(
    /from\s*['"]vitepress['"]/g,
    `from ${JSON.stringify('@actview/press')}`
  )
  const { code: js } = await transformWithEsbuild(code, cleanId, {
    loader: 'ts',
    format: 'esm',
    target: 'node18'
  })
  const tmp = `${cleanId}.__actview_loader__.mjs`
  await writeFile(tmp, js)
  try {
    const mod = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`)
    return (mod.default ?? mod) as LoaderModule
  } finally {
    await unlink(tmp).catch(() => {})
  }
}

// Map from dependency file to a set of loader module ids
const depToLoaderModuleIdsMap: Record<string, Set<string>> = Object.create(null)

// During build, the load hook will be called on the same file twice
// once for client and once for server build. Not only is this wasteful, it
// also leads to a race condition in loadConfigFromFile() that results in an
// fs unlink error. So we reuse the same Promise during build to avoid double
// loading.
let idToPendingPromiseMap: Record<string, Promise<string> | undefined> =
  Object.create(null)
let isBuild = false

export const staticDataPlugin: Plugin = {
  name: 'vitepress:data',

  configResolved(config) {
    isBuild = config.command === 'build'
  },

  configureServer(_server) {
    server = _server
  },

  async load(id) {
    if (loaderMatch.test(id)) {
      let _resolve: ((res: any) => void) | undefined
      if (isBuild) {
        if (idToPendingPromiseMap[id]) return idToPendingPromiseMap[id]
        idToPendingPromiseMap[id] = new Promise((r) => {
          _resolve = r
        })
      }

      const base = path.dirname(id)
      let watch: LoaderModule['watch']
      let load: LoaderModule['load']
      let options: LoaderModule['options']

      const existing = idToLoaderModulesMap[id]
      if (existing) {
        ;({ watch, load, options } = existing)
      } else {
        const loaderModule = await loadLoaderModule(id)

        watch = normalizeGlob(loaderModule.watch, base)
        load = loaderModule.load
        options = loaderModule.options || {}
      }

      // load the data
      const watchedFiles = await glob(watch, {
        absolute: true,
        ...options.globOptions
      })
      const data = await load(watchedFiles)

      // record loader module for HMR
      if (server) idToLoaderModulesMap[id] = { watch, load, options }

      const result = `export const data = JSON.parse(${JSON.stringify(JSON.stringify(data))})`

      if (_resolve) _resolve(result)
      return result
    }
  },

  hotUpdate({ file, modules: existingMods }) {
    if (this.environment.name !== 'client') return

    const modules: EnvironmentModuleNode[] = []
    const normalizedFile = normalizePath(file)

    // Trigger update if a dependency (including transitive ones) changed.
    if (normalizedFile in depToLoaderModuleIdsMap) {
      for (const id of Array.from(
        depToLoaderModuleIdsMap[normalizedFile] || []
      )) {
        delete idToLoaderModulesMap[id]
        const mod = this.environment.moduleGraph.getModuleById(id)
        if (mod) modules.push(mod)
      }
    }

    // Also check if the file matches any custom watch patterns.
    for (const id in idToLoaderModulesMap) {
      const loader = idToLoaderModulesMap[id]
      if (
        loader?.watch?.length &&
        pm(loader.watch, loader.options.globOptions)(normalizedFile)
      ) {
        const mod = this.environment.moduleGraph.getModuleById(id)
        if (mod) modules.push(mod)
      }
    }

    return modules.length ? [...existingMods, ...modules] : undefined
  }
}
