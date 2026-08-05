import { VPFeature } from './VPFeature'

export interface VPFeaturesProps {
  features?: any[]
  [key: string]: any
}

export function VPFeatures(props: VPFeaturesProps) {
  const features = props.features
  if (!features) return null
  return (
    <div class="VPFeatures">
      <div class="container">
        <div class="items">
          {features.map((feature) => (
            <div
              key={feature.title}
              class={['item', feature.grid].filter(Boolean).join(' ')}
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
