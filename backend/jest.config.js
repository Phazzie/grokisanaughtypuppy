/**
 * Jest Configuration for Backend Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage settings
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!tests/**/*.js',
    '!server.js', // Temporarily exclude until more integration tests added
    '!db.js', // Temporarily exclude until DB tests added
    '!analysisService.js', // Temporarily exclude until analysis tests added
    '!conversationParser.js', // Temporarily exclude until parser tests added
    '!swagger.js', // Config file, no tests needed
    '!routes/**/*.js', // Placeholder routes, not used yet
  ],
  coverageThreshold: {
    global: {
      branches: 40, // Progressive threshold - increase as coverage improves
      functions: 40,
      lines: 40,
      statements: 40,
    },
    // Specific thresholds for well-tested modules
    './middleware/*.js': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './utils/*.js': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
