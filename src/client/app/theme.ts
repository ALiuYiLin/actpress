import type { App, Component as VueComponent } from 'vue'
import type { Awaitable, Ref, SiteData } from '../shared'
import type { Router } from './router'

export interface EnhanceAppContext {
  app: App
  router: Router
  siteData: Ref<SiteData>
}

/** 组件类型：ActView defineComponent 产物（{ __setup }）或兼容对象 */
export type Component = Record<string, any> | ((...args: any[]) => any)

export interface Theme {
  Layout?: Component
  enhanceApp?: (ctx: EnhanceAppContext) => Awaitable<void>
  extends?: Theme

  /**
   * @deprecated can be replaced by wrapping layout component
   */
  setup?: () => void

  /**
   * @deprecated Render not found page by checking `useData().page.value.isNotFound` in Layout instead.
   */
  NotFound?: VueComponent
}
