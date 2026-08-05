import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Alias, AliasOptions } from 'vite'

const require = createRequire(import.meta.url)
const PKG_ROOT = resolve(fileURLToPath(import.meta.url), '../..')

export const DIST_CLIENT_PATH = resolve(PKG_ROOT, 'client')
export const APP_PATH = join(DIST_CLIENT_PATH, 'app')
export const SHARED_PATH = join(DIST_CLIENT_PATH, 'shared')
export const DEFAULT_THEME_PATH = join(DIST_CLIENT_PATH, 'theme-default')

// special virtual file. we can't directly import '/@siteData' because
// - it's not an actual file so we can't use tsconfig paths to redirect it
// - TS doesn't allow shimming a module that starts with '/'
export const SITE_DATA_ID = '@siteData'
export const SITE_DATA_REQUEST_PATH = '/' + SITE_DATA_ID

const vueRuntimePath = 'vue/dist/vue.runtime.esm-bundler.js'

export function resolveAliases(root: string, ssr: boolean): AliasOptions {
  const aliases: Alias[] = [
    {
      find: /^vitepress$/,
      replacement: join(DIST_CLIENT_PATH, '/index.js')
    },
    {
      find: /^vitepress\/theme$/,
      replacement: join(DIST_CLIENT_PATH, '/theme-default/index.js')
    }
  ]

  // actview workspace packages (JSX-Demo: E:\code3\JSX-Demo)
  // md pages are compiled into ActView modules (see markdownToActView.ts),
  // so both client and node(ssr) builds need these resolvable.
  const ACTVIEW_PKG_ROOT = 'E:/code3/JSX-Demo/packages'
  aliases.push(
    {
      find: /^actview$/,
      replacement: join(ACTVIEW_PKG_ROOT, 'actview/src/index.ts')
    },
    {
      find: /^@actview\/core$/,
      replacement: join(ACTVIEW_PKG_ROOT, 'core/src/index.ts')
    },
    {
      find: /^@actview\/jsx$/,
      replacement: join(ACTVIEW_PKG_ROOT, 'jsx/src/index.ts')
    },
    {
      find: /^@actview\/router$/,
      replacement: join(ACTVIEW_PKG_ROOT, 'router/src/index.ts')
    }
  )

  if (!ssr) {
    // Prioritize vue installed in project root and fallback to
    // vue that comes with vitepress itself.
    // Only do this when not running SSR build, since `vue` needs to be
    // externalized during SSR
    let vuePath
    try {
      vuePath = require.resolve(vueRuntimePath, { paths: [root] })
    } catch (e) {
      vuePath = require.resolve(vueRuntimePath)
    }
    aliases.push({
      find: /^vue$/,
      replacement: vuePath
    })
  }

  return aliases
}
