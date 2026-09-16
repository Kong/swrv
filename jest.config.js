module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  testMatch: [
    '<rootDir>/tests/**/*.spec.[jt]s?(x)'
  ],
  // Source imports carry the .js extension the emitted ESM needs, and jest's resolver
  // does not implement TypeScript's convention that .js means the .ts on disk. Still
  // required on jest 30; moving to vitest removes it.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}
