import { useData } from '../composables/data'
import { VPFeatures } from './VPFeatures'

export function VPHomeFeatures() {
  const { frontmatter: fm } = useData()

  return function () {
    if (!fm.value.features) return null
    return <VPFeatures class="VPHomeFeatures" features={fm.value.features} />
  }
}
