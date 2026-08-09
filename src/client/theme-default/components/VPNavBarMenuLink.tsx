import '../styles/components/VPNavBarMenuLink.css?scoped'
import { computed } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'
import { isActive } from '../../shared'
import { useData } from '../composables/data'
import { VPLink } from './VPLink'

export interface VPNavBarMenuLinkProps {
  item: DefaultTheme.NavItemWithLink
}

export function VPNavBarMenuLink(props: VPNavBarMenuLinkProps) {
  const { page } = useData()

  // href / isActiveLink 用 computed 包装：直接在 setup 里计算会被快照
  // （__setup 只执行一次，渲染函数闭包捕获旧值），路由切换后导航高亮不更新。
  // computed 让渲染函数每次重渲染都读最新 page.value / props.item。
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
      class={['VPNavBarMenuLink', isActiveLink.value ? 'active' : ''].join(' ')}
      href={href.value}
      target={props.item.target}
      rel={props.item.rel}
      noIcon={props.item.noIcon}
      tabindex="0"
    >
      <span>{props.item.text ?? ''}</span>
    </VPLink>
  )
}
