# Bug 修复日志

> 记录 ActView 迁移过程中发现并修复的 bug。每条含：场景（何时出现）→ 原因（根因）→ 解决（方案与验证）。

---

## 2026-08-06 · P1 · 组件「setup 早退」导致路由切换崩溃（VPHomeHero `undefined.name`）

### 场景

- 运行环境：`pnpm docs:dev`（dev 模式），或任何经 router 切换页面的运行场景。
- 复现路径：打开首页（`index.md`，frontmatter 含 `hero`）→ 点击导航切换到无 `hero` 的页面（如 `guide/what-is-vitepress.md`）。
- 浏览器 console 报错（`[actview] 组件渲染错误`，被渲染错误捕获，页面局部内容丢失）：

```
TypeError: Cannot read properties of undefined (reading 'name')
    at Object.render (VPHomeHero.js:8:69)
    at ReactiveEffect.update [as fn] (index.js:647:35)
    ...
    （匿名） @ router.js:56   ← route.data = __pageData（路由切换）
```

- 附带现象（修复前）：切换后首页 hero 区域渲染异常 / 空白。

### 原因

`VPHomeHero.tsx` 迁移时把 Vue 原版的「模板 `v-if` 守卫」写成了「函数组件 setup 早退」：

```tsx
// 迁移后的写法（错误模式）
export function VPHomeHero(props = {}) {
  const { frontmatter: fm } = useData()
  if (!fm.value.hero) return null          // ★ 只在 mount（setup 执行）时判断一次
  return <VPHero name={fm.value.hero.name} ... />   // ★ render 每次执行都读 fm.value.hero.name
}
```

经 `@actview/plugin`（Babel）转换为 defineComponent 后，早退 `return null` 变成 `return () => null`，
**判断只在 setup 阶段执行一次**；而 render 函数体内仍直接引用 `fm.value.hero.name`，**每次渲染重新求值**。

触发链：

1. 首页 mount：setup 时 `fm.value.hero` 存在 → 返回 render（内部引用 `fm.value.hero.name`）。
2. router 切换页面：`route.data = __pageData`（新页面）→ `set` → `trigger` → `flushJobs`。
3. `VPHomeHero` 的 render effect 依赖 `fm.value`（computed）→ update 执行 render。
4. 此时 `fm.value.hero` 已是 `undefined`（新页面无 hero）→ `undefined.name` → TypeError。

根因本质：**判断时机退化**。Vue 的模板 `v-if="hero"` 每次渲染都重新判断，hero 消失时整棵
`VPHero` 子树不渲染、不会读取 `.name`；迁移成 setup 早退后，守卫只在 mount 时生效一次，
render 里的引用失去守卫。

### 解决

统一模式：**条件判断与后续引用全部移入 render 函数**，setup 只负责初始化（useData/hooks），
不再 `return null`（setup 必须返回 render 函数）。

```tsx
// 修复后的写法（正确模式）
export const VPHomeHero = defineComponent(function (props = {}) {
  const { frontmatter: fm } = useData()
  return function () {
    const hero = fm.value.hero        // 每次渲染重新读取 + 判断
    if (!hero) return null
    return <VPHero name={hero.name} ... />
  }
})
```

render 每次执行都重新判断：hero 存在才读 `.name`；hero 消失 → `return null`，不崩溃。

### 同类问题排查（一并修复）

所有「函数组件 + setup 早退（条件依赖响应式值或 props）」的组件都有同类风险：

| 组件 | 早退条件 | 风险类型 |
|---|---|---|
| `VPHomeHero` | `!fm.value.hero` | 🔴 切换后 render 读 `hero.name` 崩溃（本次已爆） |
| `VPFooter` | `!footer`（`theme.value.footer`） | 🔴 切换后 render 读 footer 字段崩溃 |
| `VPFeatures` | `!props.features` | 🔴 依赖从有到无时 render 读 `.map` 崩溃 |
| `VPBackdrop` | `!props.show` | 🟠 props 变化不响应（show 切换失效） |
| `VPHomeFeatures` | `!features`（`frontmatter.value.features`） | 🟠 响应式值，render 无守卫 |
| `VPNavBarTranslations` | `!localeLinks.value.length \|\| !currentLang.value.label` | 🟠 响应式值，render 无守卫 |
| `VPNavBarSocialLinks` | `!theme.value.socialLinks` | 🟠 响应式值，render 无守卫 |
| `VPNavScreenAppearance` | `!appearance` | 🟠 响应式值，render 无守卫 |
| `VPNavScreenMenu` | 视取值来源 | 🟠 响应式值，render 无守卫 |
| `VPNavScreenSocialLinks` | `!theme.value.socialLinks` | 🟠 响应式值，render 无守卫 |
| `VPNavScreenTranslations` | 视取值来源 | 🟠 响应式值，render 无守卫 |

### 验证

- `pnpm test:unit` 全绿（138+ 用例）。
- `tsc -p src/client --noEmit` / `tsc -p src/node --noEmit` 通过。
- dev 冒烟：首页 → 切换 guide 页不再报 `undefined.name`；sidebar 正常显示。

---

## 2026-08-05 · P0 · `patchKeyedChildren` 丢失/崩溃（Fragment 根组件 + 嵌套 keyed）

> 此 bug 由 JSX-Demo（ActView core）侧修复（1.0.12 → 1.0.13），vitepress 侧仅记录。

### 场景

- `VPSidebar` 的 sidebar 内容（`VPSidebarGroup`）不渲染；`<span id="sidebar-aria-label">` 重复。
- 后续升级 core 1.0.13 后（第一部分修复生效），出现新的崩溃：

```
TypeError: Cannot read properties of null (reading 'insertBefore')
    at patchKeyedChildren (index.js:1116:39)
    at patchChildren (index.js:1075:5)
    at mountVNode (index.js:953:26)   ← Fragment 分支，container 为 null
```

### 原因

`patchKeyedChildren` 两处问题：

1. 插入阶段 `if (newVNode?.el == null) continue`——render 返回 Fragment 的组件（如
   `VPSidebarGroup` 的 `<>...</>`）`subTree.el` 恒为 `null`，keyed 节点被跳过 → 子树丢失。
   （core 1.0.13 已用 `collectDomEls` / `firstDomEl` 修复。）
2. 第一轮对「未命中 oldKeyToIndex 的新节点」执行 `mountVNode(newVNode, null)`（挂到 null
   容器）——若该组件 render 返回 Fragment 且内部又含 keyed children，Fragment 分支把
   children patch 到 null 容器 → 内层 `patchKeyedChildren(..., null)` → 插入阶段
   `container.insertBefore(...)` 对 null 调用 → TypeError。（待 JSX-Demo 侧修复。）

### 解决

- core 1.0.13：插入阶段改用 `collectDomEls`/`firstDomEl` 递归收集真实 DOM 锚点。
- 待修复（JSX-Demo）：第一轮新节点应 `mountVNode(newVNode, container)`（真实容器）而非 null。

### 验证

- 最小复现（happy-dom）：keyed + Fragment 根组件挂载成功；嵌套 keyed 不再抛 `insertBefore null`。
- 升级 core 1.0.13 后 vitepress sidebar 正常显示。
