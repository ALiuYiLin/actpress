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
