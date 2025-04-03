module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  testMatch: [
    '<rootDir>/tests/**/*.spec.[jt]s?(x)'
  ],
  setupFiles: ['fake-indexeddb/auto']
}
