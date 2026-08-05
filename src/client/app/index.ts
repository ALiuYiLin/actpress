import RawTheme from '@theme/index'
import { createElement } from '@actview/jsx'
import {
  createApp as createActViewApp,
  defineComponent,
  onMounted,
  watchEffect
} from 'actview'
import { Content } from './components/Content'
import { useCodeGroups } from './composables/codeGroups'
import { useCopyCode } from './composables/copyCode'
import { useUpdateHead } from './composables/head'
import { usePrefetch } from './composables/preFetch'
import { initData, siteDataRef, useData } from './data'
import { createRouter, scrollTo, type Router } from './router'
import { inBrowser, pathToFile } from './utils'

function resolveThemeExtends(theme: typeof RawTheme): typeof RawTheme {
  if (theme.extends) {
    const base = resolveThemeExtends(theme.extends)
    return {
      ...base,
      ...theme,
      async enhanceApp(ctx) {
        if (base.enhanceApp) await base.enhanceApp(ctx)
        if (theme.enhanceApp) await theme.enhanceApp(ctx)
      }
    }
  }
  return theme
}

const Theme = resolveThemeExtends(RawTheme)

const VitePressApp = defineComponent(function (props: any) {
  const { site, lang, dir } = useData()

  // change the language on the HTML element based on the current lang
  onMounted(() => {
    watchEffect(() => {
      document.documentElement.lang = lang.value
      document.documentElement.dir = dir.value
    })
  })

  if (import.meta.env.PROD && site.value.router.prefetchLinks) {
    // in prod mode, enable intersectionObserver based pre-fetch
    usePrefetch()
  }

  // setup global copy code handler
  useCopyCode()
  // setup global code groups handler
  useCodeGroups()

  if (Theme.setup) Theme.setup()

  return function () {
    return createElement(Theme.Layout ?? Content, null)
  }
})

export async function createApp() {
  ;(globalThis as any).__VITEPRESS__ = true

  const router = newRouter()

  const app = createActViewApp(VitePressApp)

  const data = initData(router.route)

  if (Theme.enhanceApp) {
    await Theme.enhanceApp({
      app,
      router,
      siteData: siteDataRef
    })
  }

  return { app, router, data }
}

function newRouter(): Router {
  let isInitialPageLoad = inBrowser

  return createRouter((path) => {
    let pageFilePath = pathToFile(path)
    let pageModule = null

    if (pageFilePath) {
      // use lean build if this is the initial page load
      if (isInitialPageLoad) {
        pageFilePath = pageFilePath.replace(/\.js$/, '.lean.js')
      }

      if (import.meta.env.DEV) {
        pageModule = import(/*@vite-ignore*/ pageFilePath).catch((e) => {
          // page load could fail for other reasons, don't swallow
          console.error(e)
          // try with/without trailing slash
          // in prod this is handled in src/client/app/utils.ts#pathToFile
          const url = new URL(pageFilePath!, 'http://a.com')
          const path =
            (url.pathname.endsWith('/index.md')
              ? url.pathname.slice(0, -9) + '.md'
              : url.pathname.slice(0, -3) + '/index.md') +
            url.search +
            url.hash
          return import(/*@vite-ignore*/ path)
        })
      } else {
        pageModule = import(/*@vite-ignore*/ pageFilePath)
      }
    }

    if (inBrowser) {
      isInitialPageLoad = false
    }

    return pageModule
  })
}

if (inBrowser) {
  createApp().then(({ app, router, data }) => {
    // wait until page component is fetched before mounting
    router.go(location.href, { initialLoad: true }).then(() => {
      // dynamically update head tags
      useUpdateHead(router.route, data.site)
      app.mount('#app')

      // scroll to hash on new tab during dev
      if (import.meta.env.DEV && location.hash) {
        setTimeout(() => scrollTo(location.hash), 100)
      }
    })
  })
}
