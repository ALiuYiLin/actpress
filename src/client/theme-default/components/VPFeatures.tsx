import { defineComponent } from 'actview'
import { VPFeature } from './VPFeature'

export interface VPFeaturesProps {
  features?: any[]
  [key: string]: any
}

export const VPFeatures = defineComponent(function (props: VPFeaturesProps) {
  return function () {
    const features = props.features
    if (!features) return null

    // grid 由 features 数量决定（对齐 Vue 原版 computed）：
    // 2 → grid-2；3 → grid-3；3 的倍数 → grid-6；>3 → grid-4
    const length = features.length
    let grid = ''
    if (length === 2) grid = 'grid-2'
    else if (length === 3) grid = 'grid-3'
    else if (length % 3 === 0) grid = 'grid-6'
    else if (length > 3) grid = 'grid-4'

    return (
      <div class="VPFeatures">
        <div class="container">
          <div class="items">
            {features.map((feature) => (
              <div
                key={feature.title}
                class={['item', grid].filter(Boolean).join(' ')}
              >
                <VPFeature
                  icon={feature.icon}
                  title={feature.title}
                  details={feature.details}
                  link={feature.link}
                  linkText={feature.linkText}
                  rel={feature.rel}
                  target={feature.target}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
})
