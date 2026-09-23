import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.config({ extends: ['next/core-web-vitals', 'next/typescript'] }),
  { rules: { '@typescript-eslint/no-explicit-any': 'warn', '@typescript-eslint/no-require-imports': 'warn', '@typescript-eslint/no-empty-object-type': 'warn' } },
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'next-env.d.ts'] },
];
