import { actviewPlugin } from '@actview/plugin'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [actviewPlugin()],
  define: {
    __ALGOLIA__: false,
    __VP_LOCAL_SEARCH__: false,
    __CARBON__: false,
    __ASSETS_DIR__: JSON.stringify('assets')
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@actview/jsx'
  },
  resolve: {
    alias: [
      { find: '@siteData', replacement: resolve(dir, './shims.ts') },
      {
        find: '@localSearchIndex',
        replacement: resolve(dir, './shims-local-search.ts')
      },
      { find: 'client', replacement: resolve(dir, '../../src/client') },
      { find: 'node', replacement: resolve(dir, '../../src/node') },
      { find: 'shared', replacement: resolve(dir, '../../src/shared') },
      {
        find: /^actpress$/,
        replacement: resolve(dir, '../../src/client/index.js')
      },
      {
        find: /^actpress\/theme$/,
        replacement: resolve(dir, '../../src/client/theme-default/index.js')
      }
    ]
  },
  test: {
    globals: true
  }
})
