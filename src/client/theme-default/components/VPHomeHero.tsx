import { computed } from 'actview'
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

  // hero 用 computed 包装：body 读取会进 setup，直接 const hero = fm.value.hero
  // 会被快照在挂载时；computed 让 render 闭包每次重渲染都读最新值
  const hero = computed(() => {
    return fm.value.hero
  })
  return !!hero.value ? (
    <VPHero
      class="VPHomeHero"
      name={hero.value.name}
      text={hero.value.text}
      tagline={hero.value.tagline}
      image={hero.value.image}
      actions={hero.value.actions}
      homeHeroInfoBefore={props.homeHeroInfoBefore}
      homeHeroInfo={props.homeHeroInfo}
      homeHeroInfoAfter={props.homeHeroInfoAfter}
      homeHeroActionsAfter={props.homeHeroActionsAfter}
      homeHeroActionsBeforeActions={props.homeHeroActionsBeforeActions}
      homeHeroImage={props.homeHeroImage}
    />
  ) : null
}
