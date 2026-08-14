<!-- @content -->

<script setup lang="ts">
import { useData } from '@actview/press'

// ActView 正文不支持 {{ $params }} 求值：动态路由参数经 useData().params
// 读取，script 块定义组件，正文用组件引用。
function Params() {
  const { params } = useData()
  return <pre class="params">{JSON.stringify(params.value, null, 2)}</pre>
}
</script>

<Params />
