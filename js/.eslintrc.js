module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'standard',
    'plugin:mocha/recommended',
    'prettier'
  ],
  plugins: ['mocha'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2021
  },
  ignorePatterns: ['node_modules/', 'dist/'],
  rules: {}
}
