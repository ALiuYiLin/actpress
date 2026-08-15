---
description: ActPress 是一个基于 ActView 和 Vite 的静态站点生成器，专为构建快速、以内容为中心的网站而设计。
---

# ActPress 是什么？ {#what-is-actpress}

ActPress 是一个[静态站点生成器](https://en.wikipedia.org/wiki/Static_site_generator) (SSG)，基于 ActView 和 Vite，专为构建快速、以内容为中心的站点而设计。简而言之，ActPress 获取用 Markdown 编写的内容，对其应用主题，并生成可以轻松部署到任何地方的静态 HTML 页面。

<div class="tip custom-block" style="padding-top: 8px">

只是想尝试一下？跳到[快速开始](./getting-started)。

</div>

## 使用场景 {#use-cases}

- **文档**

  ActPress 附带一个专为技术文档设计的默认主题。你现在正在阅读的这个页面以及 [Vite](https://vitejs.dev/)、[Rollup](https://rollupjs.org/)、[Pinia](https://pinia.vuejs.org/)、[VueUse](https://vueuse.org/)、[Vitest](https://vitest.dev/)、[D3](https://d3js.org/)、[UnoCSS](https://unocss.dev/)、[Iconify](https://iconify.design/) [等](https://github.com/search?q=/%22vitepress%22:+/+path:/(?:package%7Cdeno)%5C.jsonc?$/+NOT+is:fork+NOT+is:archived&type=code)文档都是基于这个主题的。

  [Vue.js 官方文档](https://cn.vuejs.org/)也是基于 VitePress 的。但是为了可以在不同的翻译文档之间切换，它自定义了自己的主题。

- **博客、档案和营销网站**

  ActPress 支持[完全的自定义主题](./custom-theme)，具有标准 Vite + ActView 应用程序的开发体验。基于 Vite 构建还意味着可以直接利用其生态系统中丰富的 Vite 插件。此外，ActPress 提供了灵活的 API 来[加载数据](./data-loading) (本地或远程)，也可以[动态生成路由](./routing#dynamic-routes)。只要可以在构建时确定数据，就可以使用它来构建几乎任何东西。

  [Vue.js 官方博客](https://blog.vuejs.org/)是一个简单的博客页面，它根据本地内容生成其索引页面。

## 开发体验 {#developer-experience}

ActPress 旨在使用 Markdown 生成内容时提供出色的开发体验。

- **[Vite 驱动](https://cn.vitejs.dev/)**：即时服务器启动，始终立即反映 (<100ms) 编辑变化，无需重新加载页面。

- **[内置 Markdown 扩展](./markdown)**：frontmatter、表格、语法高亮……应有尽有。具体来说，ActPress 提供了许多用于处理代码块的高级功能，使其真正成为技术文档的理想选择。

- **[ActView 增强的 Markdown](./using-actview)**：每个 Markdown 页面都会被编译为 ActView 组件：通过 `<script lang="ts" setup>` 添加页面逻辑，用 `<script lang="tsx">` 定义可复用组件，并直接在正文中引用，从而在静态内容中嵌入交互性。

## 性能 {#performance}

与许多传统的 SSG 不同，每次导航都会导致页面完全重新加载，ActPress 生成的网站在初次访问时提供静态 HTML，但它变成了[单页应用程序](https://en.wikipedia.org/wiki/Single-page_application)（SPA）进行站点内的后续导航。我们认为，这种模式为性能提供了最佳平衡：

- **快速的初始加载**

  对任何页面的初次访问都将会是静态的、预呈现的 HTML，以实现极快的加载速度和最佳的 SEO。然后页面加载一个 JavaScript bundle，将页面变成 ActView SPA (这被称为“激活”)。与 SPA 激活缓慢的常见假设不同，由于 ActView 良好的原始性能和编译优化，这个过程实际上非常快。在 [PageSpeed Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fvitepress.dev%2F) 上，典型的 ActPress 站点即使在网络速度较慢的低端移动设备上也能获得近乎完美的性能分数。

- **加载完成后可以快速切换**

  更重要的是，SPA 模型在首次加载后能够提升用户体验。用户在站点内导航时，不会再触发整个页面的刷新。而是通过获取并动态更新页面的内容来实现切换。ActPress 还会自动预加载视口范围内链接对应的页面片段。这样一来，大部分情况下，用户在加载完成后就能立即浏览新页面。

- **高效的交互**

  为了能够嵌入静态 Markdown 中的动态 ActView 部分，每个 Markdown 页面都被处理为 ActView 组件并编译成 JavaScript。这听起来可能效率低下，但 ActView 编译器足够聪明，可以将静态和动态部分分开，从而最大限度地减少激活成本和有效负载大小。对于初始的页面加载，静态部分会自动从 JavaScript 有效负载中删除，并在激活期间跳过。

## VuePress 又是什么？ {#what-about-vuepress}

ActPress 灵感来源于 VuePress。最初的 VuePress 1 基于 Vue 2 和 webpack。ActPress 则基于 ActView 和 Vite 开发，提供了更好的开发体验、更好的生产性能、更精美的默认主题和更灵活的自定义 API。

ActPress 和 VuePress 1 的 API 区别主要在于主题和自定义。如果你使用的是 VuePress 1 的默认主题，应该可以很方便地迁移到 ActPress。

并行维护两个 SSG 是难以持续的，因此 Vue 团队决定将 VitePress 作为长期维护并推荐的 SSG。现在 VuePress 1 已被弃用，VuePress 2 已移交给 VuePress 社区团队进行进一步开发和维护。
