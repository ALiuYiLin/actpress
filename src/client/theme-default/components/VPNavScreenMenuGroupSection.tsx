import '../styles/components/VPNavScreenMenuGroupSection.css?scoped'
import type { DefaultTheme } from '@actview/press/theme'
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
