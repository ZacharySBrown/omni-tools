import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'tests/reference-diagrams/'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // Tests may use @ts-expect-error for intentional type violations
      '@typescript-eslint/ban-ts-comment': 'off',
      // Tests may use any for mocking
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
