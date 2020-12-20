module.exports = {
  preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
  setupFiles: ['<rootDir>/tests/setupJest.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.spec.[jt]s?(x)'
  ]
}
