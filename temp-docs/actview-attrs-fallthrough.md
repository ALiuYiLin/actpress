# ActView attribute fallthrough（Vue 式非 prop attribute 透传）设计

> 目标：让 ActView 支持 Vue 的「非 prop attribute 自动落到组件根元素」语义，
> 解决 `<Content class="vp-doc" />` 的 class 被丢弃、`.vp-doc ...` 样式全部失效的问题。
> 定位：框架层能力（`@actview/core`），vitepress 侧暂以组件显式合并绕过。

---

## 1. 背景与问题

VitePress 迁移到 ActView 后发现：`VPDoc.tsx` 给 `Content` 组件传 `class="vp-doc"`，
但 `Content.ts` 渲染时只用 `site.contentProps`，`props.class` 被丢弃 → 页面根元素没有
`vp-doc` class → `.vp-doc [class*='language-'] > button.copy` 等**所有** `.vp-doc` 前缀
样式不生效（复制按钮样式只是最显眼的一个）。

Vue 中该问题不存在：**attribute fallthrough** —— 组件上未在 `props` 中声明的 attribute
自动落到组件根元素上（class/style 合并，其他覆盖；多根组件不自动透传）。

## 2. 现状约束（为什么不能直接复刻 Vue）

ActView 的组件形态：

```ts
function defineComponent(setup) {
  return { __setup: setup }   // 只有 setup，没有任何 props 声明 / options 机制
}
```

- 组件**没有「声明过的 props」列表** —— 无法区分「这是组件的 prop」还是「这是外部 attrs」。
- 这是 Vue 实现 fallthrough 的前提（`props: ['foo']` / `inheritAttrs`）。
- 因此「完整自动 fallthrough（所有未声明 attrs）」在 ActView 当前架构下**不可可靠实现**：
  框架不知道哪些 key 是组件故意接收的 prop。

## 3. 方案对比

| 方案 | 描述 | 评价 |
|---|---|---|
| A. 手动透传 | 组件自己 `{ ...props }` 展开到根元素（vitepress 现状） | 现状，啰嗦且易漏；不是框架能力 |
| B. 运行时推断 attrs | render 后比较「传入 props keys」与「根 vnode 实际用到的 props keys」 | ❌ 不可靠：组件可能读了 prop 但放在子元素/条件分支 |
| C. 启发式未消费 key | 根 vnode 没有、组件 props 有的 key 都合并 | ❌ 同 B：组件可能故意不用某个 prop |
| **D. 特定 attrs 白名单 fallthrough** | 只对 `class` / `style` / `id` / `on*`（事件）这几个 key 做自动透传 | ✅ 务实：这些 key 在 Vue 中几乎总是 attrs；不需要 props 声明；实现小；覆盖 vitepress 需求 |
| E. 完整 props 声明 + attrs | `defineComponent` 增加 `props` 白名单选项 + `ctx.attrs`，声明过的才作 props，其余 attrs 自动落根 | 长期正解，但需改动组件写法（生态 + vitepress 92 组件）；作为 D 的演进方向 |

**推荐先做 D**（本次需求），E 作为后续演进（若 ActView 想完整对齐 Vue 组件模型）。

## 4. 方案 D 详细设计

### 4.1 触发条件

组件 render 返回**单根元素 vnode**（`type` 是字符串标签）时启用；以下情况**不启用**：

- render 返回 Fragment（`<>` 多根）→ 不透传（与 Vue 一致）
- render 返回 `null` / 文本 / 组件 vnode → 不透传
- 组件显式设置 `inheritAttrs: false`（见 4.5）→ 不透传

### 4.2 透传的 key 白名单

```ts
const FALLTHROUGH_KEYS = new Set(['class', 'style', 'id'])
// on*（事件）也透传：以 'on' 开头且后跟大写字母的 key
```

### 4.3 合并规则（Vue 语义对齐）

| key | 规则 |
|---|---|
| `class` | 根元素已有 class → **拼接**（`"root attrs"`）；根无 → 直接用 attrs 值 |
| `style` | 根已有 style → **对象合并**；根无 → 用 attrs 值 |
| `id` | 根已有 id → **根优先，不覆盖**；根无 → 用 attrs 值 |
| `on*`（事件） | 根已有同名事件 → **根优先**（组件内部绑定优先）；根无 → 绑定 attrs 的监听器 |

### 4.4 实现位置（core）

`mountComponent` / `patchComponent` 的 update 之后，拿到 `instance.subTree`（根 vnode）：

```ts
function applyFallthrough(props, rootVNode) {
  if (!rootVNode || typeof rootVNode.type !== 'string') return   // 仅单根元素
  if (rootVNode.props == null) rootVNode.props = {}
  for (const key of FALLTHROUGH_KEYS) {
    const v = props[key]
    if (v == null) continue
    if (key === 'class') {
      rootVNode.props.class = rootVNode.props.class
        ? [rootVNode.props.class, v].filter(Boolean).join(' ')
        : v
    } else if (key === 'style' && rootVNode.props.style) {
      rootVNode.props.style = { ...rootVNode.props.style, ...v }
    } else if (!(key in rootVNode.props)) {
      rootVNode.props[key] = v
    }
  }
  for (const k of Object.keys(props)) {
    if (/^on[A-Z]/.test(k) && !(k in rootVNode.props)) {
      rootVNode.props[k] = props[k]
    }
  }
}
```

- **mount 与 patch 都要调用**（props 变化时 attrs 同步更新）。
- 调用时机：`update()` 中 `patch(oldSubTree, newSubTree, container)` **之前**，
  `instance.render()` 拿到 `newSubTree` 后立即 `applyFallthrough(instance.props, newSubTree)`。
- **性能**：白名单 key 少，逐 key 判断开销可忽略；`on[A-Z]` 扫描 props keys，组件 props
  通常 < 20 个，可接受。

### 4.5 开关（inheritAttrs）

`defineComponent` 增加可选第二参数或 options 形态（向后兼容）：

```ts
// 现有函数形态不变（默认开启 fallthrough）
defineComponent(function (props) { ... })

// 显式关闭（可选，非必须）
defineComponent(function (props) { ... }, { inheritAttrs: false })
// 或：
defineComponent({ setup, inheritAttrs: false })
```

> 注意：**默认开启**会改变现有组件行为（新增 class/style 透传）——需回归测试确认不破坏
> 现有组件（大多数组件传 class 期望透传，符合预期）。

### 4.6 边界情况

- **props 是 reactive 的**（`instance.props` 是 proxy）→ `applyFallthrough` 读 `props[key]`
  会触发依赖收集，render effect 重新执行时 attrs 同步 ✓。
- **根 vnode 的 props 为 null**（`createElement('div', null)`）→ 初始化 `{}`。
- **attrs 值为 undefined / false / null** → 跳过（`v == null` continue；false 是合法值，
  `class={false}` 应透传吗？——Vue 中 `false` 的 class 不渲染——建议 `v == null` 跳过，
  `false` 也跳过（`!v` 处理）以对齐 Vue 的 class 过滤）。
- **Fragment 根**：不透传，但组件可通过 `props.$attrs` 手动绑定（见 4.7，可选）。

### 4.7 可选增强：$attrs（给组件访问透传集）

```ts
// setup 里（若实现 E 的 ctx 形态）或 props.$attrs
// 多根组件需要手动绑定时使用：
return () => <>{/* 手动 <div {...props.$attrs}> */}</>
```

> 本次（方案 D）可不做 $attrs——vitepress 无多根透传需求。留作 E 的组成部分。

## 5. vitepress 侧当前处理

在框架 fallthrough 落地前，`Content.ts` 显式合并 class（一行）：

```ts
return createElement(as, { ...contentProps, class: props.class }, ...)
```

框架落地后可移除（fallthrough 自动处理）。

## 6. 给 JSX-Demo agent 的提示词

```
# 任务：ActView core 增加 attribute fallthrough（非 prop attribute 自动落到组件根元素）

## 背景
VitePress 迁移到 ActView 时发现：`<Content class="vp-doc" />` 传入组件的 class 被丢弃，
页面根元素没有 vp-doc class，导致 `.vp-doc ...` 前缀样式全部失效。Vue 通过
「attribute fallthrough」解决（未声明的 attrs 自动落到根元素）。

ActView 组件形态是 `{ __setup }`，没有 props 声明机制，无法完整复刻 Vue 的 attrs 语义。
采用「特定 attrs 白名单 fallthrough」方案（见下）。

## 实现要求
1. 在 render 生成子树后、patch 前，对组件应用 fallthrough（mount 与 patch 都要）：
   - 仅当 render 返回**单根元素 vnode**（type 为 string 标签）时启用；
     Fragment 根 / null / 文本 / 组件根不启用（对齐 Vue 多根不自动透传）。
   - 白名单 key：`class`、`style`、`id`，以及 `/^on[A-Z]/`（事件监听器）。
   - 合并规则（对齐 Vue）：
     - class：根已有则拼接（`"root attrs"`），根无则用 attrs 值；
     - style：根已有则对象合并，根无则用 attrs 值；
     - id / on*：根已有则根优先（不覆盖），根无才设置。
   - attrs 值为 null/undefined/false 时跳过。
2. defineComponent 支持可选 `{ inheritAttrs: false }` 关闭（保持现有函数形态兼容）。
3. 写最小回归测试：
   - `<Comp class="x">` 单根元素 → 根元素 class 含 "x"；
   - 根元素已有 class + attrs class → 拼接；
   - style 对象合并；
   - 事件 attrs 透传（根无同名事件时触发）；
   - Fragment 根组件不透传；
   - inheritAttrs: false 不透传。
4. 现有测试全绿（npm test）。

## 关键位置
renderer 的 mountComponent / patchComponent（update 流程：render() → applyFallthrough →
patch）。发布产物参考 `index.js` 的 `mountComponent`（vnode.el = instance.subTree.el 附近）。
```

## 7. 演进方向（E，非本次）

若 ActView 要对齐 Vue 组件模型：

1. `defineComponent` 增加 options 形态：`{ props: [...], setup(props, ctx) }`，`props` 白名单
   之外的进 `ctx.attrs`。
2. attrs 完整 fallthrough（所有 key）+ `$attrs` 暴露。
3. 影响面：所有现有组件（函数形态保持默认全 props 不启用，声明 props 后才启用 attrs）——
   向后兼容。

---

## 8. 实现偏差记录与修正（core 1.0.15 已发布后）

### 8.1 现状：1.0.15 实际实现为「全量透传」，与方案 D 白名单不符

已发布的 `mergeAttrsToRoot`（`@actview/core@1.0.15`，`mountComponent.update()` 内每次渲染调用）：

```js
function mergeAttrsToRoot(subTree, props) {
  if (subTree == null) return;
  if (subTree.type === FragmentTag) return;   // 多根不透传 ✓
  if (subTree.type?.__builtin) return;
  if (!props) return;
  const rootProps = { ...subTree.props || {} };
  for (const key of Object.keys(props)) {
    if (isInternalAttrKey(key)) continue;     // 仅 key/ref/children/slots
    const value = props[key];
    if (value == null || value === false) continue;
    if (key === "class" || key === "className") {
      const existing = rootProps.class ?? rootProps.className ?? "";
      const combined = [existing, value].filter(Boolean).join(" ");
      rootProps.class = combined;
      delete rootProps.className;
      continue;
    }
    if (!(key in rootProps)) rootProps[key] = value;   // ← 全量：组件 props 也落根
  }
  subTree.props = rootProps;
}
```

**后果**（vitepress 实测 + 最小复现）：组件自己的业务 props 也被透传到根元素——

```
<div class="VPFeatures" features="[object Array]">
```

（`patchProps` → `setProp` 对非特殊 key 执行 `el.setAttribute(key, String(value))`，
数组 toString 为 `[object Object],[object Object]` / `[object Array]`。）

本质：ActView 组件无「props 声明」，全量透传无法区分「组件的 prop」与「外部 attrs」——
正是 §2 指出的约束。class/style/on* 合并逻辑本身正确，问题只出在「白名单缺失」。

### 8.2 修正方案 A：回到白名单（推荐）

`mergeAttrsToRoot` 只透传 `class`/`style`/`id`/`on*`：

```diff
-  for (const key of Object.keys(props)) {
-    if (isInternalAttrKey(key)) continue;
-    const value = props[key];
-    if (value == null || value === false) continue;
-    if (key === "class" || key === "className") {
-      const existing = rootProps.class ?? rootProps.className ?? "";
-      const combined = [existing, value].filter(Boolean).join(" ");
-      rootProps.class = combined;
-      delete rootProps.className;
-      continue;
-    }
-    if (!(key in rootProps)) rootProps[key] = value;
-  }
+  const FALLTHROUGH_KEYS = new Set(["class", "className", "style", "id"]);
+  for (const key of Object.keys(props)) {
+    if (isInternalAttrKey(key)) continue;
+    if (!FALLTHROUGH_KEYS.has(key) && !/^on[A-Z]/.test(key)) continue; // 白名单
+    const value = props[key];
+    if (value == null || value === false) continue;
+    if (key === "class" || key === "className") {
+      const existing = rootProps.class ?? rootProps.className ?? "";
+      const combined = [existing, value].filter(Boolean).join(" ");
+      rootProps.class = combined;
+      delete rootProps.className;
+      continue;
+    }
+    if (key === "style" && rootProps.style) {
+      rootProps.style = { ...rootProps.style, ...value };
+      continue;
+    }
+    if (!(key in rootProps)) rootProps[key] = value;
+  }
```

效果：`features`/`icon`/`title` 等组件业务 props 不再落根；`class`/`style`/事件/`id` 正常透传。
代价：组件若想透传自定义 attrs（`data-*`、`aria-*`、`tabindex` 等）白名单外不透传——
需组件显式写，或采用方案 C。

### 8.3 修正方案 C：白名单 + data-*/aria-* 透传

在方案 A 基础上放宽（覆盖 Vue 常见 attrs 场景）：

```diff
   for (const key of Object.keys(props)) {
     if (isInternalAttrKey(key)) continue;
-    if (!FALLTHROUGH_KEYS.has(key) && !/^on[A-Z]/.test(key)) continue;
+    if (
+      !FALLTHROUGH_KEYS.has(key) &&
+      !/^on[A-Z]/.test(key) &&
+      !/^(data-|aria-)/.test(key) &&
+      key !== "role" &&
+      key !== "tabindex"
+    ) continue;
```

### 8.4 建议

- **短期**：A 或 C（改动 < 10 行，保留 1.0.15 已有的 class/style 合并逻辑），随 core 下一版本发布。
- **长期**：方案 E（`defineComponent` props 声明）才能彻底区分 attrs vs props。

### 8.5 验证（修正后需回归）

- `<Comp class="x">` 单根 → 根 class 含 "x"（现有能力，保持）。
- 根已有 class + attrs class → 拼接。
- style 对象合并；事件 attrs 透传；Fragment 根不透传；`inheritAttrs: false` 不透传。
- **新增断言**：`<Comp features={[...]}>`（features 为组件业务 prop）→ 根元素**不含**
  `features` 属性。
- vitepress：`<div class="VPFeatures">` 无 `features="[object Array]"`；
  `<Content class="vp-doc">` 的 class 仍正确落到根元素（`.vp-doc` 样式恢复）。
