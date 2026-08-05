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

## 4. C 阶段：默认主题迁移（`src/client/theme-default/`）

**已完成**：

- **composables（11 个）全部 ActView 化**：`computed/ref/watch/watchEffect/readonly/onMounted/onBeforeUnmount/onUpdated` 来自 `actview`；`useMediaQuery` 手写；`watchPostEffect`→`watchEffect`；`shallowRef` 用 `shallowReactive({value})` 模拟；`smartComputed` 闭包缓存
- **support**：`reactivity.ts`（含共享 `shallowRef`/`smartComputed`）
- **组件迁移为 `.tsx`（20 个）**：
  - 函数组件 + JSX（TogglePage 风格，经 `@actview/plugin` Babel 转换）：`VPBadge/VPButton/VPLink/VPSwitch/VPSkipLink/VPMenu/VPMenuGroup/VPMenuLink/VPFlyout/VPNavBarTitle/VPNavBarMenuLink/VPNavBarMenuGroup/VPSwitchAppearance/VPNavBarHamburger`
  - 显式 `defineComponent` + JSX（有早退 return，Babel 转换不支持）：`VPImage/VPNavBar/VPNavBarMenu/VPNavBarAppearance/VPNavScreen/VPNav/Layout`
  - `<style>`（scoped）→ `styles/components/*.css` 全局化：`vp-badge/button/image/skip-link/menu/switch/flyout/nav/nav-appearance/nav-screen.css`
- **删除**：19 个 `VPIcon*.vue`（全局零引用）、`Layout.vue`（→`Layout.tsx`）
- **待迁移（52 个 .vue）**：`VPNavScreenMenu*`、`VPSidebar*`、`VPDoc*`、`VPHome*`、`VPFooter/VPBackdrop/VPSocialLink(s)/VPSponsors/VPTeam*/VPCarbonAds/VPAlgoliaSearchBox/VPLocalSearchBox/NotFound` 等（见 `design/plan.md` 阶段 C 剩余批次）

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

## 7. 测试现状

- `npx vitest run -r __tests__/unit`：**14 个文件 134 用例全绿**
  - `node/markdownToActView.test.ts`（含端到端：生成模块 → 最小 ActView stub 执行 → VNode 断言）
  - `node/markdownToActView.serializer.test.ts`（28 例：序列化/实体/源码生成）
  - `client/actview-shell.test.ts`（happy-dom：`Layout → Content → md 页面` 真实渲染 + JSX 组件渲染）
- `npx tsc -p src/client`、`npx tsc -p src/node`：通过
