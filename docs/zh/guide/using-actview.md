---
description: 在 VitePress 的 Markdown 文件中直接使用 ActView 组件与页面逻辑。
---

# 在 Markdown 中使用 ActView {#using-actview-in-markdown}

在 VitePress 中，每个 Markdown 文件都被编译成一个 [ActView](https://github.com/ALiuYiLin/JSX-Demo) 模块。所有 `<script>` 块（无论 `lang="tsx"`、`setup` 与否）的内容都会**提升到模块顶层，共享同一作用域**——你在里面定义的变量、函数、组件，都可以在 Markdown 正文中按名称引用。

Markdown 正文本身被编译为 JSX（没有模板编译器）：只有**组件引用**是动态的——其余都是静态 HTML。**没有 `{{ }}` 插值，也没有 `v-*` 指令。**需要动态内容时，在 `<script>` 块中定义组件，正文用组件引用。

## script 块共享作用域

下面这段 Markdown 就写在当前文档的正文里——它真实编译、真实渲染：

<script lang="ts" setup>
import { ref } from 'actview'
const count = ref(0)
</script>

<script lang="tsx">
export function Counter() {
  return (
    <button class="counter-btn" onclick={() => count.value++}>
      {count.value}
    </button>
  )
}
</script>

<Counter />

<style>
.counter-btn {
  padding: 8px 20px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  background: #42b883;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(66, 184, 131, 0.4);
}
.counter-btn:hover {
  background: #33a06f;
}
</style>

点击上面的按钮试试——它就是当前页面里真实运行的 ActView 组件。它由两个 `<script>` 块和一个 `<style>` 块共同构成：

````md
<script lang="ts" setup>
import { ref } from 'actview'
const count = ref(0)
</script>

<script lang="tsx">
export function Counter() {
  return <button onclick={() => count.value++}>{count.value}</button>
}
</script>

<Counter />
````

编译后等价于这样一个 `.tsx` 模块：

```tsx
// ---- 各 <script> 块内容合并到模块顶层，共享同一作用域 ----
import { ref } from 'actview'

const count = ref(0)              // <script> 块的内容 → 模块顶层

export function Counter() {       // <script> 块的具名导出 → 模块顶层
  return <button onclick={() => count.value++}>{count.value}</button>
}

// ---- 页面默认组件：渲染 Markdown 正文，引用具名组件 ----
import { defineComponent } from 'actview'
export default defineComponent(function () {
  return () => (
    <div>
      <h1>Markdown Content</h1>
      <Counter />
    </div>
  )
})
```

关键点：

- **共享作用域**：`Counter` 可以直接闭包引用 `<script>` 块里的 `count`，点击按钮会更新组件。
- 具名导出组件（`export function X`）在编译期被 `defineComponent` 包裹（由 `@actview/plugin` 完成），因此可以直接在正文中使用。
- 页面默认组件由编译器自动生成，渲染 Markdown 正文；正文中出现的 PascalCase 标签会被解析为具名导出组件的引用。

## 页面逻辑与组件状态

最常见的用法：在 `<script>` 块里同时定义状态和读取/修改该状态的组件。动态内容全部写在组件内，正文只放组件引用。下面同样是真实运行的：

<script lang="ts" setup>
import { ref } from 'actview'
const count2 = ref(0)
</script>

<script lang="tsx">
export function Counter2() {
  return (
    <p>
      当前计数: {count2.value}
      <button onclick={() => count2.value++}>Increment</button>
    </p>
  )
}
</script>

<Counter2 />

````md
<script lang="ts" setup>
import { ref } from 'actview'
const count2 = ref(0)
</script>

<script lang="tsx">
export function Counter2() {
  return (
    <p>
      当前计数: {count2.value}
      <button onclick={() => count2.value++}>Increment</button>
    </p>
  )
}
</script>

<Counter2 />
````

- 正文是静态的，**不能**写 `{count2.value}` 之类的表达式（会作为字面文本渲染）。需要展示状态时，在组件内部写 JSX：`{count2.value}` 在组件里是合法的。
- 事件绑定必须在组件内以 JSX 函数形式书写：`onclick={() => count2.value++}`。

## 可复用组件与属性透传

`<script lang="tsx">` 块持有**具名导出**，位于模块顶层。任何在这里导出的组件都可以在 Markdown 正文中按名称使用，并支持静态属性透传。下面真实渲染一个带属性透传的按钮：

<script lang="tsx">
export function MyButton(props: any) {
  return <button className="mybutton" {...props}>Click</button>
}
</script>

<MyButton size="lg" />

````md
<script lang="tsx">
export function MyButton(props: any) {
  return <button className="mybutton" {...props}>Click</button>
}
</script>

<MyButton size="lg" />
````

- 标签名必须匹配一个具名导出，且为 **PascalCase**（`MyButton`），否则会被当作未知组件（编译期发出警告）。
- **静态属性会透传给组件**：`<MyButton size="lg" />` 以 `size: 'lg'` 渲染 `MyButton`。
- 以普通函数（`export function X()`）写成的组件会在编译期被 `defineComponent` 包裹。

## 使用 `<script lang="tsx" setup>` 写 JSX 逻辑

如果页面逻辑本身需要书写 JSX 表达式，可以直接用 `<script lang="tsx" setup>` 组合写法。定义后仍需通过组件或正文中的组件引用使用——这里定义一个渲染 `greeting` 的组件。注意：`Greeting` 返回的是变量（`return greeting`），无法被 `@actview/plugin` 的裸函数转换识别，需要显式用 `defineComponent` 包裹：

<script lang="tsx" setup>
import { defineComponent } from 'actview'
const greeting = <strong>Hello</strong>
export const Greeting = defineComponent(function () {
  return () => greeting
})
</script>

<Greeting />

````md
<script lang="tsx" setup>
import { defineComponent } from 'actview'
const greeting = <strong>Hello</strong>
export const Greeting = defineComponent(function () {
  return () => greeting
})
</script>

<Greeting />
````

::: tip
`export function X() { return <JSX /> }` 这种**直接返回 JSX 字面量**的组件会被 `@actview/plugin` 自动包裹成 `defineComponent`；但如果组件返回的是**变量或表达式**（如 `return greeting`），编译器无法静态判断它是不是组件，需要用 `defineComponent` 显式包裹。
:::

## 使用导入的组件

仅少数页面用到的组件可以在 `<script>` 块中导入。例如当前文档在正文中真实渲染了 `ModalDemo` 组件：

<script lang="tsx">
import { ModalDemo } from '../../components/ModalDemo'
</script>

<ModalDemo />

````md
<script lang="tsx">
import { ModalDemo } from '../../components/ModalDemo'
</script>

<ModalDemo />
````

## 不支持的语法

Vue 模板特性**不会**在 Markdown 中被编译——它们会作为字面文本/属性渲染：

| Vue 特性 | 状态 |
| --- | --- |
| `{{ expr }}` 插值 | ❌ 字面文本 |
| `v-if` / `v-for` / `v-html` / `v-bind` / `v-on` 指令 | ❌ 字面属性 |
| 字符串 `onclick="..."` 属性 | ❌ 丢弃并警告（JSX 事件必须是函数） |

请把这些逻辑放进 `<script lang="tsx">` 组件内部：

````md
<script lang="tsx">
import { ref } from 'actview'
const items = ref(['a', 'b', 'c'])

export function ItemList() {
  return (
    <ul>
      {items.value.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  )
}
</script>

<ItemList />
````

## 在标题中使用组件

可以在 Markdown 标题中使用组件，但解析出的标题（用于侧边栏与文档标题）会剥离 HTML：

| Markdown | 输出 HTML | 解析出的标题 |
| --- | --- | --- |
| `# text <Tag/>` | `<h1>text <Tag/></h1>` | `text` |
| `# text \`<Tag/>\`` | `<h1>text <code>&lt;Tag/&gt;</code></h1>` | `text <Tag/>` |

被 `<code>` 包裹的 HTML 会原样显示；未被包裹的 HTML 才会被解析为组件引用。

::: tip
输出 HTML 由 [Markdown-it](https://github.com/Markdown-it/Markdown-it) 生成，而解析出的标题由 VitePress 处理（用于侧边栏与文档标题）。
:::

## VS Code IntelliSense 支持

ActView 组件是 TSX。要为 `.md` 文件获得 IntelliSense，请将编辑器配置为把 Markdown 当作 TSX 处理——例如使用 [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 插件，并在 `tsconfig` 中包含 Markdown 文件：

1. 在 `tsconfig.json` 的 `include` 中加入 `.md`：

::: code-group
```json [tsconfig.json]
{
  "include": [
    "docs/**/*.ts",
    "docs/**/*.md"
  ]
}
```
:::

2. 在 `.vscode/settings.json` 的 `vue.server.includeLanguages` 中加入 `markdown`：

::: code-group
```json [.vscode/settings.json]
{
  "vue.server.includeLanguages": ["vue", "markdown"]
}
```
:::
