---
outline: deep
description: Ensure your VitePress theme components and custom code are compatible with server-side rendering.
---

# SSR Compatibility

VitePress pre-renders the app in Node.js during the production build (static generation, no SSR server). This means all custom code in theme components are subject to static-generation compatibility.

The rule of thumb is to only access browser / DOM APIs in `onMounted` (or event handlers), never in `setup`/render.

## `<ClientOnly>`

If you are using or demoing components that are not SSR-friendly (for example, contain custom directives), you can wrap them inside the built-in `<ClientOnly>` component:

```md
<ClientOnly>
  <NonSSRFriendlyComponent />
</ClientOnly>
```

## Libraries that Access Browser API on Import

Some components or libraries access browser APIs **on import**. To use code that assumes a browser environment on import, you need to dynamically import them.

### Importing in Mounted Hook

```tsx
<script lang="ts" setup>
import { onMounted } from 'actview'

onMounted(() => {
  import('./lib-that-access-window-on-import').then((module) => {
    // use code
  })
})
</script>
```

### Conditional Import

You can also conditionally import a dependency using the `import.meta.env.SSR` flag (part of [Vite env variables](https://vitejs.dev/guide/env-and-mode.html#env-variables)):

```js
if (!import.meta.env.SSR) {
  import('./lib-that-access-window-on-import').then((module) => {
    // use code
  })
}
```

Since [`Theme.enhanceApp`](./custom-theme#theme-interface) can be async, you can conditionally import and register Vue plugins that access browser APIs on import:

```js [.vitepress/theme/index.js]
/** @type {import('@actview/press').Theme} */
export default {
  // ...
  async enhanceApp({ app }) {
    if (!import.meta.env.SSR) {
      const plugin = await import('plugin-that-access-window-on-import')
      app.use(plugin.default)
    }
  }
}
```

If you're using TypeScript:
```ts [.vitepress/theme/index.ts]
import type { Theme } from '@actview/press'

export default {
  // ...
  async enhanceApp({ app }) {
    if (!import.meta.env.SSR) {
      const plugin = await import('plugin-that-access-window-on-import')
      app.use(plugin.default)
    }
  }
} satisfies Theme
```

### `defineClientComponent`

VitePress provides a convenience helper for importing Vue components that access browser APIs on import.

```tsx
<script lang="ts" setup>
import { defineClientComponent } from '@actview/press'

const ClientComp = defineClientComponent(() => {
  return import('component-that-access-window-on-import')
})
</script>

<template>
  <ClientComp />
</template>
```

You can also pass props/children/slots to the target component:

```tsx
<script lang="ts" setup>
import { defineClientComponent } from '@actview/press'

const ClientComp = defineClientComponent(
  () => import('component-that-access-window-on-import'),
  // ActView 版忽略 props/children/slots 参数（lazy 实现），如需透传请在
  // 使用处直接传 JSX 属性
  () => {
    console.log('component loaded')
  }
)
</script>

<ClientComp />
```The target component will only be imported in the mounted hook of the wrapper component.
