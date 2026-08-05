import { createElement } from '@actview/jsx'
import { defineComponent, onMounted, watch } from 'actview'
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
      contentProps,
      route.component
        ? createElement(route.component, null)
        : '404 Page Not Found'
    )
  }
})
