export default {
  title: 'Test Site',
  description: 'Test description',
  base: '/',
  lang: 'en',
  dir: 'ltr',
  cleanUrls: false,
  locales: {},
  themeConfig: {
    nav: [
      {
        text: 'Guide',
        link: '/guide/what-is-vitepress',
        activeMatch: '/guide/'
      },
      {
        text: 'Reference',
        link: '/reference/site-config',
        activeMatch: '/reference/'
      },
      {
        text: '1.6.4',
        items: [
          { text: 'v1', link: 'https://example.com/v1/' },
          { text: 'Changelog', link: 'https://example.com/CHANGELOG.md' }
        ]
      }
    ]
  },
  appearance: false,
  lastUpdated: false,
  router: { prefetchLinks: false }
}
