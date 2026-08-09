import '../styles/components/VPFeatures.css?scoped'
import { VPFeature } from './VPFeature'

export interface VPFeaturesProps {
  features?: any[]
  [key: string]: any
}

// grid 由 features 数量决定（对齐 Vue 原版 computed）：
// 2 → grid-2；3 → grid-3；3 的倍数 → grid-6；>3 → grid-4
function getGrid(length: number): string {
  if (length === 2) return 'grid-2'
  if (length === 3) return 'grid-3'
  if (length % 3 === 0) return 'grid-6'
  if (length > 3) return 'grid-4'
  return ''
}

export function VPFeatures(props: VPFeaturesProps) {
  // 直接 return jsx：setup 阶段的局部变量/条件会被快照（__setup 只执行一次，
  // 渲染函数闭包捕获旧值）。因此 props.features 必须在渲染函数内读取（JSX 表达式），
  // 多语言切换等 props 更新时（patchComponent 原地更新 instance.props）才能读到新值。
  return props.features ? (
    <div class="VPFeatures">
      <div class="container">
        <div class="items">
          {props.features.map((feature) => (
            <div
              key={feature.title}
              class={['item', getGrid(props.features!.length)]
                .filter(Boolean)
                .join(' ')}
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
  ) : null
}
