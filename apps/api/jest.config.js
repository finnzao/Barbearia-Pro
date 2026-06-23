module.exports = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  maxWorkers: 1,
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '\\.(spec|int-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/support/jest.setup.ts'],
  globalSetup: '<rootDir>/test/support/global-setup.js',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.int-spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};
