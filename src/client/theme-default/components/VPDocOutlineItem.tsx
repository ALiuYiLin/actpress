import type { DefaultTheme } from '@actview/press/theme'

export interface VPDocOutlineItemProps {
  headers: DefaultTheme.OutlineItem[]
  root?: boolean
}

// 递归 outline 列表；defineComponent + JSX（条件递归）
export function VPDocOutlineItem(props: VPDocOutlineItemProps) {
  return (
    <ul class={['VPDocOutlineItem', props.root ? 'root' : 'nested'].join(' ')}>
      {props.headers.map(({ children, link, title }) => (
        <li>
          <a class="outline-link" href={link} title={title}>
            {title}
          </a>
          {children?.length ? <VPDocOutlineItem headers={children} /> : null}
        </li>
      ))}
    </ul>
  )
}
