/* global module */
/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'mjs', 'json'],
    clearMocks: true,

    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
            },
        ],
        '^.+\\.[cm]?js$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!(intl-messageformat|@formatjs)/)'],

    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/index.ts',
        '!src/routes/**',
        '!src/dev/**',
        '!src/server.ts',
        '!src/db/**',
    ],

    coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/', '/@types/'],

    coverageThreshold: {
        global: {
            statements: 40,
            branches: 30,
            functions: 40,
            lines: 40,
        },
    },
};
