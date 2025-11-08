/**
 * Jest Test Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.XAI_API_KEY = 'test-api-key';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.DB_POOL_MAX = '5';
process.env.DB_POOL_MIN = '1';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.ALLOWED_ORIGINS = 'http://localhost:4200';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// Global test utilities
global.testHelpers = {
  // Create mock request
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    id: 'test-request-id',
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
    ...overrides,
  }),

  // Create mock response
  mockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    return res;
  },

  // Create mock next function
  mockNext: () => jest.fn(),
};

// Suppress console output during tests (optional, can be restored per-test)
jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();
jest.spyOn(console, 'warn').mockImplementation();
jest.spyOn(console, 'info').mockImplementation();
jest.spyOn(console, 'debug').mockImplementation();
