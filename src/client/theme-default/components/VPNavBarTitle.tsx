import { createElement } from '@actview/jsx'
import { defineComponent } from 'actview'
import { useData } from '../composables/data'
import { useLangs } from '../composables/langs'
import { useLayout } from '../composables/layout'
import { normalizeLink } from '../support/utils'
import { VPImage } from './VPImage'

export const VPNavBarTitle = defineComponent(function (props: any = {}) {
  const { site, theme } = useData()
  const { hasSidebar } = useLayout()
  const { currentLang } = useLangs()

  return function () {
    const logoLink = theme.value.logoLink
    const link = typeof logoLink === 'string' ? logoLink : logoLink?.link
    const rel = typeof logoLink === 'string' ? undefined : logoLink?.rel
    const target = typeof logoLink === 'string' ? undefined : logoLink?.target
    const logo = theme.value.logo
    const siteTitle = theme.value.siteTitle

    return createElement(
      'div',
      {
        class: ['VPNavBarTitle', hasSidebar.value ? 'has-sidebar' : ''].join(
          ' '
        )
      },
      createElement(
        'a',
        {
          class: 'title',
          href: link ?? normalizeLink(currentLang.value.link),
          rel,
          target
        },
        props.navBarTitleBefore,
        logo ? createElement(VPImage, { class: 'logo', image: logo }) : null,
        siteTitle != null
          ? createElement('span', null, siteTitle)
          : createElement('span', null, site.value.title),
        props.navBarTitleAfter
      )
    )
  }
})
