import '../styles/components/VPNavBarMenu.css?scoped'
import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { useData } from '../composables/data'
import { VPNavBarMenuGroup } from './VPNavBarMenuGroup'
import { VPNavBarMenuLink } from './VPNavBarMenuLink'

export function VPNavBarMenu(props: any) {
  const { theme } = useData()

  const nav = computed(() => theme.value.nav ?? [])

  return nav.value.length ? (
    <nav aria-labelledby="main-nav-aria-label" class="VPNavBarMenu">
      <span id="main-nav-aria-label" class="visually-hidden">
        Main Navigation
      </span>
      {nav.value.map((item: DefaultTheme.NavItem) => {
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
  ) : null
}
