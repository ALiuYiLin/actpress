#!/usr/bin/env node
/**
 * 将 package.json 中 @actview/* 与 actview 的版本更新为 npm 上最新版本。
 *
 * 用法：
 *   node scripts/update-actview.js            # 查询最新版本并写回 package.json
 *   node scripts/update-actview.js --dry-run  # 只打印将要发生的变更，不修改文件
 *
 * 说明：
 *   - 扫描 dependencies / devDependencies / peerDependencies / optionalDependencies
 *   - 保留原有版本前缀（^ 或 ~）；无前缀则写入精确版本
 *   - 可通过环境变量 NPM_REGISTRY 指定 registry（默认 https://registry.npmjs.org）
 *   - 任一包查询失败时不会写回任何内容
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkgPath = resolve(rootDir, 'package.json')
const registry = (
  process.env.NPM_REGISTRY ?? 'https://registry.npmjs.org'
).replace(/\/+$/, '')

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies'
]
const isActviewPkg = (name) =>
  name === 'actview' || name.startsWith('@actview/')

/** 保留旧版本号的前缀（^ 或 ~），其余替换为最新版本 */
function withPrefix(oldVersion, latest) {
  const prefix = /^[~^]/.exec(oldVersion)?.[0] ?? ''
  return `${prefix}${latest}`
}

/** 查询某个包在 npm 上的最新版本 */
async function fetchLatest(name) {
  const url = `${registry}/${name}/latest`
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`查询 ${name} 失败: HTTP ${res.status} (${url})`)
  }
  const data = await res.json()
  if (!data.version)
    throw new Error(`查询 ${name} 失败: 响应中没有 version 字段`)
  return data.version
}

const dryRun = process.argv.includes('--dry-run')

// 收集所有需要更新的依赖
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const targets = []
for (const field of DEP_FIELDS) {
  for (const [name, version] of Object.entries(pkg[field] ?? {})) {
    if (isActviewPkg(name)) targets.push({ field, name, version })
  }
}

if (targets.length === 0) {
  console.log('package.json 中未找到 @actview/* 或 actview 依赖，无需更新。')
  process.exit(0)
}

console.log(`发现 ${targets.length} 个待检查的包：`)
for (const t of targets) console.log(`  ${t.name}@${t.version}`)
console.log(`正在从 ${registry} 查询最新版本…`)

// 全部查询成功后才写回，避免部分更新
const results = await Promise.all(
  targets.map(async (t) => ({ ...t, latest: await fetchLatest(t.name) }))
)

let changed = 0
for (const r of results) {
  const next = withPrefix(r.version, r.latest)
  if (next === r.version) {
    console.log(`  ✓ ${r.name} 已是最新 (${r.version})`)
    continue
  }
  pkg[r.field][r.name] = next
  console.log(`  ${r.name}: ${r.version} -> ${next}`)
  changed++
}

if (dryRun) {
  console.log('\n(--dry-run) 未修改任何文件。')
} else if (changed > 0) {
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  console.log(`\n已更新 ${changed} 个包，写回 ${pkgPath}`)
} else {
  console.log('\n所有包均已是最新版本，无需修改。')
}
