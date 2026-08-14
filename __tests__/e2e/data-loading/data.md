# Static Data

<script setup lang="ts">
import { data } from './basic.data.mjs'
import { data as contentData } from './contentLoader.data.js'

// ActView 正文不支持 {{ expr }} 求值：动态内容用 script 块定义组件，
// 正文用组件引用（对齐 using-actview.md 的约定）。
function DataPreview() {
  return <pre id="basic">{JSON.stringify(data, null, 2)}</pre>
}

function ContentPreview() {
  return <pre id="content">{JSON.stringify(contentData, null, 2)}</pre>
}
</script>

<DataPreview />

<ContentPreview />
