module.exports = {
  title: 'swrv',
  description: 'swrv',
  head: [['link', { rel: 'icon', type: 'image/png', href: 'https://2tjosk2rxzc21medji3nfn1g-wpengine.netdna-ssl.com/wp-content/uploads/2018/08/kong-logomark-color-64px.png' }]],
  themeConfig: {
    repo: 'kong/swrv',
    logo: '/logo_45.png',
    heroImage: '/logo_45.png',
    docsDir: 'docs',
    editLinks: true,
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/configuration' }
    ],
    sidebar: [
      {
        title: 'Guide',
        collapsable: false,
        children: [
          {
            title: 'Getting Started',
            path: '/guide/getting-started'
          }
        ]
      },
      {
        title: 'APIs',
        collapsable: false,
        children: [
          {
              title: 'Configuration',
              path: '/configuration'
            },
            {
              title: 'Features',
              path: '/features'
            }
        ]
      }
    ],
    sidebarOld: {
      '/': [
        {
          text: 'Guide',
          children: [
            {
              text: 'Getting Started',
              link: '/guide/getting-started'
            },
          ]
        },
        {
          text: 'APIs',
          children: [
            {
              text: 'Configuration',
              link: '/configuration'
            },
            {
              text: 'Features',
              link: '/features'
            },
          ]
        }
      ]
    }
  }
}
