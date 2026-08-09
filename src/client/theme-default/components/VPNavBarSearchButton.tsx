import '../styles/components/VPNavBarSearchButton.css?scoped'
export interface VPNavBarSearchButtonProps {
  text: string
  onclick?: () => void
}

export function VPNavBarSearchButton(props: VPNavBarSearchButtonProps) {
  return (
    <button type="button" class="VPNavBarSearchButton" onclick={props.onclick}>
      <span class="vpi-search" aria-hidden="true" />
      <span class="text">{props.text}</span>
      <span class="keys" aria-hidden="true">
        <kbd class="key-cmd">&#x2318;</kbd>
        <kbd class="key-ctrl">Ctrl</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  )
}
