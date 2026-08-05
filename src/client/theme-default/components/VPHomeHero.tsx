import { useData } from '../composables/data'
import { VPHero } from './VPHero'

export interface VPHomeHeroProps {
  homeHeroInfoBefore?: any
  homeHeroInfo?: any
  homeHeroInfoAfter?: any
  homeHeroActionsAfter?: any
  homeHeroActionsBeforeActions?: any
  homeHeroImage?: any
}

export function VPHomeHero(props: VPHomeHeroProps = {}) {
  const { frontmatter: fm } = useData()

  if (!fm.value.hero) return null

  return (
    <VPHero
      class="VPHomeHero"
      name={fm.value.hero.name}
      text={fm.value.hero.text}
      tagline={fm.value.hero.tagline}
      image={fm.value.hero.image}
      actions={fm.value.hero.actions}
      homeHeroInfoBefore={props.homeHeroInfoBefore}
      homeHeroInfo={props.homeHeroInfo}
      homeHeroInfoAfter={props.homeHeroInfoAfter}
      homeHeroActionsAfter={props.homeHeroActionsAfter}
      homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
      homeHeroImage={props.homeHeroImage}
    />
  )
}
