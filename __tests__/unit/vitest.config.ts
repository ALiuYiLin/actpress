import vue from '@vitejs/plugin-vue'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const dir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@siteData', replacement: resolve(dir, './shims.ts') },
      { find: 'client', replacement: resolve(dir, '../../src/client') },
      { find: 'node', replacement: resolve(dir, '../../src/node') },
      { find: 'shared', replacement: resolve(dir, '../../src/shared') },
      {
        find: 'actview',
        replacement: resolve(
          dir,
          'E:/code3/JSX-Demo/packages/actview/src/index.ts'
        )
      },
      {
        find: '@actview/core',
        replacement: resolve(
          dir,
          'E:/code3/JSX-Demo/packages/core/src/index.ts'
        )
      },
      {
        find: '@actview/jsx',
        replacement: resolve(dir, 'E:/code3/JSX-Demo/packages/jsx/src/index.ts')
      },
      {
        find: '@actview/router',
        replacement: resolve(
          dir,
          'E:/code3/JSX-Demo/packages/router/src/index.ts'
        )
      },
      {
        find: /^vitepress$/,
        replacement: resolve(dir, '../../src/client/index.js')
      },
      {
        find: /^vitepress\/theme$/,
        replacement: resolve(dir, '../../src/client/theme-default/index.js')
      }
    ]
  },
  test: {
    globals: true
  }
})
