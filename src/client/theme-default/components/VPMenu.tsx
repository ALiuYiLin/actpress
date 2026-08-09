import '../styles/components/VPMenu.css?scoped'
import type { DefaultTheme } from '@actview/press/theme'
import { VPMenuGroup } from './VPMenuGroup'
import { VPMenuLink } from './VPMenuLink'

export interface VPMenuProps {
  items?: DefaultTheme.NavItem[]
  children?: any
}

export function VPMenu(props: VPMenuProps = {}) {
  const items = props.items ?? []
  return (
    <div class="VPMenu">
      {items.length ? (
        <div class="items">
          {items.map((item) => {
            const key = JSON.stringify(item)
            if ('link' in item) {
              return (
                <VPMenuLink
                  key={key}
                  item={item as DefaultTheme.NavItemWithLink}
                />
              )
            }
            if ('component' in item) {
              const Comp: any = (item as DefaultTheme.NavItemComponent)
                .component
              const compProps = (item as DefaultTheme.NavItemComponent).props
              return <Comp key={key} {...(compProps ?? {})} />
            }
            const group = item as DefaultTheme.NavItemChildren
            return (
              <VPMenuGroup key={key} text={group.text} items={group.items} />
            )
          })}
        </div>
      ) : null}
      {props.children ?? null}
    </div>
  )
}
