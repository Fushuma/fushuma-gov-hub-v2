import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      // Stylistic noise in JSX copy text (apostrophes, quotes)
      'react/no-unescaped-entities': 'off',
      // Pre-existing debt, tracked as warnings until cleaned up
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
      // Perf hint from the React Compiler rules; flags legitimate
      // mount-time initialization and event-driven effects
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'coverage/**',
      'subgraph/**',
      'next-env.d.ts',
    ],
  },
];

export default eslintConfig;
