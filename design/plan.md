# VitePress 全量重构为 ActView 计划（plan）

> 目标：整个项目由 Vue 框架重构为依赖 ActView 框架（`E:\code3\JSX-Demo` 的 `actview` / `@actview/core` / `@actview/jsx` / `@actview/router`），`docs` 同步重构。
>
> **范围裁剪（已确认）**：
> - ❌ 不要 SSR（服务端渲染 / hydration / 流式），**只保留静态生成**（构建期预渲染每页静态 HTML）
> - ❌ 多语言（i18n / locales / lunaria 翻译同步）不考虑，直接删除
>
> 状态标记：✅ 已完成 ｜ ⬜ 待办 ｜ 🔶 需要先做决策
>
> **进度总览（当前）**：
> - 阶段 A（ActView 能力补齐）✅
> - 阶段 B（客户端运行时）✅
> - 阶段 C（默认主题 92 个 .vue）✅
> - 阶段 D（构建管线 / 静态生成）✅
> - 阶段 E（docs 重构）🔶 进行中——前置（md 生成器重构）✅、using-vue→using-actview ✅、demo 组件 .tsx ✅、docs build ✅；多语言删除（E1/E2）⬜ 待决策、单语言 Vue 教学残留 ⬜
> - 阶段 F（依赖清理收尾）🔶 进行中——F1/F2 ✅、F3/F4 部分

---

## 1. 现状盘点（Vue 依赖面）

### 1.1 已完成（前序提交 `8cfd0c74`）
- ✅ `src/node/markdownToActView.ts`：markdown 编译管线改为输出 ActView 模块（HTML→VNode 序列化 + `defineComponent` 组件），`plugin.ts` 中 `.md` 的 transform 返回 `actViewSrc`，`@vitejs/plugin-vue` include 收窄为 `.vue`
- ✅ `design/magrite.md`：该改造的原理记录

### 1.2 剩余的 Vue 依赖面（重构前现状，截至前序提交 `8cfd0c74`；当前各区域状态见阶段 A-F 标注）

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

### 阶段 B：客户端运行时重构（`src/client/app/`）✅ 已完成

> 状态：✅ 已完成（B1-B6 全部落地）——`src/client/app/` 全 ActView 化：`index.ts`（`createApp(VitePressApp)`，删 SSR/devtools/provide）、`data.ts`（ref/computed 换 actview + 手写 useDark/usePreferredDark）、`router.ts`（响应式换 ActView，模块级单例 context）、`Content`/`ClientOnly` 组件、composables（copyCode/head/preFetch）手写替代 @vueuse；`ssr.ts` 重建为 ActView 静态生成入口。

- [x] **B1** `index.ts`：`createSSRApp`/`createApp` → ActView `createApp`；删除 SSR 分支（`import.meta.env.SSR` 相关）；`VitePressApp` 改为 `defineComponent` + JSX 或 `createElement`
- [x] **B2** `data.ts`：`useData()` 契约保留（site/theme/page/frontmatter 等 ref），内部实现换 ActView `ref`/`computed`；`initData` 的 `__VP_SITE_DATA__` 注入逻辑保留
- [x] **B3** `router.ts`：自定义 history 路由改为 `@actview/router` 的 `createRouter`，或保留自研路由仅换响应式基座（二选一，🔶 决策：**建议直接用 `@actview/router`**，减少维护面；`scrollTo`/`onAfterRouteChanged` 等适配到 router 的钩子）
- [x] **B4** composables：`copyCode`/`head`/`preFetch`/`codeGroups` 全部手写重写（去掉 `@vueuse/*`；head 管理用 `document.head` 操作替代 Vue 的 head 响应式）
- [x] **B5** `ssr.ts` 删除；`devtools.ts` 删除或替换为 no-op（注：B5 的 `ssr.ts` 后因 D 阶段静态生成需要而重建为 ActView 版）
- [x] **B6** `ClientOnly`/`Content` 组件：`Content` 渲染 md 页面的 `Content`（直接渲染 `actViewSrc` 导出的组件或 `createElement` 树）；`ClientOnly` 保留（挂载后渲染 children）

**验收**：`npm run dev` 打开站点，路由切换、页面渲染、复制代码按钮、代码组切换、标题/head 更新全部可用；控制台无 Vue 相关报错。

### 阶段 C：默认主题重构（`src/client/theme-default/`，92 个 `.vue`）

> **状态：✅ 已完成** —— 92 个 `.vue` 组件全部迁移为 `.tsx`（`find src/client/theme-default -name '*.vue'` 计数 0）
>
> 迁移模式已固化：`.vue` → `.tsx`；组件统一 **JSX 写法**（`jsx: react-jsx` + `jsxImportSource: @actview/jsx` + `actviewPlugin` Babel 转换，不用手写 `createElement`）；多 return/早退的组件用显式 `defineComponent` + JSX；
> `<style>`（scoped）移入 `styles/components/*.css` 全局化（VP 前缀类名）；`v-html` 改文本渲染（或 ref+onMounted 注入 SVG/脚本）；具名插槽经 props 透传；`inject` → `useNav()` 等模块 context；`defineAsyncComponent` → 条件渲染 + 静态 import。

- [x] **C1** 图标：19 个 `VPIcon*.vue` 全局零引用 → 直接删除（后续按需以 `.tsx` 创建）
- [x] **C5** composables（11 个）+ support：全部换 ActView 响应式（`useMediaQuery` 手写替代 vueuse；`watchPostEffect`→`watchEffect`；`shallowRef` 用 `shallowReactive` 模拟；`smartComputed` 闭包缓存）
- [x] 组件批次（已完成）：
  1. `VPBadge`/`VPButton`/`VPImage`/`VPSkipLink`（+ Layout 接入 VPSkipLink）
  2. `VPLink`/`VPSwitch`/`VPMenu`/`VPMenuGroup`/`VPMenuLink`
  3. `VPFlyout`
  4. `VPNavBar` 树核心：`VPNavBarTitle`/`VPNavBarMenu`/`VPNavBarMenuLink`/`VPNavBarMenuGroup`/`VPNavBarHamburger`（`useWindowScroll` 手写）
- [x] 组件批次（已完成，每个功能点一个 commit）：
  1. `VPNavBarAppearance`/`VPNavScreen*`（8 个，菜单/翻译/外观/社交）+ `VPNavBar` 子组件（Search/SearchButton/Translations/SocialLinks/Extra/AskAiButton）+ `VPSocialLink(s)`
  2. 赞助/广告：`VPSponsors`/`VPSponsorsGrid`/`VPDocAsideSponsors`/`VPDocAsideCarbonAds`/`VPCarbonAds`
  3. 团队：`VPTeamPage`/`VPTeamPageTitle`/`VPTeamPageSection`/`VPTeamMembers`/`VPTeamMembersItem`
  4. 搜索：`VPAlgoliaSearchBox`（docsearch/sidepanel 完整集成，lazy import）+ `VPLocalSearchBox`（**最小可用版**：minisearch 索引 + 防抖搜索 + 键盘导航 + 手写高亮；去掉 worker/focus-trap/详细视图，见文件头注释）
- [x] **C4** 主题 API：`Layout.tsx` 已为完整版（接入 `VPNav`/`VPSidebar`/`VPContent` 全树）；`without-fonts.ts` 导出全部切为命名导出 `.tsx`；`types/` 下无 `vue` 类型引用

**验收（已通过）**：`.vue` 计数 **0**；`tsc -p src/client` 通过；134 单测全绿（含 `actview-shell` 冒烟：happy-dom 中 `Layout → Content → md 页面组件` 真实渲染）。

### 阶段 D：构建管线（`src/node/build/`，去掉 SSR 只留静态生成）✅ 已完成

> 核心思路：**保留「server bundle」的概念但内容换成 ActView 静态生成入口**——它不再是 Vue SSR bundle，
> 而是 node 构建期渲染入口：`src/client/app/ssr.ts` 用 `renderToString(createElement(VitePressApp))`
> 在构建进程内直接渲染整棵主题树 → HTML 字符串；页面 chunk 继续导出 `__pageData` 供 head 组装。
> `teleports`/`vpSocialIcons` 返回空集对齐 `SSGContext` 契约。

- [x] **D1** `bundle.ts`：client + server 双 bundle 保留但含义改变（server = 静态生成入口）；删 `@vue/(runtime|shared|reactivity)`/`plugin-vue:export-helper` manualChunks、`@vueuse`/`vue` excludedModules、`clientJSMap` 管线
- [x] **D2** `ssr.ts` 重建为 ActView 版（`renderToString(VitePressApp)`，纯函数无 DOM）；`render.ts` 不再 import Vue SSR
- [x] **D3** `render.ts` 的 `isBooleanAttr`（@vue/shared）→ 自研 `BOOLEAN_ATTRS` 集合
- [x] **D4** `buildMPAClient.ts` 删除；`mpa` 从 config/siteConfig/render/build 全链路移除
- [x] **D5** `plugin.ts` 删 `vuePlugin`/`optimizeDeps` vue 条目/`__VUE_PROD_HYDRATION_MISMATCH_DETAILS__`；`siteConfig.vue` 选项删除；`localSearchPlugin` optimizeDeps 收窄
- [x] **D6** `alias.ts` 删 vue runtime alias；`linkVue()`（vue symlink）删除；package.json 移除 `vue`/`@vitejs/plugin-vue`/`@vue/shared`/`@vueuse/core`/`@vueuse/integrations`/`@vue/devtools-api`/`mark.js`/`vue-tsc`
- [x] **D7** 决策落地：**完整静态 HTML + 客户端全量挂载**（ActView `createApp().mount()` 原生行为）
- [x] **C4 补全（D 阶段顺带）**：`Layout.tsx` 从 B 阶段最小主干升级为完整树（VPNav/VPLocalNav/VPSidebar/VPContent）；3 个组件的浏览器访问加 `inBrowser` 守卫；13 个 CSS 清理 `:deep`/`:slotted`（lightningcss 警告消除）

**验收（已通过）**：`node bin/vitepress.js build`（最小站点）产出每页 `.html` 含预渲染完整主题树（VPNavBar/VPSidebar/VPContent/Outline）+ 资源哈希；实体转义/标题/锚点正确；无 SSR 残留。

**遗留（JSX-Demo 侧）**：`renderToString` 期间组件 setup 内调用生命周期钩子会打印 `[actview] 生命周期钩子只能在组件 setup 中调用`（功能不受影响）——**已定位并记录到 `design/bug.md`（BUG-001）**，待 JSX-Demo 的 `renderToString` 在调用 `__setup` 时设置 currentInstance 上下文。

### 阶段 E：docs 重构 🔶 进行中

> 前置（已完成）：**md 生成器重构（use ActView in markdown）** —— `markdownToActView` 生成 `.tsx` 模块（正文 JSX、`<script lang="tsx">` 具名组件引用 + 属性透传、`<script lang="ts" setup>` 进 setup 体）；plugin.ts 管线（`transformWithEsbuild` 转 JSX + `@actview/plugin` Babel 包裸函数组件）；build 页面渲染串行化（模块级单例竞争串页修复）。

- [ ] **E1** 多语言删除：删除 `docs/en|es|fa|ja|ko|pt|ru|zh` 中除选定语言外的目录（🔶 决策：保留哪种语言——建议保留 `zh` 或 `en`）；删除 `lunaria.config.json`；删除 `docs/config.ts` 中 `locales` 配置与 `@vueuse/integrations` 等翻译相关引用
- [ ] **E2** 迁移单语言目录为根：选定语言的 `index.md` 提升为 `docs/index.md`，站内链接/导航重排
- [ ] **E3** md 内容清理 🔶 部分完成：
  - ✅ `using-vue.md` → `using-actview.md`（en 完整重写：双 script 块 + JSX + 组件引用 + 不支持语法清单；7 语言重命名 + 链接更新）
  - ✅ `docs/components/` Vue 组件演示（ModalDemo/ComponentInHeader）→ `.tsx` + 全局 css
  - ✅ md 生成器重构（见上）——docs 完整 `build` 通过（16.6s，含多语言全部页面）
  - ⬜ 单语言目录内 Vue 教学残留（`data-loading.md`/`extending-default-theme.md`/`i18n.md`/`markdown.md`/`ssr-compat.md` 等仍含 `from 'vue'`/`v-for`/`<Transition>` 示例）
  - ⬜ 多语言 `using-actview.md` 内容仍是 Vue 版（仅链接/导入适配，正文未重写）
- [ ] **E4** docs 自身配置（`docs/config.ts`、`docs/package.json`）适配 ✅ 部分：`docs/package.json` 已无 vue 依赖；`docs/config.ts` 的 search（algolia）依赖 `@docsearch/js` 正常；`locales` 配置未删（随 E1）

**验收**：`docs` 单独可 `dev`/`build`；站点内容为单一语言；无 `locales`/`lunaria` 残留。

### 阶段 F：依赖清理与收尾 🔶 进行中

- [x] **F1** 根 `package.json`：移除 `vue`、`@vitejs/plugin-vue`、`@vue/shared`、`@vueuse/core`、`@vueuse/integrations`、`@vue/devtools-api`（已在 D6 完成）；已加入 `actview`、`@actview/core`、`@actview/jsx`、`@actview/plugin`、`@actview/router`（npm 安装）
- [x] **F2** 测试改造：unit 测试全 ActView 化（`pnpm test:unit` 148 全绿，16 文件，含 actview-shell happy-dom 冒烟、md 生成器/序列化器测试）；e2e 未跑（`test:e2e` 依赖 playwright/临时站点，未纳入本轮）
- [ ] **F3** 全量验证清单 🔶 部分：`pnpm test:unit` ✅、`vitepress build docs` ✅（16.6s 全部页面）、`pnpm preview` 未跑；`grep -rn "from 'vue'\|@vue" src` 已清零（仅注释）✅；**`docs/**/*.md` 的 Vue 教学残留未清零**（见 E3）
- [ ] **F4** 更新 `design/magrite.md` 或新建迁移记录，沉淀 `.vue`→`.tsx` 的映射规则（供后续组件迁移复用）🔶 部分：`design/magrite.md` 已有改造原理；`.vue`→`.tsx` 映射规则清单可补充（style/scoped、具名插槽、v-html、setup 早退等模式）

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
