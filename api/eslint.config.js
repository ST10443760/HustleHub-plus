// ESLint flat config for the API (CommonJS, Node 22).
//
// - @eslint/js recommended: likely bugs (undefined variables, unreachable
//   code, unused variables, ...).
// - eslint-plugin-security recommended: Node security smells (eval, unsafe
//   regular expressions, non-literal fs paths and require calls, timing
//   attacks, object injection, ...).
//
// Only installed packages and generated output are ignored. Every source,
// script and test file is linted.
const js = require('@eslint/js');
const globals = require('globals');
const security = require('eslint-plugin-security');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
