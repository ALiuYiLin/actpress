// ============================================================
// Layout — ActView 版渲染主干（Layout.vue 完整迁移）
//
// 结构对齐 Vue 原版：layout-top 插槽 → VPSkipLink → VPBackdrop →
// VPNav → VPLocalNav → VPSidebar → VPContent → layout-bottom。
// 具名插槽经 props 透传（ActView 无 slot 机制）；screen 状态由
// useNav 内部管理（VPNav/VPSidebar 自读取）；侧边栏开合用
// useSidebarControl（模块级单例）。
// ============================================================

import { Content } from '../app/components/Content'
import { useData } from '../app/data'
import { useSidebarControl } from './composables/sidebar'
import { registerWatchers } from './composables/layout'
import { VPBackdrop } from './components/VPBackdrop'
import { VPContent } from './components/VPContent'
import { VPLocalNav } from './components/VPLocalNav'
import { VPNav } from './components/VPNav'
import { VPSidebar } from './components/VPSidebar'
import { VPSkipLink } from './components/VPSkipLink'

export interface LayoutProps {
  // layout-top / layout-bottom（原具名插槽）
  layoutTop?: any
  layoutBottom?: any
  // VPNav 透传
  navBarTitleBefore?: any
  navBarTitleAfter?: any
  navBarContentBefore?: any
  navBarContentAfter?: any
  navScreenContentBefore?: any
  navScreenContentAfter?: any
  // VPSidebar 透传
  sidebarNavBefore?: any
  sidebarNavAfter?: any
  // VPContent 透传
  pageTop?: any
  pageBottom?: any
  notFound?: any
  homeHeroBefore?: any
  homeHeroInfoBefore?: any
  homeHeroInfo?: any
  homeHeroInfoAfter?: any
  homeHeroActionsAfter?: any
  homeHeroActionsBeforeActions?: any
  homeHeroImage?: any
  homeHeroAfter?: any
  homeFeaturesBefore?: any
  homeFeaturesAfter?: any
  [key: string]: any
}

export function Layout(props: LayoutProps = {}) {
  const { frontmatter } = useData()

  const {
    isOpen: isSidebarOpen,
    open: openSidebar,
    close: closeSidebar
  } = useSidebarControl()

  registerWatchers({ closeSidebar })

  return function () {
    if (frontmatter.value.layout === false) {
      return <Content />
    }

    return (
      <div
        class={['Layout', frontmatter.value.pageClass]
          .filter(Boolean)
          .join(' ')}
      >
        {props.layoutTop}
        <VPSkipLink />
        <VPBackdrop
          class="backdrop"
          show={isSidebarOpen.value}
          onclick={closeSidebar}
        />
        <VPNav
          navBarTitleBefore={props.navBarTitleBefore}
          navBarTitleAfter={props.navBarTitleAfter}
          navBarContentBefore={props.navBarContentBefore}
          navBarContentAfter={props.navBarContentAfter}
          navScreenContentBefore={props.navScreenContentBefore}
          navScreenContentAfter={props.navScreenContentAfter}
        />
        <VPLocalNav open={isSidebarOpen.value} onOpenMenu={openSidebar} />
        <VPSidebar
          open={isSidebarOpen.value}
          sidebarNavBefore={props.sidebarNavBefore}
          sidebarNavAfter={props.sidebarNavAfter}
        />
        <VPContent
          notFound={props.notFound}
          pageTop={props.pageTop}
          pageBottom={props.pageBottom}
          homeHeroBefore={props.homeHeroBefore}
          homeHeroInfoBefore={props.homeHeroInfoBefore}
          homeHeroInfo={props.homeHeroInfo}
          homeHeroInfoAfter={props.homeHeroInfoAfter}
          homeHeroActionsAfter={props.homeHeroActionsAfter}
          homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
          homeHeroImage={props.homeHeroImage}
          homeHeroAfter={props.homeHeroAfter}
          homeFeaturesBefore={props.homeFeaturesBefore}
          homeFeaturesAfter={props.homeFeaturesAfter}
        />
        {props.layoutBottom}
      </div>
    )
  }
}
