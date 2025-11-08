/**
 * Error Handler Middleware Tests
 */

const { APIError, asyncHandler, errorHandler, notFoundHandler } = require('../../../middleware/errorHandler');

describe('ErrorHandler Middleware', () => {
  describe('APIError', () => {
    it('should create error with message and status code', () => {
      const error = new APIError('Test error', 400);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.timestamp).toBeDefined();
    });

    it('should default to status code 500', () => {
      const error = new APIError('Test error');

      expect(error.statusCode).toBe(500);
    });

    it('should capture stack trace', () => {
      const error = new APIError('Test error');

      expect(error.stack).toBeDefined();
    });
  });

  describe('asyncHandler', () => {
    it('should call next with error when promise rejects', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);

      const req = testHelpers.mockRequest();
      const res = testHelpers.mockResponse();
      const next = testHelpers.mockNext();

      await wrappedFn(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should not call next when promise resolves', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);

      const req = testHelpers.mockRequest();
      const res = testHelpers.mockResponse();
      const next = testHelpers.mockNext();

      await wrappedFn(req, res, next);

      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    let req, res, next;

    beforeEach(() => {
      req = testHelpers.mockRequest();
      res = testHelpers.mockResponse();
      next = testHelpers.mockNext();
    });

    it('should handle APIError correctly', () => {
      const error = new APIError('Test error', 400);

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          statusCode: 400,
        })
      );
    });

    it('should handle generic errors with 500 status', () => {
      const error = new Error('Generic error');

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Generic error',
        })
      );
    });

    it('should handle validation errors', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          field1: { message: 'Field 1 is required' },
          field2: { message: 'Field 2 is invalid' },
        },
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('Field 1 is required'),
        })
      );
    });

    it('should handle duplicate key errors', () => {
      const error = {
        code: 11000,
        message: 'Duplicate key error',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Duplicate field value entered',
        })
      );
    });

    it('should handle JWT errors', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'Invalid token',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid token',
        })
      );
    });

    it('should handle expired token errors', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'Token expired',
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should handle axios API errors', () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'External API error',
            },
          },
          status: 503,
        },
      };

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'External API error',
        })
      );
    });

    it('should log error with request context', () => {
      const error = new Error('Test error');
      req.logger = {
        error: jest.fn(),
      };

      errorHandler(error, req, res, next);

      expect(req.logger.error).toHaveBeenCalledWith(
        'Error occurred',
        expect.objectContaining({
          message: 'Test error',
          path: req.path,
          method: req.method,
          ip: req.ip,
          requestId: req.id,
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for undefined routes', () => {
      const req = testHelpers.mockRequest({
        originalUrl: '/api/undefined-route',
      });
      const res = testHelpers.mockResponse();
      const next = testHelpers.mockNext();

      notFoundHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/undefined-route not found',
          statusCode: 404,
        })
      );
    });
  });
});
