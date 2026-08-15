import { getIconsCSS } from '@iconify/utils'
import fs from 'fs-extra'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import pMap from 'p-map'
import * as vite from 'vite'
import type { BuildOptions, Rollup } from 'vite'
import { resolveConfig, type SiteConfig } from '../config'
import { clearCache } from '../markdownToActView'
import {
  normalizeBase,
  slash,
  type Awaitable,
  type HeadConfig
} from '../shared'
import { deserializeFunctions, serializeFunctions } from '../utils/fnSerialize'
import { task } from '../utils/task'
import { bundle } from './bundle'
import { generateSitemap } from './generateSitemap'
import { renderPage } from './render'

const require = createRequire(import.meta.url)

export async function build(
  root?: string,
  buildOptions: BuildOptions & {
    base?: string
    onAfterConfigResolve?: (siteConfig: SiteConfig) => Awaitable<void>
  } = {}
) {
  const start = Date.now()

  // @ts-ignore only exists for rolldown-vite
  if (vite.rolldownVersion) {
    try {
      await import('oxc-minify')
    } catch {
      throw new Error(
        '`oxc-minify` is not installed.' +
          ' vitepress requires `oxc-minify` to be installed when rolldown-vite is used.' +
          ' Please run `npm install oxc-minify`.'
      )
    }
  }

  process.env.NODE_ENV = 'production'
  const siteConfig = await resolveConfig(root, 'build', 'production')

  await buildOptions.onAfterConfigResolve?.(siteConfig)
  delete buildOptions.onAfterConfigResolve

  if (buildOptions.base) {
    // `--base` from the CLI (e.g. GitHub Pages `base_path`) may lack a
    // trailing slash; normalize it or naive `base + fileName` concatenation
    // below would produce broken URLs like `/repoassets/app.js`.
    siteConfig.site.base = normalizeBase(buildOptions.base)
    delete buildOptions.base
  }

  if (buildOptions.outDir) {
    siteConfig.outDir = path.resolve(process.cwd(), buildOptions.outDir)
    delete buildOptions.outDir
  }

  try {
    const { clientResult, pageToHashMap } = await bundle(
      siteConfig,
      buildOptions
    )

    if (process.env.BUNDLE_ONLY) {
      return
    }

    const entryPath = path.join(siteConfig.tempDir, 'app.js')
    const { render } = await import(pathToFileURL(entryPath).href)

    await task('rendering pages', async () => {
      const appChunk =
        clientResult &&
        (clientResult.output.find(
          (chunk) =>
            chunk.type === 'chunk' &&
            chunk.isEntry &&
            chunk.facadeModuleId?.endsWith('.js')
        ) as Rollup.OutputChunk)

      const cssChunk = clientResult!.output.find(
        (chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.css')
      ) as Rollup.OutputAsset

      const assets = clientResult!.output
        .filter(
          (chunk) => chunk.type === 'asset' && !chunk.fileName.endsWith('.css')
        )
        .map((asset) => siteConfig.site.base + asset.fileName)

      // default theme special handling: inject font preload
      // custom themes will need to use `transformHead` to inject this
      const additionalHeadTags: HeadConfig[] = []
      const isDefaultTheme =
        clientResult &&
        clientResult.output.some(
          (chunk) =>
            chunk.type === 'chunk' &&
            // @ts-ignore only exists for rolldown-vite
            (vite.rolldownVersion || chunk.name === 'theme') && // FIXME: remove when rolldown-vite supports manualChunks
            chunk.moduleIds.some((id) => id.includes('client/theme-default'))
        )

      const metadataScript = generateMetadataScript(pageToHashMap, siteConfig)

      if (isDefaultTheme) {
        const fontURL = assets.find((file) =>
          /inter-roman-latin\.[\w-]+\.woff2/.test(file)
        )
        if (fontURL) {
          additionalHeadTags.push([
            'link',
            {
              rel: 'preload',
              href: fontURL,
              as: 'font',
              type: 'font/woff2',
              crossorigin: ''
            }
          ])
        }
      }

      const usedIcons = new Set<string>()

      await pMap(
        ['404.md', ...siteConfig.pages],
        async (page) => {
          await renderPage(
            render,
            siteConfig,
            siteConfig.rewrites.map[page] || page,
            clientResult,
            appChunk,
            cssChunk,
            assets,
            pageToHashMap,
            metadataScript,
            additionalHeadTags,
            usedIcons
          )
        },
        // ActView 的 router/data 是模块级单例（无 provide/inject），并发渲染
        // 会串页（页面组件/内容互相污染）→ 串行渲染
        { concurrency: 1 }
      )

      const icons = require('@iconify-json/simple-icons/icons.json')
      const iconsCss = getIconsCSS(icons, Array.from(usedIcons).sort(), {
        iconSelector: '.vpi-social-{name}',
        commonSelector: '.vpi-social',
        varName: 'icon',
        format: process.env.DEBUG ? 'expanded' : 'compressed',
        mode: 'mask'
      }).replace(/[^]*?}\n*/, '')

      fs.writeFileSync(path.join(siteConfig.outDir, 'vp-icons.css'), iconsCss)
    })

    // emit page hash map for the case where a user session is open
    // when the site got redeployed (which invalidates current hash map)
    fs.writeJSONSync(
      path.join(siteConfig.outDir, 'hashmap.json'),
      pageToHashMap
    )
  } finally {
    if (!process.env.DEBUG) {
      fs.rmSync(siteConfig.tempDir, {
        recursive: true,
        force: true,
        maxRetries: 10
      })
    }
  }

  await generateSitemap(siteConfig)
  await siteConfig.buildEnd?.(siteConfig)
  clearCache()

  siteConfig.logger.info(
    `build complete in ${((Date.now() - start) / 1000).toFixed(2)}s.`
  )
}

function generateMetadataScript(
  pageToHashMap: Record<string, string>,
  config: SiteConfig
) {
  // We embed the hash map and site config strings into each page directly
  // so that it doesn't alter the main chunk's hash on every build.
  // It's also embedded as a string and JSON.parsed from the client because
  // it's faster than embedding as JS object literal.
  const hashMapString = JSON.stringify(JSON.stringify(pageToHashMap))
  const siteDataString = JSON.stringify(
    JSON.stringify(serializeFunctions({ ...config.site, head: [] }))
  )

  const metadataContent = `window.__VP_HASH_MAP__=JSON.parse(${hashMapString});${
    siteDataString.includes('_vp-fn_')
      ? `${deserializeFunctions};window.__VP_SITE_DATA__=deserializeFunctions(JSON.parse(${siteDataString}));`
      : `window.__VP_SITE_DATA__=JSON.parse(${siteDataString});`
  }`

  if (!config.metaChunk) {
    return { html: `<script>${metadataContent}</script>`, inHead: false }
  }

  const metadataFile = path.join(
    config.assetsDir,
    'chunks',
    `metadata.${createHash('sha256')
      .update(metadataContent)
      .digest('hex')
      .slice(0, 8)}.js`
  )

  const resolvedMetadataFile = path.join(config.outDir, metadataFile)
  const metadataFileURL = slash(`${config.site.base}${metadataFile}`)

  fs.ensureDirSync(path.dirname(resolvedMetadataFile))
  fs.writeFileSync(resolvedMetadataFile, metadataContent)

  return {
    html: `<script type="module" src="${metadataFileURL}"></script>`,
    inHead: true
  }
}
