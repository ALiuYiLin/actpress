export interface VPSwitchProps {
  children?: any
  [key: string]: any
}

export function VPSwitch(props: VPSwitchProps = {}) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      class={['VPSwitch', props.class ?? ''].filter(Boolean).join(' ')}
    >
      <span class="check">
        {props.children != null ? (
          <span class="icon">{props.children}</span>
        ) : null}
      </span>
    </button>
  )
}
