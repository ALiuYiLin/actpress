import { onBeforeUnmount, onMounted, ref } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { VPSidebarItem } from './VPSidebarItem'

export interface VPSidebarGroupProps {
  items: DefaultTheme.SidebarItem[]
}

export function VPSidebarGroup(props: VPSidebarGroupProps) {
  const disableTransition = ref(true)
  let timer: ReturnType<typeof setTimeout> | null = null

  onMounted(() => {
    timer = setTimeout(() => {
      timer = null
      disableTransition.value = false
    }, 300)
  })

  onBeforeUnmount(() => {
    if (timer != null) {
      clearTimeout(timer)
      timer = null
    }
  })

  return (
    <>
      {props.items.map((item) => (
        <div
          key={item.text}
          class={['group', disableTransition.value ? 'no-transition' : '']
            .filter(Boolean)
            .join(' ')}
        >
          <VPSidebarItem item={item} depth={0} />
        </div>
      ))}
    </>
  )
}
