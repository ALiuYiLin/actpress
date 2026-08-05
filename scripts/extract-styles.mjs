// 从 theme-default/components/*.vue 提取 scoped 样式到 styles/components/[组件名].css
// 转换规则（用户规则）：顶层 css 类 + DOM 路径上遇到的所有类名 + 自身的类名
//   .container              -> .VPHero .container
//   .main                   -> .VPHero .container .main（.main 在 .container 内）
//   :deep(.image-src)       -> .VPHero .container .image .image-container .image-src
//   .link                   -> .NotFound .action .link（.link 在 .action 内）
//   已含完整路径的选择器保持不变（.VPHero.has-image .container）
// 用法：node scripts/extract-styles.mjs [--dry] [--write] [--file=<路径>]
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync
} from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'

const DIR = 'src/client/theme-default/components'
const OUT = 'src/client/theme-default/styles/components'
const DRY = process.argv.includes('--dry')
const WRITE = process.argv.includes('--write')
const EXTRA_FILES = process.argv
  .filter((a) => a.startsWith('--file='))
  .map((a) => a.slice('--file='.length))

// ---------------------------------------------------------------------------
// 模板解析
// ---------------------------------------------------------------------------
const CONTAINER_TAGS = new Set([
  'template',
  'transition',
  'Teleport',
  'teleport'
])

function addClassExprClasses(set, expr) {
  const e = expr.trim()
  if (e.startsWith('{')) {
    for (let kv of e.replace(/^\{|\}$/g, '').split(',')) {
      kv = kv.trim()
      if (!kv) continue
      const kvm = kv.match(/^'?([\w-]+)'?\s*:/)
      if (kvm) set.add(kvm[1])
      else {
        const simple = kv.match(/^'?([\w-]+)'?$/)
        if (simple) set.add(simple[1])
      }
    }
  }
  for (const s of e.matchAll(/'([\w-]+)'/g)) {
    if (!['true', 'false'].includes(s[1])) set.add(s[1])
  }
}

function elementClasses(attrs) {
  const out = []
  const s = attrs.match(/(?<![:@\w])class="([^"]*)"/)
  if (s) out.push(...s[1].trim().split(/\s+/).filter(Boolean))
  const b = attrs.match(/(?::class|v-bind:class)="([^"]+)"/)
  if (b) {
    const e = b[1].trim()
    if (e.startsWith('{')) {
      for (let kv of e.replace(/^\{|\}$/g, '').split(',')) {
        kv = kv.trim()
        if (!kv) continue
        const kvm = kv.match(/^'?([\w-]+)'?\s*:/)
        if (kvm) out.push(kvm[1])
        else {
          const simple = kv.match(/^'?([\w-]+)'?$/)
          if (simple) out.push(simple[1])
        }
      }
    }
    for (const s of e.matchAll(/'([\w-]+)'/g)) {
      if (!['true', 'false'].includes(s[1])) out.push(s[1])
    }
  }
  return out
}

// 配对提取最外层 <template>...</template>
function extractTemplate(src) {
  const openTag = '<template>'
  const start = src.indexOf(openTag)
  if (start < 0) return null
  let i = start + openTag.length
  let depth = 1
  while (i < src.length && depth > 0) {
    const close = src.indexOf('</template>', i)
    if (close < 0) break
    let nextOpen = -1
    const re = /<template\b/g
    re.lastIndex = i
    const m = re.exec(src)
    if (m && m.index < close) nextOpen = m.index
    if (nextOpen >= 0) {
      depth++
      i = nextOpen + '<template'.length
    } else {
      depth--
      i = close + '</template>'.length
    }
  }
  return src.slice(start + openTag.length, i - '</template>'.length)
}

// 构建 类名 -> 祖先类链 映射
function buildPathMap(tpl) {
  const map = new Map()
  const stack = []
  let i = 0
  const n = tpl.length
  const voids = new Set([
    'img',
    'br',
    'hr',
    'input',
    'meta',
    'link',
    'source',
    'area',
    'base',
    'col',
    'embed',
    'track',
    'wbr'
  ])
  while (i < n) {
    const c = tpl[i]
    if (c === '<') {
      if (tpl.startsWith('<!--', i)) {
        const e = tpl.indexOf('-->', i)
        i = e < 0 ? n : e + 3
        continue
      }
      if (tpl[i + 1] === '/') {
        const m = tpl.slice(i).match(/^<\/([\w-]+)\s*>/)
        if (m) {
          for (let k = stack.length - 1; k >= 0; k--) {
            if (stack[k].tag === m[1]) {
              stack.length = k
              break
            }
          }
          i += m[0].length
          continue
        }
      }
      const m = tpl.slice(i).match(/^<([\w-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/)
      if (m) {
        const [, tag, attrs] = m
        const selfClosing = /\/\s*>$/.test(m[0])
        const classes = elementClasses(attrs)
        if (classes.length) {
          const chain = stack.map((s) => s.firstClass).filter(Boolean)
          for (const cls of classes) {
            if (!map.has(cls)) map.set(cls, [])
            const key = JSON.stringify(chain)
            if (!map.get(cls).some((e) => JSON.stringify(e.chain) === key)) {
              map.get(cls).push({ chain: [...chain] })
            }
          }
        }
        if (!selfClosing && !voids.has(tag)) {
          stack.push({ tag, firstClass: classes[0] })
        }
        i += m[0].length
        continue
      }
    }
    i++
  }
  return map
}

// 多实例类的公共祖先链
function commonChain(entries) {
  if (!entries.length) return []
  const chains = entries.map((e) => e.chain)
  const minLen = Math.min(...chains.map((c) => c.length))
  const L = []
  for (let i = 0; i < minLen; i++) {
    const v = chains[0][i]
    if (chains.every((c) => c[i] === v)) L.push(v)
    else break
  }
  return L
}

// 需要人工指定的根类（模板无法静态确定）
const ROOT_OVERRIDES = {
  'VPLocalNav.vue': {
    root: 'VPLocalNav',
    rootSet: new Set(['VPLocalNav', 'has-sidebar', 'empty', 'fixed'])
  }
}

// ---------------------------------------------------------------------------
// 选择器转换（完整路径链）
// ---------------------------------------------------------------------------
function transformSelector(selector, ctx) {
  let ast
  try {
    ast = selectorParser().astSync(selector)
  } catch {
    return selector
  }
  for (const sel of ast.nodes) completeSelector(sel, ctx)
  return ast.toString()
}

function completeSelector(sel, ctx) {
  const { root, rootSet, pathMap } = ctx
  if (!root) return
  const nodes = sel.nodes

  // ---- 1. 找 :deep / :slotted ----
  let deepIdx = -1
  let deepPseudo = null
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (
      n.type === 'pseudo' &&
      (n.value === ':deep' || n.value === ':slotted')
    ) {
      deepIdx = i
      deepPseudo = n
      break
    }
  }

  // :deep 前最后一个复合（伪类前，不含伪类）
  let deepPrefixComp = null
  if (deepPseudo) {
    const prefix = nodes.slice(0, deepIdx)
    const comps = splitCompounds(prefix)
    deepPrefixComp = comps.compounds[comps.compounds.length - 1] || null
  }

  // ---- 2. 替换 :deep/:slotted 为内容 ----
  if (deepPseudo) {
    const params = deepPseudo.nodes ? [...deepPseudo.nodes] : []
    if (params.length) deepPseudo.replaceWith(...params)
    else deepPseudo.remove()
  }

  // ---- 3. 逐复合补链 ----
  const { compounds, starts } = splitCompounds(nodes)
  const fullText = () => nodes.map((n) => n.toString()).join('')

  for (let ci = 0; ci < compounds.length; ci++) {
    const comp = compounds[ci]
    const firstClass = comp.find((n) => n.type === 'class')
    if (!firstClass) continue // 无类复合（:root、tag、:deep 内容等）
    const T = firstClass.value
    if (!pathMap.has(T)) continue // 外部类（.dark 等）
    const entries = pathMap.get(T)
    const chain = commonChain(entries)

    // 根元素类（含条件类）→ 根类复合拼接（如 .group.no-transition）
    if (rootSet.has(T)) {
      if (!fullText().includes(`.${root}`)) {
        const clsNode = selectorParser.className({ value: root })
        nodes.splice(starts[ci], 0, clsNode)
      }
      continue
    }
    if (!chain.length) continue // 根类自身

    // 检查链是否已覆盖
    const text = fullText()
    let matched = 0
    for (const cls of chain) {
      if (new RegExp(`\\.${cls}(?![\\w-])`).test(text)) matched++
      else break
    }
    if (matched === chain.length) continue

    const missing = chain.slice(matched)
    const insert = []
    for (const cls of missing) {
      insert.push(selectorParser.className({ value: cls }))
      insert.push(selectorParser.combinator({ value: ' ' }))
    }
    nodes.splice(starts[ci], 0, ...insert)
  }

  // ---- 4. :deep 前无任何复合 → 内容类补链或根类前缀 ----
  if (deepPseudo && !deepPrefixComp) {
    // 检查替换后第一个复合是否含模板类（:deep 内容第一类）
    const after = splitCompounds(nodes)
    const firstComp = after.compounds[0]
    if (firstComp) {
      const fc = firstComp.find((n) => n.type === 'class')
      if (fc && pathMap.has(fc.value)) {
        const chain = commonChain(pathMap.get(fc.value))
        if (chain.length) {
          const insert = []
          for (const cls of chain) {
            insert.push(selectorParser.className({ value: cls }))
            insert.push(selectorParser.combinator({ value: ' ' }))
          }
          nodes.splice(0, 0, ...insert)
          return
        }
      }
    }
    // 内容类不在模板（其他组件）→ 根类前缀
    const text = nodes.map((n) => n.toString()).join('')
    if (
      !text.includes(`.${root}`) &&
      !nodes.some((n) => n.type === 'class' && n.value === root)
    ) {
      nodes.splice(
        0,
        0,
        selectorParser.className({ value: root }),
        selectorParser.combinator({ value: ' ' })
      )
    }
  }
}

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

function srcPath(f) {
  return EXTRA_FILES.includes(f) ? f : join(DIR, f)
}

const results = []
const skipped = []

for (const f of files.sort()) {
  const src = readFileSync(srcPath(f), 'utf8')
  const styleMatch = src.match(/<style([^>]*)>([\s\S]*?)<\/style>/)
  let attrs = ''
  let css = ''
  let scoped = false
  if (styleMatch) {
    attrs = styleMatch[1]
    css = styleMatch[2]
    scoped = attrs.includes('scoped')
  } else {
    // 已提取状态：以当前 css 为输入做完整路径链补全（模板提供路径）
    const cssFile = join(
      OUT,
      `${f
        .replace(/\.vue$/, '')
        .split(/[\\/]/)
        .pop()}.css`
    )
    if (existsSync(cssFile)) {
      css = readFileSync(cssFile, 'utf8')
      scoped = true
    } else {
      skipped.push(f)
      continue
    }
  }
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

  const tmpl = extractTemplate(src)
  const pathMap = tmpl ? buildPathMap(tmpl) : new Map()
  const compName = f
    .replace(/\.vue$/, '')
    .split(/[\\/]/)
    .pop()
  // 根元素类集合（静态类在前，首个为根类；无静态类时组件名兜底）
  const rootClasses = ROOT_OVERRIDES[f]
    ? [...ROOT_OVERRIDES[f].rootSet]
    : collectRootClasses(tmpl, compName)
  const root = ROOT_OVERRIDES[f]
    ? ROOT_OVERRIDES[f].root
    : rootClasses[0] || null
  if (!root) {
    skipped.push(`${f} (no root class!)`)
    continue
  }
  const rootSet = new Set(rootClasses)

  let rootNode
  try {
    rootNode = postcss.parse(css)
  } catch (e) {
    skipped.push(`${f} (parse error: ${e.message})`)
    continue
  }

  let changed = 0
  rootNode.walkRules((rule) => {
    if (rule.parent && rule.parent.type === 'rule') return // 嵌套规则保留
    const old = rule.selector
    const next = transformSelector(old, { root, rootSet, pathMap })
    if (next !== old) {
      rule.selector = next
      changed++
    }
  })
  results.push({ file: f, outName, css: rootNode.toString(), root, changed })
}

// 收集根元素类：静态类在前（首个为根类），:class 条件类在后；无静态类时用组件名兜底
function collectRootClasses(tmpl, fallback) {
  const out = []
  if (!tmpl) return [fallback]
  const tagRe = /<((?!\/)[\w-]+)\b([^>]*)>/g
  let m
  while ((m = tagRe.exec(tmpl))) {
    const [, tag, attrs] = m
    if (CONTAINER_TAGS.has(tag)) continue
    const s = attrs.match(/(?<![:@\w])class="([^"]*)"/)
    if (s) out.push(...s[1].trim().split(/\s+/).filter(Boolean))
    const b = attrs.match(/(?::class|v-bind:class)="([^"]+)"/)
    if (b && b[1].trim().startsWith('{')) {
      for (const c of classExprKeys(b[1])) out.push(c)
    }
    break
  }
  if (!out.length) out.push(fallback)
  return [...new Set(out)]
}

// 提取 :class 表达式中的类名键（对象键 + 字符串字面量）
function classExprKeys(expr) {
  const out = []
  const e = expr.trim()
  if (e.startsWith('{')) {
    for (let kv of e.replace(/^\{|\}$/g, '').split(',')) {
      kv = kv.trim()
      if (!kv) continue
      const kvm = kv.match(/^'?([\w-]+)'?\s*:/)
      if (kvm) out.push(kvm[1])
      else {
        const simple = kv.match(/^'?([\w-]+)'?$/)
        if (simple) out.push(simple[1])
      }
    }
  }
  for (const s of e.matchAll(/'([\w-]+)'/g)) {
    if (!['true', 'false'].includes(s[1])) out.push(s[1])
  }
  return out
}

// ---- 输出 ----
console.log(`==== 提取计划（${results.length} 个文件）====`)
for (const r of results) {
  const nm = r.outName.split(/[\\/]/).pop()
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
  for (const r of results) {
    writeFileSync(r.outName, `${r.css.trimStart().replace(/\s+$/, '')}\n`)
  }
  console.log(`\n已写入 ${results.length} 个 CSS 文件到 ${OUT}`)

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

  const wf = 'src/client/theme-default/without-fonts.ts'
  const wfSrc = readFileSync(wf, 'utf8')
  const componentCss = readdirSync(OUT)
    .filter((x) => /^[A-Z][\w-]*\.css$/.test(x))
    .sort()
  const newImports = componentCss
    .map((x) => `import './styles/components/${x}'`)
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
