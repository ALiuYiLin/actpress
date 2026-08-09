import '../styles/components/VPContent.css?scoped'
import { useData } from '../composables/data'
import { useLayout } from '../composables/layout'
import { NotFound } from '../NotFound'
import { VPDoc } from './VPDoc'
import { VPHome } from './VPHome'
import { VPPage } from './VPPage'

export interface VPContentProps {
  notFound?: any
  pageTop?: any
  pageBottom?: any
  homeHeroBefore?: any
  homeHeroInfoBefore?: any
  homeHeroInfo?: any
  homeHeroInfoAfter?: any
  homeHeroActionsAfter?: any
  homeHeroActionsBeforeActions?: any
  homeHeroImage?: any
  homeHeroAfter?: any
  homeFeaturesBefore?: any
  homeFeaturesAfter?: any
  docTop?: any
  docBottom?: any
  docFooterBefore?: any
  docBefore?: any
  docAfter?: any
  asideTop?: any
  asideOutlineBefore?: any
  asideOutlineAfter?: any
  asideAdsBefore?: any
  asideAdsAfter?: any
  asideBottom?: any
}

export function VPContent(props: VPContentProps = {}) {
  const { page, frontmatter } = useData()
  const { isHome, hasSidebar } = useLayout()

  // ActView 无全局组件注册（Vue 的 resolveDynamicComponent/isRegistered），
  // 恒走默认布局分支；未识别 layout 回退到 VPDoc
  return (
    <div
      class={[
        'VPContent',
        hasSidebar.value ? 'has-sidebar' : '',
        isHome.value ? 'is-home' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      id="VPContent"
    >
      {page.value.isNotFound ? (
        <NotFound />
      ) : frontmatter.value.layout === 'page' ? (
        <VPPage pageTop={props.pageTop} pageBottom={props.pageBottom} />
      ) : frontmatter.value.layout === 'home' ? (
        <VPHome
          homeHeroBefore={props.homeHeroBefore}
          homeHeroInfoBefore={props.homeHeroInfoBefore}
          homeHeroInfo={props.homeHeroInfo}
          homeHeroInfoAfter={props.homeHeroInfoAfter}
          homeHeroActionsAfter={props.homeHeroActionsAfter}
          homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
          homeHeroImage={props.homeHeroImage}
          homeHeroAfter={props.homeHeroAfter}
          homeFeaturesBefore={props.homeFeaturesBefore}
          homeFeaturesAfter={props.homeFeaturesAfter}
        />
      ) : (
        <VPDoc
          docTop={props.docTop}
          docBottom={props.docBottom}
          docFooterBefore={props.docFooterBefore}
          docBefore={props.docBefore}
          docAfter={props.docAfter}
          asideTop={props.asideTop}
          asideOutlineBefore={props.asideOutlineBefore}
          asideOutlineAfter={props.asideOutlineAfter}
          asideAdsBefore={props.asideAdsBefore}
          asideAdsAfter={props.asideAdsAfter}
          asideBottom={props.asideBottom}
        />
      )}
    </div>
  )
}
