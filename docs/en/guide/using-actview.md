---
description: Use ActView components and page logic directly inside Markdown files in VitePress.
---

# Using ActView in Markdown

In VitePress, each Markdown file is compiled into an [ActView](https://github.com/ALiuYiLin/JSX-Demo) component. This means you can add page-level logic with a `<script lang="ts" setup>` block, define reusable components with a `<script lang="tsx">` block, and reference those components directly in the Markdown body.

The Markdown body itself is compiled to JSX (no template compiler): only **component references** are dynamic — everything else is static HTML. There is no `{{ }}` interpolation and no `v-*` directives.

## Page Logic with `<script lang="ts" setup>`

A `<script lang="ts" setup>` block defines the page's state and logic. Its content goes into the page component's setup function (executed once per mount; refs are reactive):

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

Note that inside the Markdown body (which is JSX), you reference variables from the setup block with **explicit `.value`** — there is no template auto-unwrapping.

## Reusable Components with `<script lang="tsx">`

A `<script lang="tsx">` block holds **named exports** that live at the module top level. Any component exported there can be used in the Markdown body by its name:

````md
<script lang="tsx">
export function MyButton() {
  return <button className="mybutton">Click</button>
}
</script>

<MyButton size="lg" />
````

- The tag name must match a named export and be **PascalCase** (`MyButton`), otherwise it is treated as an unknown component (a compile-time warning is emitted).
- **Static attributes are passed through** to the component: `<MyButton size="lg" />` renders `MyButton` with `size: 'lg'`.
- Components written as plain functions (`export function X()`) are wrapped with `defineComponent` at compile time.

## Using Components from Imports

Components used by only a few pages can be imported in the setup or tsx block:

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

## What Is NOT Supported

Vue template features are **not** compiled in Markdown — they render as literal text/attributes:

| Vue feature | Status |
| --- | --- |
| `{{ expr }}` interpolation | ❌ literal text |
| `v-if` / `v-for` / `v-html` / `v-bind` / `v-on` directives | ❌ literal attributes |
| `<style>` / `<style scoped>` / `<style module>` blocks | ❌ compile-time warning (use global styles or component styles) |
| String `onclick="..."` attributes | ❌ dropped with a warning (JSX events must be functions) |

Use `<script lang="ts" setup>` variables + JSX expressions instead:

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

## Using Components in Headers

You can use components in Markdown headers, but the parsed header (used for sidebar and document title) strips the HTML:

| Markdown | Output HTML | Parsed Header |
| --- | --- | --- |
| `# text <Tag/>` | `<h1>text <Tag/></h1>` | `text` |
| `# text \`<Tag/>\`` | `<h1>text <code>&lt;Tag/&gt;</code></h1>` | `text <Tag/>` |

The HTML wrapped by `<code>` is displayed as-is; only the HTML that is **not** wrapped is parsed as a component reference.

::: tip
The output HTML is produced by [Markdown-it](https://github.com/Markdown-it/Markdown-it), while the parsed headers are handled by VitePress (and used for both the sidebar and document title).
:::

## VS Code IntelliSense Support

ActView components are TSX. To get IntelliSense for `.md` files, configure your editor to treat Markdown as TSX — e.g. with the [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) plugin plus a `tsconfig` that includes Markdown files:

1. Add `.md` to `include` and `vueCompilerOptions.vitePressExtensions` in `tsconfig.json`:

::: code-group
```json [tsconfig.json]
{
  "include": [
    "docs/**/*.ts",
    "docs/**/*.md",
  ],
  "vueCompilerOptions": {
    "vitePressExtensions": [".md"],
  },
}
```
:::

2. Add `markdown` to the `vue.server.includeLanguages` option in `.vscode/settings.json`:

::: code-group
```json [.vscode/settings.json]
{
  "vue.server.includeLanguages": ["vue", "markdown"]
}
```
:::
