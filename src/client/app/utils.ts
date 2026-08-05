import { lazy, onBeforeUnmount } from 'actview'
import {
  EXTERNAL_URL_RE,
  inBrowser,
  sanitizeFileName,
  type Awaitable
} from '../shared'
import { siteDataRef } from './data'

export { escapeHtml as _escapeHtml, inBrowser } from '../shared'

/**
 * Join two paths by resolving the slash collision.
 */
export function joinPath(base: string, path: string) {
  return `${base}${path}`.replace(/\/+/g, '/')
}

/**
 * Append base to internal (non-relative) urls
 */
export function withBase(path: string) {
  return EXTERNAL_URL_RE.test(path) || !path.startsWith('/')
    ? path
    : joinPath(siteDataRef.value.base, path)
}

/**
 * Converts a url path to the corresponding js chunk filename.
 */
export function pathToFile(path: string) {
  let pagePath = path.replace(/\.html$/, '')
  pagePath = decodeURIComponent(pagePath)
  pagePath = pagePath.replace(/\/$/, '/index') // /foo/ -> /foo/index
  if (import.meta.env.DEV) {
    // always force re-fetch content in dev
    pagePath += `.md?t=${Date.now()}`
  } else {
    // in production, each .md file is built into a .md.js file following
    // the path conversion scheme.
    // /foo/bar.html -> ./foo_bar.md
    if (inBrowser) {
      const base = import.meta.env.BASE_URL
      pagePath =
        sanitizeFileName(
          pagePath.slice(base.length).replace(/\//g, '_') || 'index'
        ) + '.md'
      // client production build needs to account for page hash, which is
      // injected directly in the page's html
      let pageHash = __VP_HASH_MAP__[pagePath.toLowerCase()]
      if (!pageHash) {
        pagePath = pagePath.endsWith('_index.md')
          ? pagePath.slice(0, -9) + '.md'
          : pagePath.slice(0, -3) + '_index.md'
        pageHash = __VP_HASH_MAP__[pagePath.toLowerCase()]
      }
      if (!pageHash) return null
      pagePath = `${base}${__ASSETS_DIR__}/${pagePath}.${pageHash}.js`
    } else {
      // ssr build uses much simpler name mapping
      pagePath = `./${sanitizeFileName(
        pagePath.slice(1).replace(/\//g, '_')
      )}.md.js`
    }
  }

  return pagePath
}

export let contentUpdatedCallbacks: (() => any)[] = []

/**
 * Register callback that is called every time the markdown content is updated
 * in the DOM.
 *
 * ActView 版：组件 setup 内调用时，卸载时自动清理（onBeforeUnmount）；
 * 组件外调用会 console.warn（ActView 生命周期限制），回调不清理。
 */
export function onContentUpdated(fn: () => any) {
  contentUpdatedCallbacks.push(fn)
  onBeforeUnmount(() => {
    contentUpdatedCallbacks = contentUpdatedCallbacks.filter((f) => f !== fn)
  })
}

/**
 * 异步加载并渲染客户端组件。
 *
 * ActView 版：基于 lazy() 的异步组件；args（props）暂不支持透传
 * （ActView lazy 无 props 通道，主题迁移后如需 props 请直接使用 lazy）。
 */
export function defineClientComponent(
  loader: () => Promise<any>,
  _args?: any[],
  cb?: () => Awaitable<void>
) {
  return lazy(async () => {
    let res = await loader()
    // interop module default
    if (res && (res.__esModule || res[Symbol.toStringTag] === 'Module')) {
      res = res.default
    }
    await cb?.()
    return { default: res }
  })
}
