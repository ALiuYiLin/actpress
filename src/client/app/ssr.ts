// static-generation entry（node 构建期使用）
//
// Vue 原版用 vue/server-renderer 渲染整棵 app 树；ActView 版直接对
// VitePressApp 根组件 VNode 调用 renderToString（纯函数，无 DOM 依赖）。
// renderToString 对组件递归调用 __setup(props)()，onMounted 等副作用
// 不执行；Layout 树中的浏览器访问均有 inBrowser 守卫（见 composables）。
//
// teleports/vpSocialIcons：ActView 无 SSR teleports 收集，静态生成阶段
// 不注入 Teleport 内容，返回空集合以对齐 SSGContext 契约。

import { renderToString } from 'actview'
import { createElement } from '@actview/jsx'
import type { SSGContext } from '../shared'
import { createApp, VitePressApp } from './index'

export async function render(path: string): Promise<SSGContext> {
  const { router } = await createApp()
  await router.go(path)
  const vnode = createElement(VitePressApp, null)
  const content = renderToString(vnode)
  return { content, teleports: {}, vpSocialIcons: new Set<string>() }
}
