import path from 'path'
import webpack from 'webpack'
import MemoryFS from 'memory-fs'

export function compileWithWebpack (file, extraConfig, cb) {
  const config = {
    mode: 'development',
    entry: path.resolve(__dirname, 'fixtures', file),
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader'
        }
      ]
    },
    ...extraConfig
  }

  const compiler = webpack(config)

  // ---------
  // Comment these lines out if you want to see an actual file
  const fs = new MemoryFS()
  compiler.outputFileSystem = fs
  // ---------

  compiler.run((err, stats) => {
    expect(err).toBeFalsy()
    expect(stats.errors).toBeFalsy()
    cb(fs)
  })
}
