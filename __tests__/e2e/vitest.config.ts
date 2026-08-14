import { defineConfig } from 'vitest/config'

const timeout = 60_000

export default defineConfig({
  test: {
    setupFiles: ['vitestSetup.ts'],
    globalSetup: ['vitestGlobalSetup.ts'],
    testTimeout: timeout,
    hookTimeout: timeout,
    teardownTimeout: timeout,
    globals: true,
    // 所有测试文件共享同一个 page（vitestSetup 的全局 page + 同一 dev server）：
    // 并发执行时 data-loading 的 HMR full reload 会打断其它文件的页面操作
    // （如 local-search 的 input detached）。顺序执行避免互相干扰。
    fileParallelism: false
  }
})
