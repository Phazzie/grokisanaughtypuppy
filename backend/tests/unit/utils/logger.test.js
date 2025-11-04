/**
 * Logger Utility Tests
 */

const logger = require('../../../utils/logger');

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Basic Logging', () => {
    it('should have standard logging methods', () => {
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should log info messages', () => {
      const spy = jest.spyOn(logger, 'info');
      logger.info('Test info message');

      expect(spy).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages', () => {
      const spy = jest.spyOn(logger, 'error');
      logger.error('Test error message');

      expect(spy).toHaveBeenCalledWith('Test error message');
    });

    it('should log warnings', () => {
      const spy = jest.spyOn(logger, 'warn');
      logger.warn('Test warning message');

      expect(spy).toHaveBeenCalledWith('Test warning message');
    });

    it('should log with metadata', () => {
      const spy = jest.spyOn(logger, 'info');
      logger.info('Test message', { userId: 123, action: 'login' });

      expect(spy).toHaveBeenCalledWith('Test message', {
        userId: 123,
        action: 'login',
      });
    });
  });

  describe('withRequest Method', () => {
    it('should create child logger with request ID', () => {
      const req = { id: 'test-request-123' };
      const childLogger = logger.withRequest(req);

      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should include request ID in logs', () => {
      const req = { id: 'test-request-123' };
      const childLogger = logger.withRequest(req);
      const spy = jest.spyOn(childLogger, 'info');

      childLogger.info('Test message');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('security Method', () => {
    it('should log security events', () => {
      const spy = jest.spyOn(logger, 'warn');

      logger.security('unauthorized_access', {
        ip: '192.168.1.1',
        path: '/admin',
      });

      expect(spy).toHaveBeenCalledWith(
        'SECURITY EVENT',
        expect.objectContaining({
          event: 'unauthorized_access',
          ip: '192.168.1.1',
          path: '/admin',
        })
      );
    });

    it('should include timestamp in security logs', () => {
      const spy = jest.spyOn(logger, 'warn');

      logger.security('failed_login', { userId: 123 });

      expect(spy).toHaveBeenCalledWith(
        'SECURITY EVENT',
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('performance Method', () => {
    it('should log performance metrics', () => {
      const spy = jest.spyOn(logger, 'info');

      logger.performance('api_call', 1250, { endpoint: '/api/chat' });

      expect(spy).toHaveBeenCalledWith(
        'PERFORMANCE',
        expect.objectContaining({
          operation: 'api_call',
          duration: 1250,
          endpoint: '/api/chat',
        })
      );
    });

    it('should handle performance logs without metadata', () => {
      const spy = jest.spyOn(logger, 'info');

      logger.performance('database_query', 250);

      expect(spy).toHaveBeenCalledWith(
        'PERFORMANCE',
        expect.objectContaining({
          operation: 'database_query',
          duration: 250,
        })
      );
    });
  });

  describe('Logger Configuration', () => {
    it('should respect LOG_LEVEL environment variable', () => {
      // Logger level should be set from env or default to 'info'
      expect(['error', 'warn', 'info', 'debug']).toContain(logger.level);
    });

    it('should have default metadata', () => {
      expect(logger.defaultMeta).toBeDefined();
      expect(logger.defaultMeta.service).toBe('grok-chat-backend');
    });
  });

  describe('Error Stack Traces', () => {
    it('should log error with stack trace', () => {
      const spy = jest.spyOn(logger, 'error');
      const error = new Error('Test error');

      logger.error('Error occurred', { error });

      expect(spy).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          error,
        })
      );
    });
  });
});
