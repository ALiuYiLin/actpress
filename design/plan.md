# VitePress 全量重构为 ActView 计划（plan）

> 目标：整个项目由 Vue 框架重构为依赖 ActView 框架（`E:\code3\JSX-Demo` 的 `actview` / `@actview/core` / `@actview/jsx` / `@actview/router`），`docs` 同步重构。
>
> **范围裁剪（已确认）**：
> - ❌ 不要 SSR（服务端渲染 / hydration / 流式），**只保留静态生成**（构建期预渲染每页静态 HTML）
> - ❌ 多语言（i18n / locales / lunaria 翻译同步）不考虑，直接删除
>
> 状态标记：✅ 已完成 ｜ ⬜ 待办 ｜ 🔶 需要先做决策

---

## 1. 现状盘点（Vue 依赖面）

### 1.1 已完成（前序提交 `8cfd0c74`）
- ✅ `src/node/markdownToActView.ts`：markdown 编译管线改为输出 ActView 模块（HTML→VNode 序列化 + `defineComponent` 组件），`plugin.ts` 中 `.md` 的 transform 返回 `actViewSrc`，`@vitejs/plugin-vue` include 收窄为 `.vue`
- ✅ `design/magrite.md`：该改造的原理记录

### 1.2 剩余的 Vue 依赖面（本次计划的主体）

| 区域 | 现状 | 规模 |
|---|---|---|
| 客户端运行时 `src/client/app/` | `createSSRApp`/`createApp`/`h`/`defineComponent`（`index.ts`）、`ssr.ts`、`data.ts`、`router.ts`、composables（copyCode/head/preFetch/codeGroups）、`ClientOnly`/`Content` 组件 | 约 13 个文件 |
| 默认主题 `src/client/theme-default/` | `Layout.vue`、`NotFound.vue` + `components/` 92 个 `.vue`（含 19 个 `VPIcon*.vue` 图标）+ `composables/` + `support/`（docsearch/carbon/sidebar 等） | 92 个 `.vue` |
| 构建 `src/node/build/` | `bundle.ts`（client + **SSR 双构建**，SSR bundle 输出到 tempDir 用于渲染 HTML）、`render.ts`（`renderPage` 组装静态 HTML，依赖 `@vue/shared` 的 `isBooleanAttr`）、`buildMPAClient.ts`（MPA 模式）、`build.ts` | 5 个文件 |
| 依赖 | `vue`、`@vitejs/plugin-vue`、`@vue/shared`、`@vueuse/core`、`@vueuse/integrations`、`@vue/devtools-api` | 6 个包 |
| `docs/` | 8 个语言目录（en/es/fa/ja/ko/pt/ru/zh）+ `lunaria.config.json` + `components/`（Vue 组件示例）+ `snippets/` | 282 个 md |

### 1.3 客户端使用的 Vue API 清单（重构映射依据）

高频：`computed`(34)、`ref`、`watch`、`inject/provide`、`onMounted/onUnmounted`、`nextTick`、`defineAsyncComponent`、`h`、`defineComponent`
低频：`resolveDynamicComponent`、`useTemplateRef`、`useSSRContext`、`useSlots`、`watchPostEffect`、`watchEffect`、`markRaw`、`reactive`、`readonly`、`shallowRef`、`Transition/TransitionGroup`、`Teleport`

### 1.4 ActView 能力边界（`E:\code3\JSX-Demo`）

已有：`createApp`、`defineComponent`、`reactive/ref/computed/watch/toRefs/readonly/markRaw`、`onMounted/onUpdated/onBeforeUnmount`、`KeepAlive`、`ErrorBoundary`、`Suspense`、`lazy`、`nextTick`；router（`RouterLink`/`RouterView`/`createRouter`/`createWebHistory`）；`createElement`/`Fragment`（`@actview/jsx`）

**缺失（需要补齐或删除）**：

| 能力 | ActView 现状 | 处置建议 |
|---|---|---|
| 构建期 HTML 渲染（SSG 必需） | 无 | 🔶 **新增** `renderToString(vnode)`（node 侧 VNode→HTML 字符串，类似 `ReactDOMServer`；仅构建期使用，不是 SSR 服务器） |
| `Transition`/`TransitionGroup` | 无 | 🔶 删除动画逻辑，或用纯 CSS 动画 + 挂载钩子替代 |
| `Teleport` | 无 | 🔶 删除，或降级为原位渲染 |
| `provide/inject` | 无 | 用 props 透传 / 模块级 context 替代 |
| `watchEffect`/`watchPostEffect` | 无（有 `watch`） | `watch` 覆盖大部分场景；少数用 `watch` 替代 |
| `onUnmounted` | 导出里无（内部有 `beforeUnmount`） | 在 ActView 侧补导出，或迁移为 `onBeforeUnmount` |
| `useSlots` | 有 slots prop（Babel 插件转换具名插槽） | 直接用 props.slots |
| `defineAsyncComponent` | 有 `lazy` | 直接映射 |
| `resolveDynamicComponent` | 有 `<component is>` | 直接映射 |
| `@vueuse/*` | 无 | 手写替代（copyCode/scroll/eventListener 等都很短） |

---

## 2. 阶段计划

### 阶段 A：ActView 能力补齐（在 JSX-Demo 侧完成，前置）

> **状态：✅ 已完成并通过跨项目验收**（JSX-Demo `master`，`actview@1.0.10`）
> 对应提交：`bbfa5b3`（renderToString）、`b879de9`（Teleport/Transition）、`5564037`（onUnmounted/watchEffect）、`3f174d1`（发布 1.0.10）

- [x] **A1** 决策与实现：`Teleport` **完整实现**（`to` 选择器/元素/内联、目标切换迁移 DOM、卸载清理）；`Transition` **最小可用**（进入/离开过渡类 + `transitionend`/显式 `duration` 兜底；无 `mode`/多子节点高级语义）——`packages/core/src/runtime/transition.ts`
- [x] **A2** 新增 `renderToString(vnode)`：VNode → HTML 字符串，纯函数无 DOM 依赖，可在 Node 端构建期使用——`packages/core/src/runtime/renderToString.ts`。覆盖：字符串标签/Fragment/文本/数字/组件（`__setup(props)()` 递归，兼容函数形态）/`on*` 事件跳过/void 元素/布尔属性（`BOOLEAN_ATTRS`）/`className`→`class`/`style` 对象与字符串/HTML 转义
- [x] **A3** 补齐导出：`onUnmounted`、`watchEffect` 已加入 `actview` 入口；`Suspense`/`lazy` 构建期行为已确认：**`lazy` 组件在构建期渲染 `null` 占位**（loader 异步未完成，静态 HTML 中异步组件为空）——静态站点中如页面含 `lazy` 组件需知悉此限制
- [x] **A4** `watchEffect` 别名已提供

**验收（已通过）**：`scripts/acceptance-renderToString.test.tsx` + `scripts/fixtures/actview-page.js`（fixture 由 vitepress 真实 markdown 编译管线生成，含 `<script setup>`、`&amp;`/`&lt;` 实体、`&#8203;` 零宽空格、`on*` 属性过滤）：
- `renderToString` 输出与 happy-dom 中 `createApp().mount()` 挂载的 `innerHTML` **逐字符一致**
- `__pageData` 契约、实体二次转义（`&`→`&amp;`）、`<tag>` 文本转义、`onclick` 不输出、void 元素不闭合等断言全部通过
- JSX-Demo 全量测试 105 例全绿（原 102 + 验收 3）

### 阶段 B：客户端运行时重构（`src/client/app/`）

- [ ] **B1** `index.ts`：`createSSRApp`/`createApp` → ActView `createApp`；删除 SSR 分支（`import.meta.env.SSR` 相关）；`VitePressApp` 改为 `defineComponent` + JSX 或 `createElement`
- [ ] **B2** `data.ts`：`useData()` 契约保留（site/theme/page/frontmatter 等 ref），内部实现换 ActView `ref`/`computed`；`initData` 的 `__VP_SITE_DATA__` 注入逻辑保留
- [ ] **B3** `router.ts`：自定义 history 路由改为 `@actview/router` 的 `createRouter`，或保留自研路由仅换响应式基座（二选一，🔶 决策：**建议直接用 `@actview/router`**，减少维护面；`scrollTo`/`onAfterRouteChanged` 等适配到 router 的钩子）
- [ ] **B4** composables：`copyCode`/`head`/`preFetch`/`codeGroups` 全部手写重写（去掉 `@vueuse/*`；head 管理用 `document.head` 操作替代 Vue 的 head 响应式）
- [ ] **B5** `ssr.ts` 删除；`devtools.ts` 删除或替换为 no-op
- [ ] **B6** `ClientOnly`/`Content` 组件：`Content` 渲染 md 页面的 `Content`（直接渲染 `actViewSrc` 导出的组件或 `createElement` 树）；`ClientOnly` 保留（挂载后渲染 children）

**验收**：`npm run dev` 打开站点，路由切换、页面渲染、复制代码按钮、代码组切换、标题/head 更新全部可用；控制台无 Vue 相关报错。

### 阶段 C：默认主题重构（`src/client/theme-default/`，92 个 `.vue`）

- [ ] **C1** 图标：19 个 `VPIcon*.vue` → 单个 `icons.tsx`（SVG path 数据 + 一个图标组件），或保留为数据文件
- [ ] **C2** 组件迁移清单（按依赖层级分批）：
  - 基础：`VPBadge`/`VPButton`/`VPBackdrop`/`VPContent`/`VPImage` 等无状态组件
  - 布局：`Layout.vue`/`NotFound.vue` → `Layout.tsx`（含 `VPLocalNav`/`VPSidebar`/`VPNav`/`VPDoc` 等）
  - 交互组件：`VPDocAsideOutline`（目录滚动高亮）、`VPSidebar`（折叠）、`VPNav`（移动端菜单）、`VPBackdrop` 等
  - 搜索/广告：`VPAlgoliaSearchBox`（docsearch 是独立包，保留）、`VPCarbonAds`
- [ ] **C3** 迁移规则：
  - 每个 `.vue` → `.tsx`：`<script setup>` 的 ref/computed 移到 `defineComponent(function(){ ... return () => JSX })`；模板翻译为 JSX（`v-if`→`{cond && ...}`、`v-for`→`{list.map(...)}`、`@click`→`onclick`、`:class`→`class` 对象、`v-model`→受控 `value`+`oninput`/`onchange`）
  - `<style>` 保留为同目录同名 CSS（或统一收进 `styles/`），框架无关
  - 插槽：具名插槽用 `slots` prop（ActView Babel 插件的 `slot="x"` 语法）；默认插槽用 `props.children`
- [ ] **C4** 主题 API：`Theme` 对象（`Layout`/`NotFound`/`enhanceApp`）保持导出结构；`enhanceApp` 的 ctx 换 ActView 形态
- [ ] **C5** `composables/`（useData、useSidebar、useLocalNav、useScroll…）全部迁移

**验收**：主题 92 个 `.vue` 清零；`build` 后静态 HTML 与 Vue 版结构基本一致；暗色模式、移动端、目录高亮等功能正常。

### 阶段 D：构建管线（`src/node/build/`，去掉 SSR 只留静态生成）

- [ ] **D1** `bundle.ts`：删除 SSR 构建分支（`ssr` 参数、tempDir 的 ssr bundle、`@vue/*` external 规则），改为**单构建**（client bundle）
- [ ] **D2** `render.ts`：`renderPage` 不再 import SSR bundle 渲染，改为**构建期直接用 ActView `renderToString`** 渲染每页（`createElement` 树在构建进程内直接执行 → HTML 字符串），再组装进页面模板；`teleports` 逻辑删除
- [ ] **D3** `@vue/shared` 的 `isBooleanAttr` 等工具用自研替代（属性转义/布尔属性判断写进 `renderToString` 或复用 markdownToActView 的工具）
- [ ] **D4** `buildMPAClient.ts`：🔶 决策：MPA 模式与 SSR 强相关，建议**一并删除**（静态生成 + SPA 模式已覆盖）
- [ ] **D5** `plugin.ts` 清理：删除 `vuePlugin`（`.vue` 页面支持随之移除，🔶 确认不再需要 `.vue` 页面）；`optimizeDeps.include` 的 `vue`/`vueuse` 条目删除；`define` 里的 `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` 删除
- [ ] **D6** `cli.ts`/`config.ts` 中 `vue` 相关选项（`siteConfig.vue`）清理
- [ ] **D7** 静态 HTML 与客户端挂载策略：🔶 决策——构建产物是「完整静态 HTML + 客户端 JS 全量挂载」（无 hydration，挂载时会重渲染 DOM）还是「静态 HTML + 客户端跳过已有 DOM 的挂载」。**建议前者**（ActView `createApp().mount()` 原生行为，简单可靠；首屏内容由静态 HTML 保证，交互由 JS 接管）

**验收**：`pnpm build` 产出静态站点（每页 `.html` 含预渲染内容 + 资源哈希）；`pnpm preview` 正常；无 SSR 相关文件/依赖残留。

### 阶段 E：docs 重构

- [ ] **E1** 多语言删除：删除 `docs/en|es|fa|ja|ko|pt|ru|zh` 中除选定语言外的目录（🔶 决策：保留哪种语言——建议保留 `zh` 或 `en`）；删除 `lunaria.config.json`；删除 `docs/config.ts` 中 `locales` 配置与 `@vueuse/integrations` 等翻译相关引用
- [ ] **E2** 迁移单语言目录为根：选定语言的 `index.md` 提升为 `docs/index.md`，站内链接/导航重排
- [ ] **E3** md 内容清理：
  - `<script setup>` 里的 `import ... from 'vue'` → `'actview'`（ref/computed 同名兼容）
  - 文档中 Vue 专属示例（SFC 代码块、`<Transition>`、`v-model` 等）改为 ActView JSX 示例
  - `docs/components/` 里的 Vue 组件演示改为 ActView 组件演示
- [ ] **E4** docs 自身配置（`docs/config.ts`、`docs/package.json`）适配：移除 `vue`/`plugin-vue` 依赖，接入 `@actview/*`

**验收**：`docs` 单独可 `dev`/`build`；站点内容为单一语言；无 `locales`/`lunaria` 残留。

### 阶段 F：依赖清理与收尾

- [ ] **F1** 根 `package.json`：移除 `vue`、`@vitejs/plugin-vue`、`@vue/shared`、`@vueuse/core`、`@vueuse/integrations`、`@vue/devtools-api`；加入 `actview`、`@actview/core`、`@actview/jsx`、`@actview/router`（如走 workspace/别名则配 `resolve.alias`）
- [ ] **F2** 测试改造：
  - `__tests__/unit/client/*`：Vue 测试（`@vue/test-utils` 若用到）改 ActView 渲染 + `happy-dom`（JSX-Demo 已有此模式）
  - e2e 测试的断言若依赖 Vue 特有 DOM 结构（如 `data-v-*`）则更新
- [ ] **F3** 全量验证清单：`pnpm test:unit`、`pnpm build`（静态生成）、`pnpm preview`、docs 构建；`grep -rn "from 'vue'\|@vue" src docs` 清零
- [ ] **F4** 更新 `design/magrite.md` 或新建迁移记录，沉淀 `.vue`→`.tsx` 的映射规则（供后续组件迁移复用）

**验收**：仓库无任何 Vue 依赖与引用；dev/build/preview 全链路可用。

---

## 3. 关键风险与前置决策汇总

| # | 决策 | 影响 | 建议 |
|---|---|---|---|
| D1 | 静态 HTML 的客户端挂载策略（全量挂载 vs 跳过已有 DOM） | 首屏体验、实现成本 | 全量挂载（ActView 原生行为） |
| A1 | Transition/Teleport 处置 | 主题动画/浮层实现 | CSS 类替代，删除框架级 |
| B3 | 路由用 `@actview/router` 还是保留自研 | 维护面 | 直接用 `@actview/router` |
| D4 | MPA 模式是否删除 | 构建代码量 | 删除（与 SSR 强相关） |
| D5 | `.vue` 页面支持是否保留 | plugin.ts 复杂度 | 删除（全量 ActView） |
| E1 | docs 保留哪种语言 | docs 内容量 | 建议 `zh` 或 `en` |

## 4. 执行顺序建议

```
阶段 A（ActView 侧补齐，含 renderToString）
   ↓
阶段 B（client 运行时）→ 阶段 C（主题）可并行推进，但 C 依赖 B 的 data/router 契约
   ↓
阶段 D（构建管线，静态生成）依赖 A2（renderToString）
   ↓
阶段 E（docs）依赖 B/C/D 稳定
   ↓
阶段 F（依赖清理 + 测试 + 收尾）
```

最大工作量在 **阶段 C（92 个 .vue 迁移）** 与 **阶段 A2（renderToString，是静态生成的硬前置）**。
