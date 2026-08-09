import '../styles/components/VPNavScreenMenuGroupLink.css?scoped'
import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { useNav } from '../composables/nav'
import { VPLink } from './VPLink'

export interface VPNavScreenMenuGroupLinkProps {
  item: DefaultTheme.NavItemWithLink
}

export function VPNavScreenMenuGroupLink(props: VPNavScreenMenuGroupLinkProps) {
  const { page } = useData()
  const { closeScreen } = useNav()

  // href / isActiveLink 用 computed 包装：直接在 setup 里计算会被快照
  // （__setup 只执行一次），路由切换后菜单高亮不更新。
  const href = computed(() =>
    typeof props.item.link === 'function'
      ? props.item.link(page.value)
      : props.item.link
  )
  const isActiveLink = computed(() =>
    isActive(
      page.value.relativePath,
      props.item.activeMatch || href.value,
      !!props.item.activeMatch
    )
  )

  return (
    <VPLink
      class={[
        'VPNavScreenMenuGroupLink',
        isActiveLink.value ? 'active' : ''
      ].join(' ')}
      href={href.value}
      target={props.item.target}
      rel={props.item.rel}
      noIcon={props.item.noIcon}
      onclick={closeScreen}
    >
      <span>{props.item.text}</span>
    </VPLink>
  )
}
