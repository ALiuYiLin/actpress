import '../styles/components/VPNavBarHamburger.css?scoped'
export interface VPNavBarHamburgerProps {
  active?: boolean
  onclick?: () => void
  [key: string]: any
}

export function VPNavBarHamburger(props: VPNavBarHamburgerProps = {}) {
  return (
    <button
      type="button"
      class={['VPNavBarHamburger', props.active ? 'active' : '', props.class]
        .filter(Boolean)
        .join(' ')}
      aria-label="mobile navigation"
      aria-expanded={props.active}
      aria-controls="VPNavScreen"
      onclick={props.onclick}
    >
      <span class="container">
        <span class="top" />
        <span class="middle" />
        <span class="bottom" />
      </span>
    </button>
  )
}
