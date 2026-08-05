import { useData } from '../composables/data'
import { VPNavBarSearchButton } from './VPNavBarSearchButton'

export function VPNavBarSearch(props: any = {}) {
  const { theme } = useData()

  // TODO(C): 搜索框本体（VPLocalSearchBox / VPAlgoliaSearchBox）后续批次迁移；
  // 当前仅渲染搜索按钮（外观），点击行为待搜索框接入
  return (
    <div class="VPNavBarSearch">
      <VPNavBarSearchButton
        text={(theme.value.search as any)?.options?.placeholder ?? 'Search'}
      />
    </div>
  )
}
