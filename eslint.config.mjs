import nextConfig from 'eslint-config-next';

export default [
  { ignores: ['**/._*', '.next/**', '.next.*/**', 'playwright-report/**', 'test-results/**'] },
  ...nextConfig,
  {
    rules: {
      '@next/next/no-assign-module-variable': 'warn',
      'react/display-name': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];
