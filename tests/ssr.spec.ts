import Vue from 'vue/dist/vue.runtime.common.js'
import path from 'path'
import VueCompositionApi from '@vue/composition-api'
import { createBundleRenderer } from 'vue-server-renderer'
import { compileWithWebpack } from './compile-with-webpack'

Vue.use(VueCompositionApi)
Vue.config.devtools = false
Vue.config.productionTip = false

// increase default timeout to account for webpack builds
jest.setTimeout(10000)

export function createRenderer (file, options, cb) {
  compileWithWebpack(file, {
    target: 'node',
    devtool: false,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      libraryTarget: 'umd'
    },
    externals: [require.resolve('vue/dist/vue.runtime.common.js')]
  }, fs => {
    const bundle = fs.readFileSync(path.resolve(__dirname, 'dist/bundle.js'), 'utf-8')
    const renderer = createBundleRenderer(bundle, options)
    cb(renderer)
  })
}

describe('SSR', () => {
  it('should fetch server-side', async done => {
    createRenderer('app.js', {}, renderer => {
      renderer.renderToString({}, (err, res) => {
        expect(err).toBeNull()
        expect(res).toBe('<div data-server-rendered="true">data:foo</div>')
        done()
      })
    })
  })
})
