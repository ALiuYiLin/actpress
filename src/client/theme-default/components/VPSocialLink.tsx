import { computed, nextTick, onMounted, ref } from 'actview'
import type { DefaultTheme } from '@actview/press/theme'

export interface VPSocialLinkProps {
  icon: DefaultTheme.SocialLinkIcon
  link: string
  ariaLabel?: string
  me: boolean
}

// defineComponent + JSX：object icon 的 svg markup 用 ref + innerHTML 注入
// （ActView 无 innerHTML prop；string icon 直接渲染 span，CSS mask 生效）
export function VPSocialLink(props: VPSocialLinkProps) {
  const el = ref<HTMLAnchorElement | undefined>(undefined)

  const svg = computed(() =>
    typeof props.icon === 'object' ? props.icon.svg : null
  )

  onMounted(async () => {
    // object icon：注入 svg markup
    if (svg.value && el.value) {
      el.value.innerHTML = svg.value
    }
    await nextTick()
    const span = el.value?.children[0]
    if (
      span instanceof HTMLElement &&
      span.className.startsWith('vpi-social-') &&
      (getComputedStyle(span).maskImage ||
        getComputedStyle(span).webkitMaskImage) === 'none'
    ) {
      span.style.setProperty(
        '--icon',
        `url('https://api.iconify.design/simple-icons/${props.icon}.svg')`
      )
    }
  })

  return (
    <a
      ref={el}
      class="VPSocialLink no-icon"
      href={props.link}
      aria-label={
        props.ariaLabel ?? (typeof props.icon === 'string' ? props.icon : '')
      }
      target="_blank"
      rel={props.me ? 'me noopener' : 'noopener'}
    >
      {svg.value ? null : <span class={`vpi-social-${props.icon}`} />}
    </a>
  )
}
