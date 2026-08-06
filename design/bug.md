# Bug 记录

> 本文件记录「已定位、暂未修复（或待 JSX-Demo 侧修复）」的 bug。每条含：场景 → 现象 → 根因 → 修复方向。

---

## BUG-001 · `[actview] 生命周期钩子只能在组件 setup 中调用`（core renderToString 缺 currentInstance）

**状态**：已定位，未修复（core 侧，JSX-Demo 待修）

### 场景

- 静态生成（`vitepress build`）：构建阶段每个页面执行 `renderToString(VitePressApp)`（`src/client/app/ssr.ts`）时。
- 或任何在 **node 环境（无 document）** 调用组件 setup 渲染的场景。
- 触发条件：组件 setup 里调用了生命周期钩子（`onMounted` / `onUnmounted` 等）——本仓库所有用了 `onMounted`/`onUnmounted` 的主题组件都会触发（VPNavBarSearch、VPSidebarGroup、VPLocalNavOutlineDropdown、useCopyCode 相关等）。

### 现象

构建日志反复输出（每个含钩子的组件一次）：

```
[actview] 生命周期钩子只能在组件 setup 中调用
```

无害（钩子回调不注册、不执行），但噪音大；且掩盖了真正的问题定位（见 BUG-002 的排查过程——该警告与 `document is not defined` 崩溃同时出现，干扰定位）。

### 根因

`@actview/core` 的 `renderToString` → `serializeNode`（`index.js` 约 1510 行）组件分支：

```js
const setup = type.__setup;
const render2 = typeof setup === "function" ? setup(props ?? {}) : type(props ?? {});
```

直接调用 `setup(props)`，**没有 `setCurrentInstance(instance)`**（与 `mountComponent` 不同——后者有 `setCurrentInstance(instance)` / `setCurrentInstance(null)` 包裹）。

而 `onMounted` 等生命周期钩子的实现依赖 `getCurrentInstance()`：

```js
function onMounted(fn) {
  const instance = getCurrentInstance();
  if (!instance) {
    console.warn("[actview] 生命周期钩子只能在组件 setup 中调用");
    return;
  }
  ...
}
```

`currentInstance` 为 `null` → 警告 + 钩子被丢弃。

### 影响

- 当前：仅警告噪音（钩子回调在 SSR/静态生成中本就不该执行，丢弃行为正确）。
- 潜在：若未来 `renderToString` 需要支持「组件 setup 依赖 currentInstance 的逻辑」（如 `provide/inject` 等价物、`useId` 等），没有 currentInstance 会直接错误。

### 修复方向（JSX-Demo 侧）

`serializeNode` 的组件分支在调用 `setup(props)` 时建立最小 currentInstance 上下文：

```js
// 参考 mountComponent 的做法：
setCurrentInstance(instance);          // 需要先构造最小 instance（可简化：{ props, ... }）
const render2 = setup(props ?? {});
setCurrentInstance(null);
```

注意：

- **不应执行 mounted 钩子**（静态生成/SSR 语义：setup + render 即可，与 Vue SSR 一致）。
- 若 setup 内部 `onMounted(fn)` 被调用——有了 currentInstance 后钩子会注册到 instance.mounted——`renderToString` 结束后这些钩子**不应被 flush**（或直接丢弃），避免 node 环境执行 DOM 操作。
- 建议：`serializeNode` 用独立的轻量 instance（不触发 `invokeHooks`），或给 lifecycle 钩子加「是否渲染上下文」判断。

### 验证

- 修复后：`vitepress build docs` 不再输出该警告（其他警告如 Babel deopt 除外）。
- 回归：`renderToString` 产物不变（组件树序列化正确）；客户端 `createApp` 渲染的 mounted 钩子行为不变。

---

## BUG-002 · 语言切换时 `VPNavBarExtra .group.translations` 的 `trans-title` DOM 累积（core 多次渲染下 unmount 移除错误节点）

**状态**：已定位，未修复（core 侧，JSX-Demo 待修）

### 场景

- `dev`（真实浏览器，`@actview/core@1.0.16`）。
- 桌面端导航栏 `VPNavBarExtra`（extra 菜单）——鼠标悬停展开 → 点击语言链接切换语言（en ↔ zh），**切换前菜单保持展开状态**。
- 注意：**不是** `VPNavBarTranslations`（单独的语言 flyout），是 `VPNavBarExtra` 里的 `.group.translations` 区块（`src/client/theme-default/components/VPNavBarExtra.tsx`）。

### 现象

每次切换语言，`.group.translations` 内的 `<p class="trans-title">` **净增 1 个**（不随切换替换）：

```
初始（en 页）  : <p>English</p> <VPMenuLink href=/zh/>
切到 zh        : <p>English</p> <p>简体中文</p> <VPMenuLink href=/>        ← 2 个 p
切回 en        : <p>English</p> <p>简体中文</p> <p>English</p> ...        ← 3 个 p
再切 zh        : 4 个 p ...
```

- `VPMenuLink`（有 key）恒为 1 个、内容正确替换 → **不累积**。
- `localeLinks` 数组本身正常（watch 输出无累积）→ 排除数据层。
- 加 `key="trans-title"` 后**仍累积** → 不是「无 key 节点」的简单问题。

### 根因（@actview/core）

语言切换触发 `VPNavBarExtra` **多次重渲染**（route.data / localeIndex / site 响应式分批更新，真实浏览器异步调度分多次；happy-dom 同步 flush 合并为一次，故 happy-dom 复现不了）。

每次重渲染，`patchKeyedChildren` 对 `.group.translations` 的 children `[p(无 key), VPMenuLink(有 key)]` 执行 **mount 新 p + unmount 旧 p**。给 core 注入日志证实 unmount 被调用且 el 非空：

```
[keyed] UNMOUNT idx 0 key null type p el true
[unmount] collectDomEls 1        ← el 非空、收集到 1 个 DOM 节点
```

但切换后旧 p 仍残留、新 p 追加（MutationObserver + innerHTML dump 证实）。**结论**：`unmount` 里 `removeChild(vnode.el)` 移除的节点**不是实际残留的那个节点**——多次连续渲染间 **vnode.el 与实际 DOM 脱节**（vnode 树引用错乱），旧节点未被真正移除。

有 key 的 `VPMenuLink` 因 keyed 匹配走 `patch` 更新同一节点（不 mount+unmount），故不受影响。

### 触发路径（组件结构）

```
VPNavBarExtra (defineComponent, useLangs)
  └─ <VPFlyout>                          ← 组件，props.children 透传
      └─ <VPMenu items={undefined}>      ← 组件，children = props.children
          └─ {cond ? <div class="group translations">
              <p class="trans-title">    ← 无 key，累积
              {localeLinks.map(<VPMenuLink key={locale.link}>)}  ← 有 key，正常
```

关键：children 经两层组件 props 透传 + 条件渲染 + 短时间连续多次响应式更新。

### 影响

- 语言菜单选项无限累积，菜单 DOM 越来越大，最终影响交互与性能。
- 仅 `VPNavBarExtra` 的语言区块受影响；`VPNavBarTranslations`（单独 flyout）实测正常。

### 修复方向（JSX-Demo 侧）

核心是保证 **patch / mount / insertBefore 移动 DOM 后 vnode.el 与实际 DOM 保持同步**，unmount 能命中正确的节点：

1. 检查 `patchKeyedChildren` / `patchChildren` 的每个分支：`mountVNode`、`patch`、`insertBefore` 移动节点后，对应 vnode 的 `el`（及组件 `vnode.el` / `subTree.el`）是否更新。
2. 重点验证「同一组件短时间连续多次 update（queueJob 分批 flush）」时，`oldList`（`oldVnode.__avChildren`）里的 vnode 与 DOM 的对应关系是否错位。
3. 混合列表（无 key 元素 + 有 key 组件）是必现组合；unmount 时建议「keyed 索引 + el」双保险定位。

### 复现（JSX-Demo 侧最小用例）

```tsx
// 混合列表：无 key 的 <p> + 有 key 的 <span>，连续 2+ 次切换
const lang = ref('en')
<div>
  <p class="title">{lang.value === 'en' ? 'English' : '中文'}</p>
  {lang.value === 'en' ? <span key="zh">zh</span> : <span key="en">en</span>}
</div>
// lang: 'en' → 'zh' → 'en' → 'zh'，每次切换后断言 p 数量恒为 1
```

注意：**happy-dom 不重现**（同步 flush 合并渲染），需真实浏览器（playwright）验证。

### 验证

- 修复后：`dev` 下语言连续切换 5+ 次，`.group.translations .trans-title` 数量恒为 1。
- 回归：`pnpm test:unit`（148）+ `tsc -p src/client`；其他 keyed 列表（导航菜单、sidebar）不回归。
