import '../styles/components/VPHero.css?scoped'
import type { DefaultTheme } from '@actview/press/theme'
import { VPButton } from './VPButton'
import { VPImage } from './VPImage'

export interface VPHeroProps {
  name?: string
  text?: string
  tagline?: string
  image?: DefaultTheme.ThemeableImage
  actions?: any[]
  [key: string]: any
  homeHeroInfoBefore?: any
  homeHeroInfo?: any
  homeHeroInfoAfter?: any
  homeHeroActionsBeforeActions?: any
  homeHeroImage?: any
  homeHeroActionsAfter?: any
}

export function VPHero(props: VPHeroProps = {}) {
  const heroImageSlotExists = !!props.homeHeroImage
  const hasImage = !!(props.image || heroImageSlotExists)

  return (
    <div
      class={['VPHero', hasImage ? 'has-image' : '', props.class]
        .filter(Boolean)
        .join(' ')}
    >
      <div class="container">
        <div class="main">
          {props.homeHeroInfoBefore}
          {props.homeHeroInfo ?? (
            <>
              <h1 class="heading">
                {/* 原 v-html：文本渲染 */}
                {props.name ? (
                  <span class="name clip">{props.name}</span>
                ) : null}
                {props.text ? <span class="text">{props.text}</span> : null}
              </h1>
              {props.tagline ? <p class="tagline">{props.tagline}</p> : null}
            </>
          )}
          {props.homeHeroInfoAfter}

          {props.actions ? (
            <div class="actions">
              {props.homeHeroActionsBeforeActions}
              {props.actions.map((action) => (
                <div key={action.link} class="action">
                  <VPButton
                    tag="a"
                    size="medium"
                    theme={action.theme}
                    text={action.text}
                    href={action.link}
                    target={action.target}
                    rel={action.rel}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {props.homeHeroActionsAfter}
        </div>

        {hasImage ? (
          <div class="image">
            <div class="image-container">
              <div class="image-bg" />
              {props.homeHeroImage ??
                (props.image ? (
                  <VPImage class="image-src" image={props.image} />
                ) : null)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
