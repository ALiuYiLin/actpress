import { computed } from 'actview'
import { useData } from '../composables/data'
import { VPFeatures } from './VPFeatures'

export function VPHomeFeatures() {
  const { frontmatter: fm } = useData()

  // features 用 computed 包装：直接 const features = fm.value.features 会在 setup
  // 读一次被快照；computed 让 render 闭包每次重渲染都读最新值。
  // 条件用 Fragment 三元（插件原生支持），features.value 在渲染函数内读取 → 响应式
  const features = computed(() => fm.value.features)
  return (
    <>
      {features.value ? (
        <VPFeatures class="VPHomeFeatures" features={features.value} />
      ) : null}
    </>
  )
}
