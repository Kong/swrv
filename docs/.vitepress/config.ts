import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'swrv',
  description: 'swrv',
  head: [['link', { rel: 'icon', type: 'image/png', href: 'https://2tjosk2rxzc21medji3nfn1g-wpengine.netdna-ssl.com/wp-content/uploads/2018/08/kong-logomark-color-64px.png' }]],
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
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/configuration' }
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          {
            text: 'Getting Started',
            link: '/guide/getting-started'
          }
        ]
      },
      {
        text: 'APIs',
        items: [
          {
              text: 'Configuration',
              link: '/configuration'
            },
            {
              text: 'Features',
              link: '/features'
            }
        ]
      }
    ]
  }
})
