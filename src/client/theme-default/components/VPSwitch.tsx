export interface VPSwitchProps {
  children?: any
  [key: string]: any
}

export function VPSwitch(props: VPSwitchProps = {}) {
  return (
    <button type="button" role="switch" class="VPSwitch" {...props}>
      <span class="check">
        {props.children != null ? (
          <span class="icon">{props.children}</span>
        ) : null}
      </span>
    </button>
  )
}
