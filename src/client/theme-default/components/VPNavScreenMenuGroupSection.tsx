import type { DefaultTheme } from 'vitepress/theme'
import { VPNavScreenMenuGroupLink } from './VPNavScreenMenuGroupLink'

export interface VPNavScreenMenuGroupSectionProps {
  text?: string
  items: DefaultTheme.NavItemWithLink[]
}

export function VPNavScreenMenuGroupSection(
  props: VPNavScreenMenuGroupSectionProps
) {
  return (
    <div class="VPNavScreenMenuGroupSection">
      {props.text ? <p class="title">{props.text}</p> : null}
      {props.items.map((item) => (
        <VPNavScreenMenuGroupLink key={item.text} item={item} />
      ))}
    </div>
  )
}
