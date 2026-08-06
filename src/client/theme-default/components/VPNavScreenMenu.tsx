import { defineComponent } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { useData } from '../composables/data'
import { VPNavScreenMenuGroup } from './VPNavScreenMenuGroup'
import { VPNavScreenMenuLink } from './VPNavScreenMenuLink'

export const VPNavScreenMenu = defineComponent(function () {
  const { theme } = useData()

  return function () {
    const nav = theme.value.nav
    if (!nav) return null

    return (
      <nav class="VPNavScreenMenu">
        {nav.map((item) => {
          const key = JSON.stringify(item)
          if ('link' in item) {
            return (
              <VPNavScreenMenuLink
                key={key}
                item={item as DefaultTheme.NavItemWithLink}
              />
            )
          }
          if ('component' in item) {
            const Comp: any = (item as DefaultTheme.NavItemComponent).component
            return (
              <Comp
                key={key}
                {...(item as DefaultTheme.NavItemComponent).props}
                screen-menu
              />
            )
          }
          const group = item as DefaultTheme.NavItemChildren
          return (
            <VPNavScreenMenuGroup
              key={key}
              text={group.text || ''}
              items={group.items}
            />
          )
        })}
      </nav>
    )
  }
})
