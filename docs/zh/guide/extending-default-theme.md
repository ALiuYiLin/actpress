---
outline: deep
description: 通过自定义 CSS、组件、布局和插槽来定制和扩展 VitePress 默认主题。
---

# 扩展默认主题 {#extending-the-default-theme}

VitePress 默认的主题已经针对文档进行了优化，并且可以进行自定义。请参考[默认主题配置概览](../reference/default-theme-config)获取完整的选项列表。

但是有一些情况仅靠配置是不够的。例如：

1. 需要调整 CSS 样式；
2. 需要修改 Vue 应用实例，例如注册全局组件；
3. 需要通过 layout 插槽将自定义内容注入到主题中；

这些高级自定义配置将需要使用自定义主题来“拓展”默认主题。

::: tip
在继续之前，请确保首先阅读[自定义主题](./custom-theme)以了解其工作原理。
:::

## 自定义 CSS {#customizing-css}

可以通过覆盖根级别的 CSS 变量来自定义默认主题的 CSS：

```js [.vitepress/theme/index.js]
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default DefaultTheme
```

```css
/* .vitepress/theme/custom.css */
:root {
  --vp-c-brand-1: #646cff;
  --vp-c-brand-2: #747bff;
}
```

查看[默认主题 CSS 变量](https://github.com/vuejs/vitepress/blob/main/src/client/theme-default/styles/vars.css)来获取可以被覆盖的变量。

## 使用自定义字体 {#using-different-fonts}

VitePress 使用 [Inter](https://rsms.me/inter/) 作为默认字体，并且将其包含在生成的输出中。该字体在生产环境中也会自动预加载。但是如果要使用不同的字体，这可能不是很好。

为了避免在生成后的输出中包含 Inter 字体，请从 `vitepress/theme-without-fonts` 中导入主题：

```js [.vitepress/theme/index.js]
import DefaultTheme from 'vitepress/theme-without-fonts'
import './my-fonts.css'

export default DefaultTheme
```

```css
/* .vitepress/theme/my-fonts.css */
:root {
  --vp-font-family-base: /* 普通文本字体 */
  --vp-font-family-mono: /* 代码字体 */
}
```

::: warning
如果你在使用像是[团队页](../reference/default-theme-team-page)这样的组件，请确保也从 `vitepress/theme-without-fonts` 中导入它们！
:::

如果字体是通过 `@font-face` 引用的本地文件，它将会被作为资源被包含在 `.vitepress/dist/asset` 目录下，并且使用哈希后的文件名。为了预加载这个文件，请使用 [transformHead](../reference/site-config#transformhead) 构建钩子：

```js [.vitepress/config.js]
export default {
  transformHead({ assets }) {
    // 相应地调整正则表达式以匹配字体
    const myFontFile = assets.find(file => /font-name\.[\w-]+\.woff2/.test(file))
    if (myFontFile) {
      return [
        [
          'link',
          {
            rel: 'preload',
            href: myFontFile,
            as: 'font',
            type: 'font/woff2',
            crossorigin: ''
          }
        ]
      ]
    }
  }
}
```

## 注册全局组件 {#registering-global-components}

```js [.vitepress/theme/index.js]
import DefaultTheme from 'vitepress/theme'

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 注册自定义全局组件
    app.component('MyGlobalComponent' /* ... */)
  }
}
```

如果使用 TypeScript:
```ts [.vitepress/theme/index.ts]
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // 注册自定义全局组件
    app.component('MyGlobalComponent' /* ... */)
  }
} satisfies Theme
```

因为我们使用 Vite，还可以利用 Vite 的 [glob 导入功能](https://cn.vitejs.dev/guide/features.html#glob-import)来自动注册一个组件目录。

## 布局插槽 {#layout-slots}

默认主题的 `<Layout/>` 组件有一些插槽，能够被用来在页面的特定位置注入内容。下面这个例子展示了将一个组件注入到 outline 之前：

```js [.vitepress/theme/index.js]
import DefaultTheme from 'vitepress/theme'
import MyLayout from './MyLayout'

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: MyLayout
}
```

```tsx [.vitepress/theme/MyLayout.tsx]
import { defineComponent } from 'actview'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme

export const MyLayout = defineComponent(function () {
  return function () {
    // ActView 无具名插槽：以 props 透传替代（见下方 LayoutProps 支持列表）
    return <Layout sidebarNavBefore={<div>My custom sidebar top content</div>} />
  }
})
```
也可以使用渲染函数。

```js [.vitepress/theme/index.js]
import { createElement } from '@actview/jsx'
import DefaultTheme from 'vitepress/theme'
import MyComponent from './MyComponent'

export default {
  extends: DefaultTheme,
  Layout(props) {
    // ActView 无具名插槽：DefaultTheme.Layout 的插槽等价物是 props
    //（sidebarNavBefore/sidebarNavAfter/pageTop/pageBottom 等，见 LayoutProps）
    return createElement(DefaultTheme.Layout, {
      ...props,
      sidebarNavBefore: createElement(MyComponent)
    })
  }
}
```

默认主题布局的全部可用插槽如下：

- 当 `layout: 'doc'` (默认) 在 frontmatter 中被启用时：
  - `doc-top`
  - `doc-bottom`
  - `doc-footer-before`
  - `doc-before`
  - `doc-after`
  - `sidebar-nav-before`
  - `sidebar-nav-after`
  - `aside-top`
  - `aside-bottom`
  - `aside-outline-before`
  - `aside-outline-after`
  - `aside-ads-before`
  - `aside-ads-after`
- 当 `layout: 'home'` 在 frontmatter 中被启用时:
  - `home-hero-before`
  - `home-hero-info-before`
  - `home-hero-info`
  - `home-hero-info-after`
  - `home-hero-actions-before-actions`
  - `home-hero-actions-after`
  - `home-hero-image`
  - `home-hero-after`
  - `home-features-before`
  - `home-features-after`
- 当 `layout: 'page'` 在 frontmatter 中被启用时:
  - `page-top`
  - `page-bottom`
- 当未找到页面 (404) 时:
  - `not-found`
- 总是启用:
  - `layout-top`
  - `layout-bottom`
  - `nav-bar-title-before`
  - `nav-bar-title-after`
  - `nav-bar-content-before`
  - `nav-bar-content-after`
  - `nav-screen-content-before`
  - `nav-screen-content-after`

## 使用视图过渡 API

### 关于外观切换 {#on-appearance-toggle}

可以扩展默认主题以在切换颜色模式时提供自定义过渡动画。例如：

```tsx [.vitepress/theme/Layout.tsx]
import { defineComponent } from 'actview'
import DefaultTheme from 'vitepress/theme'

export const Layout = defineComponent(function () {
  return function () {
    return <DefaultTheme.Layout />
  }
})
```

> **ActView 无 `provide`/`inject`**：Vue 版通过 `provide('toggle-appearance', ...)` 自定义外观切换
> 动画的方式在 ActView 中不可用（`VPSwitchAppearance` 的 toggle 逻辑是硬编码的
> `isDark.value = !isDark.value`）。如需自定义切换动画，请 fork
> `VPSwitchAppearance` 并修改其中的 toggle 函数，例如加入
> `document.startViewTransition` 动画；`::view-transition-*` 等全局样式请放入全局 CSS。
结果（**注意！**：画面闪烁、快速闪现、强光刺激）:

<details>
<summary>Demo</summary>

![Appearance Toggle Transition Demo](/appearance-toggle-transition.webp)

</details>

有关视图过渡动画的更多详细信息，请参阅 [Chrome 文档](https://developer.chrome.com/docs/web-platform/view-transitions/)。

### 路由切换时 {#on-route-change}

即将到来。

## 重写内部组件 {#overriding-internal-components}

可以使用 Vite 的 [aliases](https://vitejs.dev/config/shared-options.html#resolve-alias) 来用自定义组件替换默认主题的组件：

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitepress'

export default defineConfig({
  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/VPNavBar\.vue$/,
          replacement: fileURLToPath(
            new URL('./components/CustomNavBar.vue', import.meta.url)
          )
        }
      ]
    }
  }
})
```

想要了解组件的确切名称请参考我们的[源代码](https://github.com/vuejs/vitepress/tree/main/src/client/theme-default/components)。因为组件是内部的，因此在小版本更迭中，它们名字改动的可能性很小。
