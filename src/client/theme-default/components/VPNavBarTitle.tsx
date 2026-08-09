import '../styles/components/VPNavBarTitle.css?scoped'
import { computed } from 'actview'
import { useData } from '../composables/data'
import { useLangs } from '../composables/langs'
import { useLayout } from '../composables/layout'
import { normalizeLink } from '../support/utils'
import { VPImage } from './VPImage'

export interface VPNavBarTitleProps {
  navBarTitleBefore?: any
  navBarTitleAfter?: any
}

export function VPNavBarTitle(props: VPNavBarTitleProps = {}) {
  const { site, theme } = useData()
  const { hasSidebar } = useLayout()
  const { currentLang } = useLangs()

  const link = computed(() => {
    const logoLink = theme.value.logoLink
    return typeof logoLink === 'string' ? logoLink : logoLink?.link
  })
  const rel = computed(() => {
    const logoLink = theme.value.logoLink
    return typeof logoLink === 'string' ? undefined : logoLink?.rel
  })
  const target = computed(() => {
    const logoLink = theme.value.logoLink
    return typeof logoLink === 'string' ? undefined : logoLink?.target
  })
  const logo = computed(() => theme.value.logo)
  const siteTitle = computed(() => theme.value.siteTitle)

  return (
    <div
      class={['VPNavBarTitle', hasSidebar.value ? 'has-sidebar' : ''].join(' ')}
    >
      <a
        class="title"
        href={link.value ?? normalizeLink(currentLang.value.link)}
        rel={rel.value}
        target={target.value}
      >
        {props.navBarTitleBefore}
        {logo.value ? <VPImage class="logo" image={logo.value} /> : null}
        <span>
          {siteTitle.value != null ? siteTitle.value : site.value.title}
        </span>
        {props.navBarTitleAfter}
      </a>
    </div>
  )
}
