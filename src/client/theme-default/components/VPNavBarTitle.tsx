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

  const logoLink = theme.value.logoLink
  const link = typeof logoLink === 'string' ? logoLink : logoLink?.link
  const rel = typeof logoLink === 'string' ? undefined : logoLink?.rel
  const target = typeof logoLink === 'string' ? undefined : logoLink?.target
  const logo = theme.value.logo
  const siteTitle = theme.value.siteTitle

  return (
    <div
      class={['VPNavBarTitle', hasSidebar.value ? 'has-sidebar' : ''].join(' ')}
    >
      <a
        class="title"
        href={link ?? normalizeLink(currentLang.value.link)}
        rel={rel}
        target={target}
      >
        {props.navBarTitleBefore}
        {logo ? <VPImage class="logo" image={logo} /> : null}
        <span>{siteTitle != null ? siteTitle : site.value.title}</span>
        {props.navBarTitleAfter}
      </a>
    </div>
  )
}
