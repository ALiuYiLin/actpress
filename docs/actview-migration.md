# VitePress × ActView 迁移修改记录（发布参考）

> 本文件记录 `C:\code\vitepress`（VitePress 2.0.0-alpha.17 改造版）相对上游的**全部改动**，
> 供发布时核对依赖、特性与已知事项。
> 另见 `design/plan.md`（迁移计划与阶段状态）、`design/magrite.md`（markdown 编译管线改造原理）。

---

## 1. 依赖变更（package.json）

**新增（运行时/开发）**：

| 包 | 版本 | 用途 |
|---|---|---|
| `actview` | ^1.0.10 | ActView 框架入口（npm） |
| `@actview/core` | ^1.0.10 | 运行时核心（**待发布 1.0.11，见 §6**） |
| `@actview/jsx` | ^1.0.11 | JSX 运行时（jsx/jsxs/jsxDEV、Fragment、类型） |
| `@actview/router` | ^1.0.10 | 路由（当前未用，预留给 B3 备选） |
| `@actview/plugin` | ^1.0.4 | vite 插件：函数组件 → defineComponent（Babel，仅 .tsx） |
| `@babel/core` | ^8 | @actview/plugin 的依赖 |
| `happy-dom` | ^20 | 客户端单测 DOM 环境（per-file） |

**移除/停用**：`@vueuse/core`、`@vueuse/integrations`（运行时不再使用，依赖清理留 F 阶段）。

**依赖接入方式**：全部从 npm 安装（不再使用本地 junction/alias）；`.gitignore` 不再包含 actview 相关条目。

---

## 2. 编译管线：markdownToVue → markdownToActView

- 新增 `src/node/markdownToActView.ts`，删除 `src/node/markdownToVue.ts`：
  - markdown 渲染 HTML → **node 侧序列化为 `createElement` 调用链**（VNode 树），产物为**纯 JS 模块**（无 JSX 语法，esbuild 直接可编译）
  - `<script setup>`：import/re-export 提升顶层、`export const` 降级、`export default`/本地 `export {}` 注释、`await`/`import.meta` 提示
  - `<style>` 运行时注入（SSR 不注入）；custom block 注明不输出；`<script client>` 以注释保留
  - 实体单遍解码（`&#8203;`→U+200B 等）、`on*` 静态属性过滤
- `src/node/plugin.ts`：`.md` transform 返回 `actViewSrc`；`@vitejs/plugin-vue` include 收窄为 `\.vue$`（.vue 页面支持保留到 C 阶段结束）
- `src/node/build/render.ts`、`bundle.ts`：**仍为 Vue SSR 渲染（SSR 未删，静态生成改造属 D 阶段）**
- 详细原理见 `design/magrite.md`

---

## 3. B 阶段：客户端运行时 ActView 化（`src/client/app/`）

- `data.ts`：`ref/computed/watch/readonly` 全部来自 `actview`；`useDark`/`usePreferredDark` 手写（替代 `@vueuse/core`）；`provide/inject` → **模块级单例 context**（`initData`/`useData`）
- `router.ts`：`reactive/markRaw/nextTick/readonly` 来自 `actview`；`useRouter()` 读模块级 `currentRouter`；本地 `Component` 类型
- `composables/`（app 层）：`head/copyCode/preFetch/codeGroups/utils` 去 vue/vueuse；`onContentUpdated` 用 `onBeforeUnmount`（替代 `tryOnUnmounted`）；`defineClientComponent` 基于 `lazy`
- `index.ts`：`createApp` 为 ActView；`VitePressApp` 是 `defineComponent`，`createElement` 渲染 `Theme.Layout`；**SSR 分支、`provide`、globalProperties、devtools 全部移除**
- `components/ClientOnly.ts`、`Content.ts`：ActView 组件（`Content` 直接 `createElement(route.component)` 渲染 md 页面）
- 删除：`app/ssr.ts`、`app/devtools.ts`
- **类型**：`types/shared.d.ts` 新增本地 `Ref`/`UseDarkOptions`，`SSGContext` 独立（不再 extends vue `SSRContext`）

---

## 4. C 阶段：默认主题迁移（`src/client/theme-default/`）✅ 已完成

- **composables（11 个）+ support 全部 ActView 化**：响应式来自 `actview`；`useMediaQuery`/`useWindowScroll`/`useScrollLock`/`onKeyStroke` 手写；`shallowRef` 用 `shallowReactive({value})` 模拟；`smartComputed` 闭包缓存
- **92 个 `.vue` 组件全部迁移为 `.tsx`（计数 0）**：
  - 函数组件 + JSX（经 `@actview/plugin` Babel 转换）；有早退 return 的用显式 `defineComponent` + JSX
  - `<style>`（scoped）→ `styles/components/*.css` 全局化（VP 前缀类名）
  - `v-html` → 文本渲染 / ref+onMounted 注入（SVG、carbon 脚本）；`inject` → `useNav()` 等模块 context
  - 搜索：`VPAlgoliaSearchBox` 完整 docsearch/sidepanel 集成；`VPLocalSearchBox` 最小可用版（minisearch + 防抖 + 键盘导航 + 手写高亮，去 worker/focus-trap/详细视图）
- **删除**：19 个 `VPIcon*.vue`、`Layout.vue`、全部 `.vue` 主题组件
- **C4**：`Layout.tsx` 完整版（接入 `VPNav`/`VPSidebar`/`VPContent` 全树）；`without-fonts.ts` 全部命名导出 `.tsx`；`types/` 无 vue 类型引用

---

## 5. JSX 支持配置

- `tsconfig.json`（根）：`"jsx": "react-jsx"` + `"jsxImportSource": "@actview/jsx"`
- `src/node/plugin.ts` `config()`（async）：`actviewPlugin()` + `esbuild: { jsx: 'automatic', jsxImportSource: '@actview/jsx' }`
- `__tests__/unit/vitest.config.ts`：同样接入 `actviewPlugin` + esbuild jsx
- 新增 `src/client/jsx-extra.d.ts`：`JSX.IntrinsicAttributes`（`key` 通用属性）

---

## 6. 发布前注意事项

1. **需要发布 `@actview/core@1.0.11`**（npm 当前 1.0.10 缺两个类型修复，源码 master 已提交）：
   - `computed` 返回类型补 `__v_isRef`（`ComputedRef extends Ref`）
   - `watch` source 类型支持混合来源数组（`Array<Ref<any> | (() => any)>`）
   - 发布后移除 vitepress 侧 3 处过渡断言（`src/client/app/data.ts`、`theme-default/composables/sidebar.ts`、`layout.ts`，均标注 `TODO: @actview/core 1.0.11`），并可收紧本地 `Ref.__v_isRef` 为必填
2. **`@actview/plugin` 需支持 npm 安装**：vitepress `pnpm add @actview/plugin` 已可解析（发布版入口 `./index.js`）
3. **md 页面产物依赖**：`markdownToActView` 生成的模块 `import { defineComponent } from 'actview'` + `import { createElement } from '@actview/jsx'`——消费方（vitepress 自身）已通过 npm 依赖满足
4. **已知限制**（迁移中间态）：`vue-tsc` 报错仅来自未迁移 `.vue` 组件（预期）；`Layout.tsx` 为最小主干（导航/侧边栏视觉待 C 阶段剩余批次恢复）；SSR 构建链未改（D 阶段）
5. **JSX-Demo 侧未提交事项**：无（本次已提交全部工作区改动 + 验收测试）

---

## 6. rolldown-vite（vite 7）兼容要点

dev 白屏的两个根因与修复（commit `95c23094`）：

1. **md transform id 带 query**：rolldown-vite 的 transform 收到 `id` 带 `?t=` 时间戳，
   `id.endsWith('.md')` 永不匹配 → markdownToActView 不执行，md 原文被 import-analysis
   parse 报 `Failed to parse source for import analysis ... invalid JS syntax`。
   → 修复：`cleanUrl(id)` 后再判断扩展名。
2. **import-analysis 先于用户 normal 插件**：rolldown-vite 的内建 import-analysis
   （normal 级）在用户 normal 插件之前 parse 原始源码。→ 修复：`vitePressPlugin`
   设 `enforce: 'pre'`，md → JS 转换先行。

另外两个 rolldown-vite 行为：

- **JS 插件 transform/load 对 .tsx 不调用**：rolldown 用 rust（oxc）原生处理 JS/TS，
  函数组件（`function X(){ return <JSX/> }`）不会被 `@actview/plugin` 的 Babel 转换。
  → 修复（JSX-Demo `987f428`，待发布）：Babel 插件兼容 esbuild 已降级的
  `return _jsx/_jsxs(...)` 调用形态（`isJsxCall`），同样包裹 `defineComponent`。
  `@actview/plugin` 需发布新版（vitepress 侧已本地 patch 验证）。
- **`config()` 钩子返回的 plugins 不保证进 transform 管线**：`actviewPlugin` 已移至
  `createVitePressPlugin` 返回数组顶层（`actviewPlugin()` 放最前）。

## 7. 测试现状

- `npx vitest run -r __tests__/unit`：**14 个文件 134 用例全绿**
  - `node/markdownToActView.test.ts`（含端到端：生成模块 → 最小 ActView stub 执行 → VNode 断言）
  - `node/markdownToActView.serializer.test.ts`（28 例：序列化/实体/源码生成）
  - `client/actview-shell.test.ts`（happy-dom：`Layout → Content → md 页面` 真实渲染 + JSX 组件渲染）
- `npx tsc -p src/client`、`npx tsc -p src/node`：通过
