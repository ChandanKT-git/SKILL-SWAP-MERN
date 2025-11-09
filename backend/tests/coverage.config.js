module.exports = {
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/**',
        '!**/node_modules/**',
        '!**/tests/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 80,
            statements: 80,
        },
        './src/controllers/': {
            branches: 75,
            functions: 80,
            lines: 85,
            statements: 85,
        },
        './src/services/': {
            branches: 75,
            functions: 80,
            lines: 85,
            statements: 85,
        },
        './src/utils/': {
            branches: 80,
            functions: 85,
            lines: 90,
            statements: 90,
        },
    },
};
