import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Alias, AliasOptions } from 'vite'

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

export function resolveAliases(root: string, ssr: boolean): AliasOptions {
  const aliases: Alias[] = [
    {
      find: /^@actview\/press$/,
      replacement: join(DIST_CLIENT_PATH, '/index.js')
    },
    {
      find: /^@actview\/press\/theme$/,
      replacement: join(DIST_CLIENT_PATH, '/theme-default/index.js')
    }
  ]

  return aliases
}
