# 警示：组件函数体（setup）只执行一次 —— 派生值会被快照

> **一句话结论**：组件函数体在挂载时只执行一次（= setup），函数体内从 `props` 计算的
> 任何 `const` 都会被渲染闭包快照；`props` 变化后组件虽然重渲染，但这些值**永远是
> 首次挂载时的旧值**，导致 DOM 不更新。所有派生值必须放在**渲染期**（返回的 JSX
> 表达式内）重新求值。

---

## 1. 机制：为什么会被快照

Babel 插件把组件函数转换成：

```tsx
// 源码
export function MyLink(props) {
  const cls = props.active ? 'on' : 'off'   // ← setup 期计算
  return <a class={cls}>{props.text}</a>
}

// 转换后（等价结构）
export const MyLink = defineComponent(function (props) {
  const cls = props.active ? 'on' : 'off'   // 只执行一次！
  return () => _jsx('a', { class: cls, ... })  // 闭包捕获 cls（旧值）
}, 'MyLink')
```

- 函数体 = `__setup`，**只在挂载时执行一次**（`watch`/`computed`/生命周期也在此注册）。
- 末尾 `return <JSX>` 被包成 **render 函数** `() => <JSX>`，每次重渲染重新执行。
- **函数体内的 `const cls = props.active ? ...` 只算了一次**，render 闭包捕获的是快照。
- `props` 是**普通对象**（非响应式）：父组件通过 `patchComponent → updateProps`
  直接改 `instance.props` 的值并手动调度子组件重渲染——`computed` 无法追踪 props，
  所以在 setup 里用 `computed(() => props.xxx)` **也不能**自动失效（没有响应式依赖）。

## 2. 症状：容易造成什么问题

| 症状 | 表现 |
|---|---|
| **首次渲染正确，之后永远不变** | 页面元素停留在「进入页面那一刻」的状态，导航/切页/换 locale 后不更新（最常见） |
| **watch/computed 值正确，DOM 不动** | 调试时发现响应式链路全通（日志值都对新），但界面冻结——因为坏的不是响应式，是渲染闭包里的快照 const |
| **「首帧」固定** | 比如导航高亮永远在第一次进入的页面对应的导航项上 |
| **换 locale / 配置热更新后错位** | 从 props 派生的 class、标签名、target/rel 全部用旧值 |

典型排查特征：**状态值对、DOM 错** —— 这是「快照」而非「响应式断裂」的信号。

## 3. 真实案例：导航高亮不更新（已修复）

- 现象：`VPNavBarMenuLink` 的 `isActiveLink`（computed）在路由切换后 watch 输出正确
  （`Guide: false, Reference: true`），但 `.VPNavBarMenuLink` 的 `active` class 永远
  停留在首次进入的页面对应的导航项上。
- 定位：`onRenderTracked`/渲染期打印证实——渲染 effect 被触发 ✓、重渲染产出正确的
  新 class ✓，但 DOM 不变。继续向下定位到 `VPLink`：

```tsx
// 修复前（VPLink）
export function VPLink(props) {
  const Tag = props.tag ?? (props.href ? 'a' : 'span')        // setup 快照
  const isExternal = isLinkExternal(props.href, ...)          // setup 快照
  const cls = ['VPLink', ..., props.class ?? ''].join(' ')    // setup 快照 ← 元凶
  return () => _jsx(Tag, { ...props, class: cls, ... })       // class: 旧 cls 覆盖新值
}
```

  `cls` 在 setup 期算好（含首次的 `active`），之后父组件更新 `props.class` →
  `{...props}` 展开的是新值，但 `class: cls` 用旧快照覆盖 → `<a>` 永远首帧 class。
- 修复：派生值全部挪进 render 期（见下）。

## 4. 正确写法（三条规则）

### 规则一：从 props 派生的值，放在 JSX 表达式内（内联或 helper 函数）

```tsx
// ✓ 内联
return <a class={props.active ? 'on' : 'off'}>{props.text}</a>

// ✓ helper 函数：函数体声明，JSX 内调用（每次重渲染重新执行）
export function VPLink(props) {
  const makeAttrs = () => ({ ...props, class: [...].join(' ') })
  return <component {...(makeAttrs() as any)}>{props.children}</component>
}
```

### 规则二：动态标签用 `<component is={...}>`，不要用 setup 期 Tag 常量

```tsx
// ✗ Tag 常量 = 快照，props 变化后标签不更新
const Tag: any = props.tag ?? (props.href ? 'a' : 'button')
return <Tag class={...}>...</Tag>

// ✓ render 期解析
return <component is={props.tag ?? (props.href ? 'a' : 'button')} class={...}>...</component>
```

> `as any` 说明：`@actview/jsx` 的 `component` 类型是严格 `HTMLAttributes & { is? }`，
> 不含 `href`/`target` 等专属属性（框架类型限制，运行时无影响）。打包构建（vite 插件）
> 和 tsc 编译均支持 `<component>`（`_jsx('component', { is })`，运行时
> `resolveDynamicVNode` 解析为真实标签）。

### 规则三：`computed` 只用于响应式源（page/route/theme 等），不能救 props

```tsx
// ✓ computed 正确用法：源是响应式（路由变化 → computed 重算 → 重渲染）
const isActiveLink = computed(() => isActive(page.value.relativePath, href.value))

// ✗ 无效：props 是普通对象，computed 没有依赖可追踪，求值一次后永远缓存旧值
const cls = computed(() => props.active ? 'on' : 'off')   // 之后 props.active 变了也不重算
```

## 5. 自查清单（代码 Review 时扫一眼）

函数体（setup）里出现以下模式 = 雷区，且该值用在返回的 JSX 中：

- [ ] `const xxx = props.xxx ?? 'default'`（派生默认值）
- [ ] `const xxx = props.xxx ? 'a' : 'b'`（派生分支值）
- [ ] `const Tag = props.tag ?? ...` / `const Tag = cond ? 'a' : 'div'`（动态标签）
- [ ] `const isExternal = !!props.href && ...`（派生布尔）
- [ ] `const cls = [...props.xxx].join(' ')`（派生 class 字符串）

正确的做法：把这些表达式**内联进 JSX**，或写成 `const makeXxx = () => ...` 在 JSX
里调用。

## 6. 已修复清单（本仓库）

| 组件 | 修复内容 |
|---|---|
| `VPLink.tsx` | `Tag`/`isExternal`/`cls` → `makeAttrs()` render 期求值 + `<component is>` |
| `VPButton.tsx` | `size`/`theme`/`isExternal`/`Tag` → `makeAttrs()` render 期求值 + `<component is>` |
| `VPSidebarItem.tsx` | `SectionTag`/`LinkTag`/`TextTag` → `<component is>` + render 期表达式 |
| `VPNavBarMenuLink.tsx` | 渲染期 class 计算（配合 VPLink 修复） |

## 7. 排查手段

1. **确认是「状态对、DOM 错」**：在组件里 `watch` 派生值或打印，若值正确而 DOM 不变 → 快照嫌疑。
2. **渲染期打印**：把派生值包一层函数在 JSX 里 `console.log`，确认重渲染时读到的值。
3. **`onRenderTracked`**：验证渲染 effect 是否重新收集依赖（重渲染发生了）。
4. 定位到具体组件后，对照第 5 节清单逐条检查 setup 期 const。
