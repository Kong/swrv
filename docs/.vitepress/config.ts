import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'swrv',
  description: 'swrv',
  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#5bbad5' }],
  ],
  lastUpdated: true,
  themeConfig: {
    outline: [2, 3],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Kong/swrv'}
    ],
    logo: '/logo_45.png',
    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2020-present Kong, Inc.'
    },
    editLink: {
      pattern: 'https://github.com/Kong/swrv/edit/master/docs/:path',
      text: 'Edit this page on GitHub'
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide' },
      { text: 'Features', link: '/features' },
      { text: 'API Reference', link: '/configuration' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          {
            text: 'Getting Started',
            link: '/guide'
          },
          {
            text: 'Features',
            link: '/features'
          }
        ]
      },
      {
        text: 'APIs',
        items: [
          {
            text: 'Configuration',
            link: '/configuration'
          }
        ]
      }
    ],
    algolia: {
      appId: 'PN54XPFSKF',
      apiKey: '4dc7f3773a76d6375d2a286f647d02dc',
      indexName: 'swrv'
    },
  },
})
