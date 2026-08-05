import { defineComponent } from 'actview'
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

export const VPHomeHero = defineComponent(function (
  props: VPHomeHeroProps = {}
) {
  const { frontmatter: fm } = useData()

  // 必须在 render 内判断 hero 是否存在（setup 早退会导致路由切换后
  // render 引用 fm.value.hero.name 时 hero 已是 undefined → 崩溃）
  return function () {
    const hero = fm.value.hero
    if (!hero) return null

    return (
      <VPHero
        class="VPHomeHero"
        name={hero.name}
        text={hero.text}
        tagline={hero.tagline}
        image={hero.image}
        actions={hero.actions}
        homeHeroInfoBefore={props.homeHeroInfoBefore}
        homeHeroInfo={props.homeHeroInfo}
        homeHeroInfoAfter={props.homeHeroInfoAfter}
        homeHeroActionsAfter={props.homeHeroActionsAfter}
        homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
        homeHeroImage={props.homeHeroImage}
      />
    )
  }
})
