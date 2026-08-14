# md → TSX 编译链路记录（md-pipeline）

> 记录「md 文件 → 页面组件模块 → 浏览器渲染」的完整编译链路、
> 关键设计决策（script 占位、fence 感知、双括号字面、代码高亮）与已验证的结论。
> 供后续维护与排查 markdown 渲染问题时参考（配套原理见 `design/magrite.md`）。

---

## 1. 链路全景

```
md 文件
  │
  ▼ ① markdownToActView.render（src/node/markdownToActView.ts）
  ├─ 1a. maskScriptBlocks：真实 <script setup>/<script lang="tsx"> 块 → 占位（fence 感知）
  ├─ 1b. markdown-it renderAsync：
  │      ├─ fence 规则 → shiki 高亮 → <pre class="shiki"><span class="line">…
  │      └─ html_block（componentPlugin 的规则）→ script 占位块成 token（不截断）
  ├─ 1c. tsxSfcPlugin（renderer html_block）：提取 script token，
  │      占位内容从 env.__avScriptBlocks 还原为原始 script 源码
  └─ 1d. serializeHtmlToJsx：渲染 HTML → JSX（文本/属性实体解码、组件标签解析）
  │
  ▼ ② createActViewSrc 组合 TSX（markdownToActView.ts）
  script 块内容提升模块顶层 + export const __pageData + defineComponent(页面组件)
  │
  ▼ ③ vite + @actview/plugin-vite（.md.tsx）
  babel：JSX → _jsx()、大写函数组件 → defineComponent 包装
  │
  ▼ ④ 浏览器
  ActView 挂载渲染 + theme CSS（vp-code.css 的 .shiki 着色规则等）
```

## 2. 各环节要点

### 2.1 maskScriptBlocks（script 占位 + fence 感知）

**为什么需要占位**：markdown-it 的 `html_block` type 7（`script/style/pre/textarea`）
的终止条件是**任意** `</(script|pre|style|textarea)>` 之一（`@mdit-vue/plugin-component`
的 htmlBlockRule 同样如此，且在插件注册顺序上会覆盖外部对 html_block 规则的修改）。
因此真实 `<script setup>` 块内的组件 JSX 含 `</pre>` 等闭合标签时，script 块会被
提前截断（内容变成段落、组件丢失）。

**占位方案**：渲染前把真实 script 块替换为无截断标签的三行占位
`<script setup>\n__AV_SCRIPT_BLOCK_N__\n</script>`，原始内容存
`env.__avScriptBlocks`；`tsxSfcPlugin` 提取时按 key 还原。md 文本在 markdown-it
视角里不含任何 `</pre>`，截断问题天然消失。

**fence 感知（关键）**：逐行扫描并跟踪 fenced code block（CommonMark：≤3 空格缩进
+ ≥3 个 `` ` `` 或 `~`），**fence 内一律不替换**——文档示例代码（````md 包裹的
`<script lang="tsx">`）渲染为代码展示，不走 html_block 提取路径，若被占位会原样
泄漏占位符到页面。未闭合的 script 块原样输出，交给 markdown-it 处理。

### 2.2 markdown-it 渲染（fence 高亮 + html_block）

- **fence 代码块**：`shiki` 高亮（`src/node/markdown/plugins/highlight.ts`，
  dual-theme + `defaultColor: false`）——输出 `<pre class="shiki shiki-themes …">`
  内嵌 `<span class="line"><span style="--shiki-light: …; --shiki-dark: …">`。
  颜色是 **CSS 变量**而非内联 color，真正的着色靠客户端 `vp-code.css`：
  `.dark .shiki span { color: var(--shiki-dark) }` / `html:not(.dark) .shiki span { color: var(--shiki-light) }`。
- **fence 语言标记决定高亮结果**：````md fence 按 markdown 语法 token 化，内嵌
  `<script>` 里的 tsx 代码**不会**切到嵌入语言高亮（token 同色）。示例代码要
  语法高亮，必须写对应语言标记（如 ````tsx）——这是文档书写约定，非链路缺陷。
- **html_block**：占位后的 script 块完整成 token，供 tsxSfcPlugin 提取。

### 2.3 tsxSfcPlugin（script 提取 + 还原）

`src/node/markdown/markdown.ts`：`renderer.rules.html_block` 拦截，正则
`TSX_SCRIPT_BLOCK_RE` 匹配带 `lang="tsx"` 或 `setup` 属性的完整 script 块 →
`env.sfcBlocks.scripts`；`restoreScriptPlaceholder` 把占位 key 还原为
`env.__avScriptBlocks` 中的原始 script 源码（`contentStripped`）。

### 2.4 serializeHtmlToJsx

- 正文文本一律渲染为**字面**（JSX 字符串表达式）。**不支持正文 `{expr}`/`{{ expr }}`
  求值**——需要动态内容时在 `<script lang="tsx">` 里定义组件，正文用组件引用
  （这是 ActView 版 md 的既定契约，docs/zh/guide/using-actview.md 的对比表格同此表述）。
- 大写标签且属于 script 块具名导出集合 → 组件引用 `<Comp />`；否则按文本渲染并告警。
- 文本/属性实体单遍解码；`on*` 字符串属性丢弃并告警。

### 2.5 createActViewSrc 组合

- 所有 `<script>` 块内容提升到模块顶层（共享作用域、import 去重）。
- `export const __pageData = JSON.parse(...)`（契约不变，主题 useData() 消费）。
- `export default defineComponent(function () { return () => (…JSX…) })`——
  页面组件是 defineComponent 产物（渲染器只认 `{ __setup }`，裸函数会崩）。

### 2.6 @actview/plugin-vite（babel）

`.tsx`/`.js` 过 Babel：JSX → `_jsx()`（`@actview/jsx/jsx-runtime`）、大写函数组件
→ `defineComponent(fn, "Name")`（`return JSX` 包成 `return () => JSX`，早退 return
同步包裹）。注意：浏览器实际加载的是 **dist/client 的构建产物**，src 改动后必须
`pnpm build:client` 重建才生效（`build:node` 同理对应 dist/node）。

## 3. 关键设计决策与结论

| 决策点 | 选择 | 理由 |
|---|---|---|
| script 块截断问题 | 渲染前占位 + 提取时还原（fence 感知） | componentPlugin 会覆盖 html_block 规则，改规则不可行（或需复制其实现）；占位改动集中、md 文本零 `</pre>` |
| fence 内 script | 不占位（原样进 fence） | 示例代码必须原样渲染，占位符会在页面泄漏 |
| 正文 `{{ expr }}` | 纯字面，不求值 | ActView 正文无模板编译器；动态内容用 script 组件 + 正文引用（文档契约一致） |
| 高亮着色 | shiki CSS 变量 + vp-code.css 规则 | dual-theme 切换（.dark 类）；实测 computedStyle 正确应用 |
| 高亮语言 | 由 fence 语言标记决定 | 写错语言（如 `md`）导致内嵌代码单色，属文档问题 |

## 4. 已知限制与坑

1. **dist 缓存**：e2e/dev 站点加载 dist 产物；改 src/client 需 `build:client`、
   改 src/node 需 `build:node` 后重启 dev server（进程内 md 渲染器单例 + 模块缓存）。
2. **行号**：script 占位把多行块换成 3 行，dead-link 行号记录在含 script 块的
   页面会有偏移（现有 dead-link 测试场景不含 script，未暴露）。
3. **shiki 嵌入高亮**：markdown fence 内嵌 `<script>` 不自动切语言；如需按 tsx
   高亮需写 `tsx` 语言标记（或后续配 shiki embeddedLanguages，增强项未做）。
4. **componentPlugin 覆盖**：任何想在 markdown-it 层修改 html_block 规则的尝试
   都必须放在 componentPlugin 注册之后，且需自行兼容其 blockTags 行为。

## 5. 涉及文件

- `src/node/markdownToActView.ts`：render 管线 + `maskScriptBlocks` + `createActViewSrc` + `serializeHtmlToJsx`
- `src/node/markdown/markdown.ts`：`tsxSfcPlugin` + `restoreScriptPlaceholder`（md 渲染器单例）
- `src/node/markdown/plugins/highlight.ts`：shiki 高亮器（dual-theme CSS 变量）
- `src/client/theme-default/styles/components/vp-code.css`：`.shiki` 着色规则
- `src/client/theme-default/without-fonts.ts`：theme CSS 入口（vp-code.css 普通导入，无 scoped）
- `__tests__/unit/node/markdownToActView.test.ts`、`markdownToActView.serializer.test.ts`：链路回归测试
