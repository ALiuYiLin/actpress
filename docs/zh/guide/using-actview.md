---
description: 在 VitePress 的 Markdown 文件中直接使用 ActView 组件与页面逻辑。
---

# 在 Markdown 中使用 ActView {#using-actview-in-markdown}

在 VitePress 中，每个 Markdown 文件都被编译成一个 [ActView](https://github.com/ALiuYiLin/JSX-Demo) 组件。你可以用 `<script lang="ts" setup>` 块添加页面级逻辑，用 `<script lang="tsx">` 块定义可复用组件，并在 Markdown 正文中直接引用这些组件。

Markdown 正文本身被编译为 JSX（没有模板编译器）：只有**组件引用**是动态的——其余都是静态 HTML。**没有 `{{ }}` 插值，也没有 `v-*` 指令。**

## 使用 `<script lang="ts" setup>` 添加页面逻辑

`<script lang="ts" setup>` 块定义页面的状态与逻辑。其内容进入页面组件的 setup 函数（每次挂载执行一次；ref 是响应式的）：

````md
---
hello: world
---

<script lang="ts" setup>
import { ref } from 'actview'

const count = ref(0)
const inc = () => count.value++
</script>

# Markdown Content

The count is: {count.value}

<button onclick={inc}>Increment</button>
````

注意：在 Markdown 正文（即 JSX）中引用 setup 块的变量时，需要**显式写 `.value`**——没有模板自动解包。

## 使用 `<script lang="tsx">` 定义可复用组件

`<script lang="tsx">` 块持有**具名导出**，位于模块顶层。任何在这里导出的组件都可以在 Markdown 正文中按名称使用：

````md
<script lang="tsx">
export function MyButton() {
  return <button className="mybutton">Click</button>
}
</script>

<MyButton size="lg" />
````


- 标签名必须匹配一个具名导出，且为 **PascalCase**（`MyButton`），否则会被当作未知组件（编译期发出警告）。
- **静态属性会透传给组件**：`<MyButton size="lg" />` 以 `size: 'lg'` 渲染 `MyButton`。
- 以普通函数（`export function X()`）写成的组件会在编译期被 `defineComponent` 包裹。

## 使用导入的组件

仅少数页面用到的组件可以在 setup 或 tsx 块中导入：

````md
<script lang="tsx">
import CustomComponent from '../components/CustomComponent'
export function MyButton() {
  return <button className="mybutton">Click</button>
}
</script>

<CustomComponent />
<MyButton />
````

## 不支持的语法

Vue 模板特性**不会**在 Markdown 中被编译——它们会作为字面文本/属性渲染：

| Vue 特性 | 状态 |
| --- | --- |
| `{{ expr }}` 插值 | ❌ 字面文本 |
| `v-if` / `v-for` / `v-html` / `v-bind` / `v-on` 指令 | ❌ 字面属性 |
| `<style>` / `<style scoped>` / `<style module>` 块 | ❌ 编译期警告（请使用全局样式或组件样式） |
| 字符串 `onclick="..."` 属性 | ❌ 丢弃并警告（JSX 事件必须是函数） |

请改用 `<script lang="ts" setup>` 变量 + JSX 表达式：

````md
<script lang="ts" setup>
import { ref } from 'actview'
const items = ref(['a', 'b', 'c'])
const count = ref(0)
</script>

<ul>
  {items.value.map((i) => (
    <li key={i}>{i}</li>
  ))}
</ul>

<p>{count.value}</p>
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
