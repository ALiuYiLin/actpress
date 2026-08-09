import '../styles/components/VPHome.css?scoped'
import { useData } from '../composables/data'
import { Content } from '../../app/components/Content'
import { VPHomeContent } from './VPHomeContent'
import { VPHomeFeatures } from './VPHomeFeatures'
import { VPHomeHero } from './VPHomeHero'

export interface VPHomeProps {
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
}

export function VPHome(props: VPHomeProps = {}) {
  const { frontmatter, theme } = useData()

  return (
    <div
      class={[
        'VPHome',
        theme.value.externalLinkIcon ? 'external-link-icon-enabled' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {props.homeHeroBefore}
      <VPHomeHero
        homeHeroInfoBefore={props.homeHeroInfoBefore}
        homeHeroInfo={props.homeHeroInfo}
        homeHeroInfoAfter={props.homeHeroInfoAfter}
        homeHeroActionsAfter={props.homeHeroActionsAfter}
        homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
        homeHeroImage={props.homeHeroImage}
      />
      {props.homeHeroAfter}

      {props.homeFeaturesBefore}
      <VPHomeFeatures />
      {props.homeFeaturesAfter}

      {frontmatter.value.markdownStyles !== false ? (
        <VPHomeContent>
          <Content />
        </VPHomeContent>
      ) : (
        <Content />
      )}
    </div>
  )
}
