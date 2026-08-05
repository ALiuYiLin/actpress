// 从 theme-default/components/*.vue 提取 scoped 样式到 styles/components/[组件名].css
// 转换规则：
//   - 顶级规则选择器补全"组件顶层类名"前缀（用户规则）
//     .container              -> .VPHero .container
//     :deep(.image-src)       -> .VPHero .image-src（去掉 :deep 包装，前缀顶层类）
//     .VPCarbonAds :deep(img) -> .VPCarbonAds img（已含顶层类则只去包装）
//     .box > :deep(.VPImage)  -> .VPFeature .box > .VPImage（保留中间链）
//   - 嵌套规则（&:lang(ja) 等）原样保留
// 用法：node scripts/extract-styles.mjs [--dry] [--write]
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

const DIR = 'src/client/theme-default/components'
const OUT = 'src/client/theme-default/styles/components'
const DRY = process.argv.includes('--dry')
const WRITE = process.argv.includes('--write')
// 额外文件：--file=src/client/theme-default/NotFound.vue（components 目录外的组件）
const EXTRA_FILES = process.argv
  .filter((a) => a.startsWith('--file='))
  .map((a) => a.slice('--file='.length))

// ---------------------------------------------------------------------------
// 模板解析：收集组件内类名集合 & 根元素类集合
// ---------------------------------------------------------------------------
const CONTAINER_TAGS = new Set([
  'template',
  'transition',
  'Teleport',
  'teleport'
])

function addClassExprClasses(set, expr) {
  if (expr.trim().startsWith('{')) {
    for (let kv of expr.replace(/^\{|\}$/g, '').split(',')) {
      kv = kv.trim()
      if (!kv) continue
      const kvm = kv.match(/^'?([\w-]+)'?\s*:/)
      if (kvm) set.add(kvm[1])
      else {
        const simple = kv.match(/^'?([\w-]+)'?$/)
        if (simple) set.add(simple[1]) // 简写 { open } => open
      }
    }
  }
  for (const s of expr.matchAll(/'([\w-]+)'/g)) {
    if (!['true', 'false'].includes(s[1])) set.add(s[1])
  }
}

function collectTemplateClasses(src) {
  const tmpl = src.match(/<template>([\s\S]*?)<\/template>/)
  const all = new Set()
  const root = new Set()
  if (!tmpl) return { all, root }
  const t = tmpl[1]

  for (const m of t.matchAll(/(?<![:@\w])class="([^"]*)"/g)) {
    for (const c of m[1].trim().split(/\s+/)) if (c) all.add(c)
  }
  for (const m of t.matchAll(/(?::class|v-bind:class)="([^"]+)"/g)) {
    addClassExprClasses(all, m[1])
  }

  // 根元素：第一个真实渲染元素
  const tagRe = /<((?!\/)[\w-]+)\b([^>]*)>/g
  let m
  while ((m = tagRe.exec(t))) {
    const [, tag, attrs] = m
    if (CONTAINER_TAGS.has(tag)) continue
    const staticCls = attrs.match(/(?<![:@\w])class="([^"]*)"/)
    if (staticCls) {
      for (const c of staticCls[1].trim().split(/\s+/)) if (c) root.add(c)
    }
    const bindCls = attrs.match(/(?::class|v-bind:class)="([^"]+)"/)
    if (bindCls && bindCls[1].trim().startsWith('{')) {
      addClassExprClasses(root, bindCls[1])
    }
    break
  }
  return { all, root }
}

// 需要人工指定的根类（模板无法静态确定）
const ROOT_OVERRIDES = {
  'VPLocalNav.vue': {
    root: 'VPLocalNav',
    rootSet: new Set(['VPLocalNav', 'has-sidebar', 'empty', 'fixed'])
  },
  'VPSkipLink.vue': {
    root: 'VPSkipLink',
    rootSet: new Set(['VPSkipLink', 'visually-hidden'])
  }
}

function resolveRoot(file, src) {
  if (ROOT_OVERRIDES[file]) {
    const o = ROOT_OVERRIDES[file]
    return { root: o.root, rootSet: o.rootSet, all: new Set() }
  }
  const { all, root } = collectTemplateClasses(src)
  const compName = file.replace(/\.vue$/, '')
  if (root.has(compName)) return { root: compName, rootSet: root, all }
  if (root.size) return { root: [...root][0], rootSet: root, all }
  if (all.has(compName))
    return { root: compName, rootSet: new Set([compName]), all }
  return { root: null, rootSet: new Set(), all }
}

// ---------------------------------------------------------------------------
// 选择器转换
// ---------------------------------------------------------------------------
function isInternal(compound, { root, templateClasses }) {
  if (!compound.length) return false
  const cls = compound.filter((n) => n.type === 'class').map((n) => n.value)
  if (!cls.length) return false
  return cls.includes(root) || cls.some((c) => templateClasses.has(c))
}

function isRootCompound(compound, { rootSet }) {
  const cls = compound.filter((n) => n.type === 'class').map((n) => n.value)
  return cls.length > 0 && cls.every((c) => rootSet.has(c))
}

// nodes 按 combinator 切分复合；返回 { compounds, 每个复合的起始节点索引 }
function splitCompounds(nodes) {
  const compounds = []
  const starts = []
  let cur = []
  let curStart = 0
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.type === 'combinator') {
      if (cur.length) {
        compounds.push(cur)
        starts.push(curStart)
      }
      cur = []
      curStart = i + 1
    } else {
      cur.push(n)
    }
  }
  if (cur.length) {
    compounds.push(cur)
    starts.push(curStart)
  }
  return { compounds, starts }
}

// 在 nodes 的 start 位置插入根类：compound=true 时复合拼接（.root.条件类），否则后代（root 空格）
function insertRoot(nodes, start, compound, { root }) {
  const classNode = selectorParser.className({ value: root })
  if (compound) {
    nodes.splice(start, 0, classNode)
  } else {
    nodes.splice(start, 0, classNode, selectorParser.combinator({ value: ' ' }))
  }
}

function transformOne(sel, ctx) {
  const nodes = sel.nodes
  const { root } = ctx
  if (!root) return

  const { compounds, starts } = splitCompounds(nodes)
  const hasRootClass = compounds.some((c) =>
    c.some((n) => n.type === 'class' && n.value === root)
  )

  // 找第一个 :deep / :slotted 伪类
  let deepIndex = -1
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (
      n.type === 'pseudo' &&
      (n.value === ':deep' || n.value === ':slotted')
    ) {
      deepIndex = i
      break
    }
  }

  if (deepIndex < 0) {
    // ---- 普通规则 ----
    if (hasRootClass) return
    let firstInternal = -1
    for (let ci = 0; ci < compounds.length; ci++) {
      if (isInternal(compounds[ci], ctx)) {
        firstInternal = ci
        break
      }
    }
    if (firstInternal < 0) {
      // 全部外部类（如 :root.mac ...）→ 前缀根类
      insertRoot(nodes, 0, false, ctx)
      return
    }
    insertRoot(
      nodes,
      starts[firstInternal],
      isRootCompound(compounds[firstInternal], ctx),
      ctx
    )
    return
  }

  // ---- 含 :deep / :slotted ----
  const pseudo = nodes[deepIndex]
  const params = pseudo.nodes ? [...pseudo.nodes] : []
  if (params.length) {
    pseudo.replaceWith(...params)
  } else {
    pseudo.remove()
  }
  if (hasRootClass) return

  const prefix = nodes.slice(0, deepIndex)
  const pc = splitCompounds(prefix)
  const lastComp = pc.compounds[pc.compounds.length - 1]
  if (!lastComp) {
    // prefix 为空：:deep(.image-src) -> .VPHero .image-src
    insertRoot(nodes, 0, false, ctx)
    return
  }
  if (isInternal(lastComp, ctx)) {
    const pos = pc.compounds.indexOf(lastComp)
    insertRoot(nodes, pc.starts[pos], isRootCompound(lastComp, ctx), ctx)
  }
  // lastComp 外部（如 .VPHome :slotted(X)）→ 不插根类，保留原链
}

function transformSelector(selector, ctx) {
  let ast
  try {
    ast = selectorParser().astSync(selector)
  } catch {
    return selector
  }
  for (const sel of ast.nodes) transformOne(sel, ctx)
  return ast.toString()
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
const files = [
  ...readdirSync(DIR).filter((f) => f.endsWith('.vue')),
  ...readdirSync(join(DIR, 'icons'))
    .filter((f) => f.endsWith('.vue'))
    .map((f) => `icons/${f}`),
  ...EXTRA_FILES
]

// 源文件完整路径（components 内用 DIR 拼接，extra 已是仓库相对路径）
function srcPath(f) {
  return EXTRA_FILES.includes(f) ? f : join(DIR, f)
}

const results = []
const skipped = []

for (const f of files.sort()) {
  const src = readFileSync(srcPath(f), 'utf8')
  const styleMatch = src.match(/<style([^>]*)>([\s\S]*?)<\/style>/)
  if (!styleMatch) {
    skipped.push(f)
    continue
  }
  const attrs = styleMatch[1]
  const css = styleMatch[2]
  const scoped = attrs.includes('scoped')
  const outName = join(
    OUT,
    `${f
      .replace(/\.vue$/, '')
      .split(/[\\/]/)
      .pop()}.css`
  )

  if (!scoped) {
    results.push({ file: f, outName, css, note: 'plain <style>' })
    continue
  }

  const ctx = resolveRoot(f, src)
  if (!ctx.root) {
    skipped.push(`${f} (no root class!)`)
    continue
  }
  // 模板类集合：根元素类 + 全部模板类
  const templateClasses = new Set(ctx.rootSet)
  const { all } = collectTemplateClasses(src)
  for (const c of all) templateClasses.add(c)
  for (const o of Object.values(ROOT_OVERRIDES)) {
    if (o.root === ctx.root) for (const c of o.rootSet) templateClasses.add(c)
  }

  let root
  try {
    root = postcss.parse(css)
  } catch (e) {
    skipped.push(`${f} (parse error: ${e.message})`)
    continue
  }

  let changed = 0
  root.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'rule') return // 嵌套规则保留
    const old = rule.selector
    const next = transformSelector(old, {
      root: ctx.root,
      rootSet: ctx.rootSet,
      templateClasses
    })
    if (next !== old) {
      rule.selector = next
      changed++
    }
  })
  results.push({
    file: f,
    outName,
    css: root.toString(),
    root: ctx.root,
    changed
  })
}

// ---- 输出 ----
console.log(`==== 提取计划（${results.length} 个文件）====`)
for (const r of results) {
  const nm = r.outName.split('/').pop()
  console.log(
    `## ${r.file} -> ${nm}${r.root ? `  [root: ${r.root}]` : ''}${r.note ? `  (${r.note})` : ''}${r.changed !== undefined ? `  转换规则数: ${r.changed}` : ''}`
  )
}
if (skipped.length) {
  console.log('\n==== 跳过 ====')
  for (const s of skipped) console.log(' ', s)
}

if (WRITE) {
  mkdirSync(OUT, { recursive: true })
  for (const r of results)
    writeFileSync(r.outName, `${r.css.trimStart().replace(/\s+$/, '')}\n`)
  console.log(`\n已写入 ${results.length} 个 CSS 文件到 ${OUT}`)

  // 2. 从 .vue 删除 style 块（提取后 scoped 样式迁出）
  let vueChanged = 0
  for (const r of results) {
    const p = srcPath(r.file)
    let src = readFileSync(p, 'utf8')
    const next = src.replace(/\n*<style[^>]*>[\s\S]*?<\/style>\n*/, '')
    if (next !== src) {
      writeFileSync(p, next)
      vueChanged++
    }
  }
  console.log(`已从 ${vueChanged} 个 .vue 删除 style 块`)

  // 3. 更新 without-fonts.ts：追加组件 css import（幂等：先移除已有组件 import 行）
  const wf = 'src/client/theme-default/without-fonts.ts'
  const wfSrc = readFileSync(wf, 'utf8')
  // 从输出目录列出组件 css（大写开头），不依赖本次 results（重跑幂等）
  const componentCss = readdirSync(OUT)
    .filter((f) => /^[A-Z][\w-]*\.css$/.test(f))
    .sort()
  const newImports = componentCss
    .map((f) => `import './styles/components/${f}'`)
    .join('\n')
  const withoutOld = wfSrc
    .split('\n')
    .filter((l) => !/^import '\.\/styles\/components\/[A-Z]/.test(l))
    .join('\n')
  const anchor = "import './styles/components/vp-sponsor.css'\n"
  const next = withoutOld.replace(anchor, anchor + newImports + '\n')
  if (next !== wfSrc) {
    writeFileSync(wf, next)
    console.log(`已更新 ${wf}（追加 ${componentCss.length} 条 import）`)
  } else {
    console.log(`${wf} 已包含组件 css import，跳过`)
  }
} else {
  console.log('\n（dry-run：未写入。加 --write 实际写入）')
}
