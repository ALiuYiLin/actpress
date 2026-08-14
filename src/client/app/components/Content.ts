import { createElement } from '@actview/jsx'
import { defineComponent, onMounted, onUpdated, watch } from 'actview'
import { useData } from '../data'
import { useRoute } from '../router'
import { contentUpdatedCallbacks } from '../utils'

const runCbs = () => contentUpdatedCallbacks.forEach((fn) => fn())

/**
 * Content — 渲染当前路由的页面组件。
 * ActView 版：route.component 是 ActView 组件（{ __setup }），
 * 直接 createElement 渲染；内容更新回调在挂载与页面数据变化时触发。
 */
export const Content = defineComponent(function (props: any) {
  const route = useRoute()
  const { frontmatter, site } = useData()

  onMounted(runCbs)
  // 页面组件是 lazy 异步加载：ActView 的 mounted 钩子在异步子树就绪前触发
  // （core mountComponent：首次 update 后立即 invokeHooks(mounted)），此时标题
  // 尚未挂载，getHeaders 会返回空。onUpdated 覆盖异步 resolve 后的 update，
  // 确保 onContentUpdated（outline/sidebar 等）在内容真正进入 DOM 后执行。
  onUpdated(runCbs)
  // ActView watch 无 deep 选项；frontmatter 在路由切换时为整体替换（computed 引用变化），
  // 与 Vue 版 deep:true 的关键场景一致
  watch(frontmatter, runCbs)

  return function () {
    const as = props.as ?? 'div'
    const contentProps = site.value.contentProps ?? {
      style: { position: 'relative' }
    }
    return createElement(
      as,
      {
        ...contentProps,
        class: [contentProps.class, props.class].filter(Boolean).join(' ')
      },
      route.component
        ? createElement(route.component, null)
        : '404 Page Not Found'
    )
  }
})
