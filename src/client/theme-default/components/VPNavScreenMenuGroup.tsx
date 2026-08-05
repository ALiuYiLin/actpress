import { computed, defineComponent, ref } from 'actview'
import { VPNavScreenMenuGroupLink } from './VPNavScreenMenuGroupLink'
import { VPNavScreenMenuGroupSection } from './VPNavScreenMenuGroupSection'

export interface VPNavScreenMenuGroupProps {
  text: string
  items: any[]
}

export const VPNavScreenMenuGroup = defineComponent(function (
  props: VPNavScreenMenuGroupProps
) {
  const isOpen = ref(false)
  const groupId = computed(
    () => `NavScreenGroup-${props.text.replace(' ', '-').toLowerCase()}`
  )
  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  return function () {
    return (
      <div
        class={['VPNavScreenMenuGroup', isOpen.value ? 'open' : ''].join(' ')}
      >
        <button
          class="button"
          aria-controls={groupId.value}
          aria-expanded={isOpen.value}
          onclick={toggle}
        >
          <span class="button-text">{props.text}</span>
          <span class="vpi-plus button-icon" />
        </button>
        <div id={groupId.value} class="items">
          {props.items.map((item) => {
            const key = JSON.stringify(item)
            if ('link' in item) {
              return (
                <div class="item">
                  <VPNavScreenMenuGroupLink key={key} item={item} />
                </div>
              )
            }
            if ('component' in item) {
              const Comp: any = item.component
              return (
                <div class="item">
                  <Comp key={key} {...item.props} screen-menu />
                </div>
              )
            }
            return (
              <div class="group">
                <VPNavScreenMenuGroupSection
                  key={key}
                  text={item.text}
                  items={item.items}
                />
              </div>
            )
          })}
        </div>
      </div>
    )
  }
})
