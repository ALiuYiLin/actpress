# @actview/plugin 的 defineComponentPlugin 缺陷分析

> 状态:已定位(未修复)
> 涉及:`@actview/plugin` 的 Babel 插件 `defineComponentPlugin`
> 关联报错:`InvalidCharacterError: Failed to execute 'createElement' on 'Document': The tag name provided ('function X(...) {...}') is not a valid name.`

## 背景:ActView 的组件契约

ActView 的组件写法是**裸函数**,`defineComponent` 由编译期 Babel 插件(`actviewPlugin` → `defineComponentPlugin`)自动完成,tsx 源码**不需要手写** `defineComponent`:

```tsx
// 期望写法(用户视角)
export function Counter() {
  return <button>{count.value}</button>
}
```

运行时(`@actview/core`)只认 `defineComponent` 的产物——含 `__setup` 的对象:

```js
// @actview/core index.js
function isComponentVNode(vnode) {
  return vnode.type != null && typeof vnode.type === 'object' && '__setup' in vnode.type
}
// mountComponent 里
if (options == null || typeof options !== 'object' || typeof options.__setup !== 'function') {
  throw new Error('[actview] mountComponent: 无效的组件,缺少 __setup')
}
```

因此,**任何未经过 `defineComponent` 包装的函数被当作 vnode.type 时**,`isComponentVNode` 判定失败,`mountVNode` 会执行 `document.createElement(vnode.type)` → 把函数字符串当标签名 → `InvalidCharacterError`。

`__setup(props)` 有两种合法返回形态:

1. **直接返回 JSX**(简写组件):`__setup(props) { return <div/> }`
2. **返回渲染函数**(setup 风格组件):`__setup(props) { ...hooks...; return () => <div/> }`

## 缺陷 1:FunctionDeclaration 的 return 检测不覆盖 setup 风格

### 现状代码

`@actview/plugin` 的 `defineComponentPlugin` 只有 `FunctionDeclaration` visitor,且要求函数体**最后一个语句直接 `return JSX`**:

```js
FunctionDeclaration(path) {
  const node = path.node;
  if (!node.id) return;
  const name = node.id.name;
  if (!/^[A-Z]/.test(name)) return;              // ① 必须大写开头
  const body = node.body.body;
  const last = body[body.length - 1];
  if (!t.isReturnStatement(last)) return;        // ② 最后一句必须是 return
  const ret = last.argument;
  if (ret == null) return;
  const isJsx = t.isJSXElement(ret) || t.isJSXFragment(ret);                          // ③ return JSX
  const isJsxCall = t.isCallExpression(ret) && t.isIdentifier(ret.callee) && /^_?jsx/.test(ret.callee.name);  // ④ return _jsx(...)
  if (!isJsx && !isJsxCall) return;              // ← ⑤ 不满足则整体跳过
  ...
  // 把 return 的 JSX 包成箭头函数,再整体包 defineComponent
}
```

### 触发场景

**setup 风格裸函数组件**(函数体最后 `return function() {...}`,即 setup 返回渲染函数):

```tsx
export function VPNavBarTranslations(props: any = {}) {
  const { theme } = useData()
  const { localeLinks, currentLang } = useLangs({ correspondingLink: true })
  watch(localeLinks, ...)
  return function () {           // ← 最后一句 return 的是函数,不是 JSX
    return <VPFlyout ...>...</VPFlyout>
  }
}
```

### 缺陷链

1. `last.argument` 是 `FunctionExpression`(渲染函数),`isJsx` / `isJsxCall` 均为 `false` → 第 ⑤ 步直接 `return`,**插件跳过该函数,不包 `defineComponent`**
2. 编译产物保持裸函数:`export function VPNavBarTranslations(props = {}) {...}`
3. 运行时 `VPNavBarTranslations` 是函数 → `isComponentVNode` 为 `false` → `mountVNode` 走 `document.createElement(vnode.type)` → `InvalidCharacterError: The tag name provided ('function VPNavBarTranslations(props = {}) {...}') is not a valid name.`
4. 页面组件树渲染中断(导航栏/文档页崩溃),控制台报 `[actview] 组件渲染错误: InvalidCharacterError ...`

### 修复方向(已实施)

扩展第 ③④ 步的判断:**当 `last.argument` 是 `FunctionExpression` 或 `ArrowFunctionExpression`(即 setup 风格 `return function() {...}`)时,同样进行包装**——通过**递归 `wrapComponentFn` 嵌套包装为内部组件**(插件 1.0.8):

```js
const isRenderFn =
  t.isFunctionExpression(ret) || t.isArrowFunctionExpression(ret)
if (!isJsx && !isJsxCall && !isRenderFn && !isNullRet) return
// ...
} else if (isRenderFn) {
  // 渲染函数 → 递归包装为内部组件(嵌套 defineComponent)
  const inner = wrapComponentFn(ret)
  if (inner) last.argument = inner
}
```

**为什么要嵌套包装(不能原样保留)**:

- setup 风格渲染函数**可能是带参子组件**(`return function(innerProps) { ...; return <JSX> }`——内部有自己的 setup 逻辑与 props)
- 渲染器 `update()` 是 `instance.render()` **无参调用**;若原样保留,带参渲染函数会被当作无参渲染函数调用 → `innerProps` 变 undefined、内部 setup 失效
- 嵌套包装后 `__setup` 返回**组件对象**,渲染器经 `normalizeSetupResult`(core 1.0.20)挂载为**子组件**,`innerProps` 正常传入 ✅

**配套的 SSR 修复(core `serializeNode`)**:`__setup` 返回组件对象时,SSR 序列化也必须像客户端一样处理(见下文「SSR serializeNode 缺陷」)。

## 缺陷 2:不支持 VariableDeclarator(函数表达式 / 箭头函数组件)

### 现状代码

`defineComponentPlugin` 的 visitor **只有 `FunctionDeclaration`**:

```js
return {
  visitor: {
    Program: {...},
    FunctionDeclaration(path) {...}   // ← 唯一的组件转换入口
  }
}
```

### 触发场景

组件以**函数表达式 / 箭头函数**形式声明(不是 `function` 声明):

```tsx
export const VPDocFooterLastUpdated = function (props: any) {
  const { theme, page, lang: pageLang } = useData()
  ...
  return function () { ... }          // setup 风格
}

// 或
export const MyComponent = (props: any) => {
  return <div>...</div>
}
```

### 缺陷链

1. `const X = function/arrow` 是 `VariableDeclaration`(`VariableDeclarator`),`FunctionDeclaration` visitor **完全不触发**
2. 编译产物保持裸函数(函数表达式/箭头函数)
3. 运行时 `X` 是函数 → `isComponentVNode` 为 `false` → `document.createElement(X)` → `InvalidCharacterError`(与缺陷 1 相同的崩溃点)

### 修复方向

增加 `VariableDeclarator` visitor,对**大写开头**的 `const X = function/arrow` 组件同样包装:

```js
VariableDeclarator(path) {
  const node = path.node
  const id = node.id
  if (!t.isIdentifier(id) || !/^[A-Z]/.test(id.name)) return
  const init = node.init
  const isFn = t.isFunctionExpression(init) || t.isArrowFunctionExpression(init)
  if (!isFn) return
  // 复用与 FunctionDeclaration 相同的「return JSX / return 渲染函数」判定与包装逻辑
  // 注意:箭头函数若 body 是表达式(如 (p) => <div/>),需先转成 block body 再包装
}
```

其中箭头函数需区分两种形态:

- **expression body**:`const X = () => <div/>` → 直接把表达式包成 `() => expression` 作为 setup 的返回
- **block body**:`const X = () => { hooks; return function() {...} }` → 与 FunctionDeclaration 相同的判定逻辑

## 现状影响:组件写法被迫分裂

仓库 `src/client/theme-default/components/` 当前统计:

| 写法 | 数量 | 能否自动转换 | 运行时 |
|---|---|---|---|
| 手动 `defineComponent(function(){...})`(setup 风格) | 34 个(如 VPDoc、VPFeatures、VPAlgoliaSearchBox) | 不依赖插件(已手动包) | ✅ |
| 简写裸函数 `function X(){ return <JSX> }` | 多数(如 VPBadge、VPButton、VPFlyout) | ✅ 插件自动包 | ✅ |
| **setup 风格裸函数** `function X(){ ...; return function(){...} }` | 用户新增(如 VPNavBarTranslations) | ❌ 缺陷 1 跳过 | 💥 崩 |
| **函数表达式/箭头** `const X = function/arrow` | 用户新增(如 VPDocFooterLastUpdated) | ❌ 缺陷 2 不处理 | 💥 崩 |

**结论**:同一套 ActView 组件模型下,`defineComponentPlugin` 覆盖面不全,导致「tsx 写裸函数、Babel 自动转」的设计意图无法对所有合法写法生效——部分组件被迫手写 `defineComponent`,与设计矛盾。

## 复现方式

1. 将任一 setup 风格组件改为裸函数,如 `src/client/theme-default/components/VPNavBarTranslations.tsx`:

   ```tsx
   export function VPNavBarTranslations(props: any = {}) {
     ...hooks...
     return function () { return <VPFlyout .../> }
   }
   ```

2. 重新构建 `pnpm build`,启动 `pnpm -F=docs dev`
3. 打开含该组件的页面(如 `zh/reference/site-config.html`),控制台报:

   ```
   [actview] 组件渲染错误: InvalidCharacterError: Failed to execute 'createElement' on 'Document':
   The tag name provided ('function VPNavBarTranslations(props = {}) {...}') is not a valid name.
   ```

4. 首页等不含该组件的页面正常。

## 验证要点(修复后)

- setup 风格裸函数组件(`return function(){...}`)编译产物应变为 `export const X = defineComponent(function(){...})`
- 函数表达式/箭头组件(`const X = function/arrow`)同样被包装
- 上述页面不再报 `InvalidCharacterError`,导航栏/文档页正常渲染
- 现有 34 个手动 `defineComponent` 组件与简写裸函数组件不受影响(已能正常转换)

## SSR serializeNode 缺陷(配套修复)

### 现象

插件 1.0.8 对 setup 风格(`return function(){...}`)嵌套包装后,`__setup` 返回**组件对象**:

```js
const X = defineComponent(function (props) {
  ...
  return defineComponent(function () { ... })   // ← setup 返回组件对象
})
```

- **客户端**:`mountComponent` 用 `normalizeSetupResult`(core 1.0.20)把组件对象包成 vnode,正常挂载 ✅
- **SSR**:`serializeNode`(core)里 `render2 = setup(props)` 后,`typeof render2 === "function"` 为 false → `return serializeNode(render2)` → 组件对象**无 `$$typeof`** → `isVNode` 为 false → **渲染空字符串** 💥

实测:`pnpm -F=docs build` 后 `<div id="app"></div>` 全空,HTML 从 20KB 缩到 1.9KB。

### 修复(core `serializeNode`)

与客户端一致,对 setup 结果先过 `normalizeSetupResult`:

```js
render2 = normalizeSetupResult(
  typeof setup === "function" ? setup(props ?? {}) : type(props ?? {})
);
if (typeof render2 === "function") {
  return serializeNode(render2());
}
return serializeNode(render2);
```

`normalizeSetupResult` 对三种情况:

| setup 返回值 | 处理后 | 结果 |
|---|---|---|
| 渲染函数 | 原样返回 | `serializeNode(render2())` → JSX ✅ |
| 组件对象(嵌套) | 包成 `() => vnode(type: 组件)` | `serializeNode(vnode)` → 递归挂载子组件 ✅ |
| 其他/null | `() => null` | 渲染空 ✅ |

### 验证

- `pnpm -F=docs build` 产物恢复(HTML 20.8KB,nav/h1 正常)
- 带参渲染函数(`return function(innerProps){...}` → 嵌套子组件)SSR 正常挂载
- unit 148 全过;dev + playwright 首页/guide 渲染与主题切换正常、无页面错误

### 注意(不要做的事)

**不要**把插件 `isRenderFn` 分支改成"渲染函数原样保留"(去掉 `wrapComponentFn(ret)` 嵌套)——那会废掉**带参渲染函数**(子组件)场景:渲染器 `instance.render()` 无参调用,`innerProps` 变 undefined、内部 setup 失效。正确做法是保持嵌套 + 修 SSR。
