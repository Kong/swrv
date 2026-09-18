describe('swrv/testing', () => {
  it('installs swrvCachePlugin onto the real @vue/test-utils config', () => {
    let config: typeof import('@vue/test-utils').config
    let swrvCachePlugin: typeof import('../src/plugin').swrvCachePlugin

    jest.isolateModules(() => {
      require('../src/testing')
      config = require('@vue/test-utils').config
      swrvCachePlugin = require('../src/plugin').swrvCachePlugin
    })

    expect(config!.global.plugins).toContain(swrvCachePlugin!)
  })
})
