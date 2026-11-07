// ESLint flat config for the React client.
//
// - @eslint/js recommended: likely bugs (undefined variables, unreachable
//   code, unused variables, ...).
// - eslint-plugin-react recommended (+ the new JSX runtime): React mistakes,
//   including react/no-danger and react/jsx-no-target-blank (links that
//   open a new tab without rel="noopener").
// - eslint-plugin-react-hooks recommended: the Rules of Hooks.
// - eslint-plugin-security recommended: security smells (eval, unsafe
//   regular expressions, object injection, ...).
//
// Only installed packages and the build output are ignored. Every source,
// test and config file is linted.
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React 19 removed propTypes checking: React ignores a component's
      // propTypes entirely, so this rule (still in eslint-plugin-react's
      // recommended set, which predates React 19) would only demand
      // declarations that never run. It is a type-documentation rule, not a
      // security rule. Every security, React and hooks rule stays on.
      'react/prop-types': 'off',
    },
  },
  {
    // Config files and build scripts run in Node.
    files: ['*.config.js', 'securityHeaders.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Tests run in Vitest (jsdom), which also provides Node globals.
    files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
