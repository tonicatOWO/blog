import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
        js.configs.recommended,

        {
                files: ['**/*.{ts,tsx}'],
                languageOptions: {
                        parser: tsParser,
                        parserOptions: {
                                ecmaVersion: 'latest',
                                sourceType: 'module',
                                project: './tsconfig.json'
                        }
                },
                plugins: {
                        '@typescript-eslint': tsPlugin
                },
                rules: {
                        ...tsPlugin.configs.recommended.rules,
                        '@typescript-eslint/no-unused-vars': [
                                'error',
                                {
                                        argsIgnorePattern: '^_',
                                        varsIgnorePattern: '^_',
                                        caughtErrorsIgnorePattern: '^_'
                                }
                        ],
                        '@typescript-eslint/no-explicit-any': 'warn',
                        '@typescript-eslint/explicit-function-return-type': 'off',
                        '@typescript-eslint/explicit-module-boundary-types': 'off',
                        '@typescript-eslint/no-empty-function': 'warn',
                        '@typescript-eslint/no-non-null-assertion': 'warn'
                }
        },

        {
                rules: {
                        'no-console': 'warn',
                        'no-debugger': 'error',
                        'no-unused-vars': [
                                'error',
                                {
                                        argsIgnorePattern: '^_',
                                        varsIgnorePattern: '^_',
                                        caughtErrorsIgnorePattern: '^_'
                                }
                        ],
                        'prefer-const': 'error',
                        'no-var': 'error',
                        'object-shorthand': 'error',
                        'prefer-arrow-callback': 'error',
                        'prefer-template': 'error',
                        'template-curly-spacing': 'error',
                        'arrow-spacing': 'error',
                        'prefer-rest-params': 'error',
                        'no-array-constructor': 'error',
                        'no-new-object': 'error',
                        'no-trailing-spaces': 'error',
                        'eol-last': 'error',
                        'no-multiple-empty-lines': ['error', { max: 1 }],
                        quotes: ['error', 'single', { avoidEscape: true }],
                        semi: ['error', 'always'],
                        'comma-dangle': ['error', 'never'],
                        indent: ['error', 'tab'],
                        'max-len': ['warn', { code: 100 }]
                }
        },

        {
                ignores: [
                        'dist/**',
                        'build/**',
                        'node_modules/**',
                        '.git/**',
                        'public/**',
                        '*.min.js',
                        '*.config.js',
                        '*.config.mjs',
                        '*.config.ts',
                        '.astro/**',
                        '.svelte-kit/**'
                ]
        }
];
