import type { DefaultTheme } from 'actpress/theme'
import { VPMenuLink } from './VPMenuLink'

export interface VPMenuGroupProps {
  text?: string
  items: Array<
    | DefaultTheme.NavItemComponent
    | DefaultTheme.NavItemChildren
    | DefaultTheme.NavItemWithLink
  >
}

export function VPMenuGroup(props: VPMenuGroupProps) {
  return (
    <div class="VPMenuGroup">
      {props.text ? <p class="title">{props.text}</p> : null}
      {props.items.map((item, i) =>
        'link' in item ? (
          <VPMenuLink key={i} item={item as DefaultTheme.NavItemWithLink} />
        ) : null
      )}
    </div>
  )
}
