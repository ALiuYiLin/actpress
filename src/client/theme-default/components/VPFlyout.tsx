import { ref } from 'actview'
import type { DefaultTheme } from 'vitepress/theme'
import { useFlyout } from '../composables/flyout'
import { VPMenu } from './VPMenu'

export interface VPFlyoutProps {
  icon?: string
  button?: string
  label?: string
  items?: DefaultTheme.NavItem[]
  children?: any
  [key: string]: any
}

export function VPFlyout(props: VPFlyoutProps = {}) {
  const open = ref(false)
  const el = ref<HTMLElement | undefined>(undefined)

  useFlyout({
    el,
    onBlur: () => {
      open.value = false
    }
  })

  return (
    <div
      class="VPFlyout"
      ref={el}
      onmouseenter={() => (open.value = true)}
      onmouseleave={() => (open.value = false)}
    >
      <button
        type="button"
        class="button"
        aria-haspopup="true"
        aria-expanded={open.value}
        aria-label={props.label}
        onclick={() => (open.value = !open.value)}
      >
        {props.button || props.icon ? (
          <span class="text">
            {props.icon ? (
              <span class={[props.icon, 'option-icon'].join(' ')} />
            ) : null}
            {props.button ? <span>{props.button}</span> : null}
            <span class="vpi-chevron-down text-icon" />
          </span>
        ) : (
          <span class="vpi-more-horizontal icon" />
        )}
      </button>
      <div class="menu">
        <VPMenu items={props.items}>{props.children}</VPMenu>
      </div>
    </div>
  )
}
