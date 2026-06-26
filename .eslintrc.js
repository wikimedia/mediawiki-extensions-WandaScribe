module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    'vue'
  ],
  rules: {
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],
    'vue/multi-word-component-names': 'off',
    'no-console': 'off'
  },
  globals: {
    mw: 'readonly',
    $: 'readonly',
    jQuery: 'readonly',
    ve: 'readonly'
  }
};
