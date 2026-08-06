import { defineComponent } from 'actview'
import type { DefaultTheme } from 'actpress/theme'
import { useData } from '../composables/data'
import { VPNavBarMenuGroup } from './VPNavBarMenuGroup'
import { VPNavBarMenuLink } from './VPNavBarMenuLink'

// 显式 defineComponent：render 内允许早退 return null（Babel 函数组件转换
// 只支持"最后一个 return 是 JSX"的写法）
export const VPNavBarMenu = defineComponent(function (props: any) {
  const { theme } = useData()

  return function () {
    const nav = theme.value.nav ?? []
    if (!nav.length) return null

    return (
      <nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu">
        <span id="main-nav-aria-label" class="visually-hidden">
          Main Navigation
        </span>
        {nav.map((item: DefaultTheme.NavItem) => {
          const key = JSON.stringify(item)
          if ('link' in item) {
            return (
              <VPNavBarMenuLink
                key={key}
                item={item as DefaultTheme.NavItemWithLink}
              />
            )
          }
          if ('component' in item) {
            const Comp: any = (item as DefaultTheme.NavItemComponent).component
            const compProps = (item as DefaultTheme.NavItemComponent).props
            return <Comp key={key} {...(compProps ?? {})} />
          }
          return (
            <VPNavBarMenuGroup
              key={key}
              item={item as DefaultTheme.NavItemWithChildren}
            />
          )
        })}
      </nav>
    )
  }
})
