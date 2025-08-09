module.exports = {
    env: {
        node: true,
        es2022: true,
        jest: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:node/recommended',
    ],
    plugins: ['node'],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    rules: {
        'no-console': 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
        'template-curly-spacing': 'error',
        'arrow-spacing': 'error',
        'comma-dangle': ['error', 'always-multiline'],
        'semi': ['error', 'always'],
        'quotes': ['error', 'single'],
        'indent': ['error', 2],
        'node/no-unsupported-features/es-syntax': 'off',
        'node/no-missing-import': 'off',
    },
};