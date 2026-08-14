# ActPress（@actview/press）ActView 升级重构计划

> 适配：`actview 1.0.28` / `@actview/core 1.0.29` / `@actview/jsx 1.0.15` / `@actview/plugin-vite 1.0.17`
> 核心变化：**属性透传（attribute fallthrough）已从运行时移除**（ActView 方案3：组件契约对齐 React）。
> 影响面：`C:\code\vitepress`（actpress 工作区）源码 + 重建 dist；`E:\code3\actview-docs` 无需改代码（仅消费默认主题）。

---

## 一、版本事实（已通过 npm 发布产物比对核实）

| 包 | 当前 lockfile | package.json 声明 | 解析后版本 | 关键变化 |
|---|---|---|---|---|
| `actview` | 1.0.26 | `^1.0.27` | **1.0.28** | 依赖 core 1.0.29 / jsx 1.0.15 |
| `@actview/core` | 1.0.27 | `^1.0.28` | **1.0.29** | **移除透传 API**（见下） |
| `@actview/jsx` | 1.0.13 | `^1.0.14` | **1.0.15** | 完整 IntrinsicElements；`LibraryManagedAttributes = P & HTMLAttributes` |
| `@actview/plugin-vite` | 1.0.15 | `^1.0.16` | **1.0.17** | 依赖包更名（见下） |
| `@actview/router` | 1.0.12 | `^1.0.12` | 1.0.13 | 无破坏 |
| `@actview/plugin-scoped` | 1.0.1 | `^1.0.1` | 1.0.2 | 无破坏 |

**核实结论：**

1. `@actview/core` 1.0.27 / 1.0.28 的 dist 中含有 `useAttrs` / `splitProps` / `collectAttrs` / `mergeAttrsToRoot` / `inheritAttrs` —— 即**全量透传**（class 拼接、style 对象合并、其余 key 根元素优先）。
2. `@actview/core` 1.0.29 的 dist 中**以上 API 全部不存在** —— 透传功能移除，props 全量进 setup（仅剔除 `key`/`ref`），组件不再自动把属性落到根元素。
3. `@actview/plugin-vite@1.0.17` 的依赖从 `@actview/babel-plugin-actview@1.0.2` **更名为 `@actview/plugin-babel@1.0.3`**（lockfile 会自动切换，无手动操作）。
4. 组件模型**不变**：Babel 插件仍把 `return <JSX/>` 包成 `return () => <JSX/>`（setup 返回 render 函数）；`Content.ts` 等手动 `defineComponent(fn)` + `return function(){...}` 的写法在新 core 依旧合法（`instance.render = setupResult`）。

**破坏面定性：**

- **无编译级破坏**：全仓库 grep 确认没有任何文件 import `useAttrs` / `collectAttrs` / `mergeAttrsToRoot`（`actview-docs/actview-attrs-fallthrough.md` 是设计笔记，非代码）。
- **纯行为级破坏**：调用方传给组件的 `class` 等属性，旧运行时自动合并到组件根元素；新运行时若不显式处理，属性被**静默丢弃**（TS 类型不报错，因为 `P & HTMLAttributes` 允许传任意 DOM 属性）。

---

## 二、改动清单（完整审计，共 15 个文件）

> 统一模式：class 合并表达式**必须写在 JSX（render 函数）内**，不能提升为 setup 顶层 `const`——setup 只执行一次，`props.class` 更新不会反映到快照变量（见 `VPFeatures.tsx` 注释的既有约定）。

```tsx
// 模式 1：根元素 class 拼接
<div class={['VPNavBarSearch', props.class].filter(Boolean).join(' ')}>

// 模式 2：业务 props 解构 + 其余透传 + class 合并（VPImage 已是 rest 展开，需修正 class 覆盖问题）
const { image, alt, class: cls, ...rest } = props
<img class={['VPImage', cls].filter(Boolean).join(' ')} {...rest} />

// 模式 3：把调用方 class 并入传给子组件的 class
<VPFlyout class={['VPNavBarExtra', props.class].filter(Boolean).join(' ')} ...>
```

### A 类：根元素 class 合并（10 个组件）

| # | 文件 | 调用点（传入 class） | 现状根元素 | 改法 |
|---|---|---|---|---|
| 1 | `VPBackdrop.tsx` | `Layout.tsx` `<VPBackdrop class="backdrop">` | `<div class="VPBackdrop">` | 拼 `props.class` |
| 2 | `VPFeatures.tsx` | `VPHomeFeatures.tsx` `<VPFeatures class="VPHomeFeatures">` | `<div class="VPFeatures">` | 拼 `props.class` |
| 3 | `VPHero.tsx` | `VPHomeHero.tsx` `<VPHero class="VPHomeHero">` | `<div class={['VPHero', hasImage?...]}>` | 拼 `props.class` |
| 4 | `VPImage.tsx` | `VPHero`(image-src)、`VPNavBarTitle`(logo)、自递归(dark/light) | `<img class="VPImage" ... {...rest}/>` | **rest 展开会覆盖 class**：把 `class` 从 rest 中解构出来再拼接 |
| 5 | `VPNavBarSearch.tsx` | `VPNavBar.tsx` `<VPNavBarSearch class="search">` | 3 个 return 分支的 `<div class="VPNavBarSearch">` | 3 处都拼 `props.class` |
| 6 | `VPNavBarMenu.tsx` | `VPNavBar.tsx` class="menu" | `<nav class="VPNavBarMenu">` | 拼 `props.class` |
| 7 | `VPNavBarAppearance.tsx` | `VPNavBar.tsx` class="appearance" | `<div class="VPNavBarAppearance">` | 拼 `props.class` |
| 8 | `VPNavBarHamburger.tsx` | `VPNavBar.tsx` class="hamburger" | `<button class={['VPNavBarHamburger', active?...]}>` | 拼 `props.class` |
| 9 | `VPFlyout.tsx` | `VPNavBarTranslations`(VPNavBarTranslations)、`VPNavBarExtra`(VPNavBarExtra) | `<div class="VPFlyout">` | 拼 `props.class` |
| 10 | `VPSocialLinks.tsx` | `VPNavBarSocialLinks`(VPNavBarSocialLinks)、`VPNavBarExtra`(social-links-list) | `<div class="VPSocialLinks">` | 拼 `props.class` |

### B 类：把调用方 class 并入传给子组件的 class（3 个组件）

| # | 文件 | 调用点 | 现状 | 改法 |
|---|---|---|---|---|
| 11 | `VPNavBarTranslations.tsx` | `VPNavBar.tsx` class="translations" | `<VPFlyout class="VPNavBarTranslations" ...>` | `class={['VPNavBarTranslations', props.class].filter(Boolean).join(' ')}` |
| 12 | `VPNavBarSocialLinks.tsx` | `VPNavBar.tsx` class="social-links" | `<VPSocialLinks class="VPNavBarSocialLinks" ...>` | `class={['VPNavBarSocialLinks', props.class].filter(Boolean).join(' ')}` |
| 13 | `VPNavBarExtra.tsx` | `VPNavBar.tsx` class="extra" | `<VPFlyout class="VPNavBarExtra" ...>` | `class={['VPNavBarExtra', props.class].filter(Boolean).join(' ')}` |

### C 类：未声明 attrs 转发（1 个组件）

| # | 文件 | 调用点 | 现状 | 改法 |
|---|---|---|---|---|
| 14 | `VPMenuLink.tsx` | `VPNavBarTranslations`/`VPNavBarExtra` 传 `external={false} lang hreflang rel="alternate" dir` | 根 `<div class="VPMenuLink">` 不消费这些 props（旧运行时自动落根 div） | 转发到内层 `<VPLink>`：`hreflang={props.hreflang} dir={props.dir} lang={props.lang} external={props.external}`（对齐原版 VitePress 的 SEO hreflang / RTL dir 语义） |

### D 类：恢复 Content 显式 class 合并（1 个文件）

| # | 文件 | 调用点 | 现状 | 改法 |
|---|---|---|---|---|
| 15 | `app/components/Content.ts` | `VPDoc.tsx` `<Content class="vp-doc ...">` | `createElement(as, contentProps, ...)` —— **不含 props.class**（旧运行时靠透传，`.vp-doc` 样式依赖它） | 渲染函数内改为 `createElement(as, { ...contentProps, class: [contentProps.class, props.class].filter(Boolean).join(' ') }, ...)` |

> 这是 `actview-docs/actview-attrs-fallthrough.md` §5 记载过的修复（当时显式合并过一行，透传落地后被移除），现在需要**恢复**——否则 `.vp-doc` 前缀样式（代码块复制按钮等）全部失效。

### 无需改动（已逐文件核实）

- `VPLink.tsx`、`VPSwitch.tsx` —— 已显式 `{...props}` + class 合并（新契约下的正确范式）。
- `VPButton` / `VPSocialLink` / `VPSidebarItem` / `VPTeamMembersItem` / `VPNavBarSearchButton` / `VPSponsors` / `VPSponsorsGrid` / `VPNavScreen*` / `VPDoc*` / `VPSidebar*` / `VPLocalNav*` 等 —— 调用点只传声明过的 props，无透传依赖。
- 全仓库无组件级 `ref=`、`style=`、`id=`、`aria-*`、`data-*`、事件透传调用点（已穷举 grep），仅 `class` 受影响。
- `markdownToActView.ts` 生成的页面组件 —— 不接收外部 attrs，不受影响。

---

## 三、执行步骤

```bash
# 1. 升级依赖（lockfile 更新；plugin 更名自动生效）
pnpm install

# 2. 实施上述 15 处改动（A/B/C/D 类）

# 3. 新增回归测试：__tests__/unit/client/theme-default/components/attrs-merge.test.tsx
#    用 renderToString + jsx() 断言（参照 nav-render.test.tsx 写法）：
#    - <VPNavBarSearch class="search"/> → 根 div class="VPNavBarSearch search"
#    - <VPHero class="VPHomeHero" .../> → 根 class 含 "VPHomeHero"
#    - <VPFeatures class="VPHomeFeatures" features={[...]}/> → class 含 VPHomeFeatures，且无 features 属性泄漏
#    - <VPImage class="logo" image={...}/> → class="VPImage logo"
#    - <VPBackdrop class="backdrop" show/> → class="VPBackdrop backdrop"
#    - Content 渲染 → 根元素 class 含 "vp-doc"（模拟 VPDoc 调用链）

# 4. 类型校验 + 单元测试
pnpm build:client      # tsc -p src/client（含新 jsx 1.0.15 类型）
pnpm test:unit

# 5. dev 冒烟（浏览器手动检查清单见下）
pnpm dev

# 6. e2e（已含 .vp-doc / .VPNavBarSearchButton 断言，可兜底）
pnpm test:e2e

# 7. 重建发布产物并提交
pnpm build             # 重建 dist/client（node_modules 中加载的是 dist，不是 src）
git add -A && git commit
```

---

## 四、回归验收清单（DOM 级，dev 冒烟逐条核对）

| 检查点 | 期望结果（升级前 = 升级后） |
|---|---|
| 顶栏搜索区 | `<div class="VPNavBarSearch search">` |
| 顶栏菜单 | `<nav class="VPNavBarMenu menu">` |
| 顶栏语言切换 | `<div class="VPFlyout VPNavBarTranslations translations">`（VPFlyout 根） |
| 顶栏外观切换 | `<div class="VPNavBarAppearance appearance">` |
| 顶栏社交链接 | `<div class="VPSocialLinks VPNavBarSocialLinks social-links">` |
| 顶栏 extra | `<div class="VPFlyout VPNavBarExtra extra">` |
| 汉堡按钮 | `<button class="VPNavBarHamburger hamburger ...">` |
| 侧边栏遮罩 | `<div class="VPBackdrop backdrop">` |
| 首页 hero | `<div class="VPHero has-image VPHomeHero">` |
| 首页 features | `<div class="VPFeatures VPHomeFeatures">` |
| hero 图片 / logo | `<img class="VPImage image-src">` / `<img class="VPImage logo">` |
| 文档正文 | `<div class="vp-doc <pageName> ...">`（Content 恢复后） |
| 翻译菜单链接 | `<a>` 上带 `hreflang` / `dir` / `lang`（VPMenuLink 修复后） |

---

## 五、风险与注意

1. **class 合并必须写在 JSX 内**（render 函数中）：setup 顶层 `const cls = [...]` 会被快照，`props.class` 后续更新（如路由切换）不生效。这是本仓库既有约定（VPFeatures 注释），新增改动必须遵守。
2. **不要用全量 `{...props}` 展开代替白名单合并**：会把业务 props（`features`、`data` 等）以 `setAttribute` 方式泄漏到根元素（旧 1.0.15 的 `features="[object Array]"` bug 根源）。只合并 `class`（当前唯一有调用点的透传属性），或按 VPImage 模式解构后透传 rest。
3. **`VPLink` 全量 `{...props}` 会把 `tag/noIcon/external` 落到 `<a>` 上**：旧版本同样存在（非本次升级引入），可选顺带清理（解构排除业务 props 后再展开）。
4. **升级前不要直接发布**：`dist/` 是 tsc 产物且会被浏览器直接加载（plugin-vite 对 `.js` 也做 babel 转换），必须 `pnpm build` 重建后发布 1.0.17。
5. **对外契约变化**：主题作者的自定义组件若依赖透传（如给组件传 `class` 期望落根），升级后需显式合并。`docs/` 与迁移指南中如有 fallthrough 描述需同步更新（检查项）。
6. **e2e theme 中的 `.vue` 组件**（`__tests__/e2e/.vitepress/theme`）不经过本 Babel 组件转换，不受影响。
7. **回滚方案**：package.json 恢复 `actview ^1.0.26` / `@actview/core ^1.0.27` 等旧声明 + `pnpm install` 即可。

---

## 六、联动项目

- `E:\code3\actview-docs`（ActView 官方文档站）：已声明 `@actview/press ^1.0.17` 与新 actview 版本；无自定义 theme 组件（`.vitepress/theme` 为空、全仓库无透传 API 引用），**无需改代码**，等 press 1.0.17 发布后 `pnpm update` 即可。

---

## 七、执行结果（2026-08 已执行）

### 7.1 已完成

| 项 | 结果 |
|---|---|
| 依赖升级 | `pnpm install`：actview 1.0.28 / core 1.0.29 / jsx 1.0.15 / plugin-vite 1.0.17（依赖更名 @actview/plugin-babel@1.0.3，自动生效） |
| A/B/C/D 改造 | 15 个文件全部完成（见 §二 清单） |
| 回归测试 | 新增 `__tests__/unit/client/theme-default/components/attrs-merge.test.tsx`，10 个断言（A/B/C/D 全覆盖），**通过** |
| 单元测试 | `pnpm test:unit`：18 文件 / 158 用例**全部通过** |
| 类型校验 | `pnpm build:client`（tsc -p src/client）**通过**（exit 0） |
| dist | dist/client 已重建（`dist` 被 .gitignore，发布前需 `pnpm build` 全量重建） |

### 7.2 过程中发现并修复：@actview/jsx 1.0.15 类型缺陷

升级后 `tsc -p src/client` 报 **14 个类型错误**，排查确认全部是 jsx 1.0.15 类型定义问题（运行时行为正确）：

| 缺陷 | 表现 | 修复 |
|---|---|---|
| `VNodeChildren = VNodeChild \| VNodeChild[]` 仅支持单层数组 | 多 children 混入 map/数组变量时逐元素检查为单数 `VNodeChild`，嵌套数组报 `Type 'Element[]' is not assignable to 'VNodeChild'`（6 处） | `VNodeChild` 递归包含 `VNodeChild[]` |
| 小写事件别名缺失 | `onmouseenter/onmouseleave` 报错（运行时 `parseEventKey` 统一 toLowerCase，驼峰/小写都支持） | DOMAttributes 补齐小写事件全集 |
| 小写属性别名缺失 | `tabindex/datetime/for/autocapitalize/autocomplete/autocorrect/enterkeyhint/spellcheck` 报错（运行时按 attribute 原样 setAttribute，小写才是 HTML 正确写法） | 对应 interface 补齐小写别名 |

**处置**：
- 根修已提交 actview 仓库：`9ad6dc4`（`packages/jsx/src/types.ts`）
- actpress 侧以 **pnpm patch** 临时应用（`patches/@actview__jsx@1.0.15.patch` + `pnpm-workspace.yaml` patchedDependencies），本地类型校验立即通过
- **待办**：actview 发布 `@actview/jsx@1.0.16` 后，`pnpm patch-remove @actview/jsx@1.0.15` 移除补丁并升级

### 7.3 待办

- [ ] e2e 验收（需 playwright 环境）：`pnpm test:e2e`（已含 `.vp-doc` / `.VPNavBarSearchButton` 断言），另按 §四 清单做 dev 冒烟
- [ ] 发布 `@actview/jsx@1.0.16`（含类型修复）后移除 §7.2 的 pnpm patch
- [ ] 发布 `@actview/press@1.0.18`（含本次重构），供 `actview-docs` 等下游升级
