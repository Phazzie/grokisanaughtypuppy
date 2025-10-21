/**
 * Global Error Handler Middleware
 * Centralized error handling with proper logging and user-friendly responses
 */

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error details
  console.error('Error:', {
    message: err.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message);
    error = new APIError(message.join(', '), 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error = new APIError('Duplicate field value entered', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new APIError('Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new APIError('Token expired', 401);
  }

  // Axios/API errors
  if (err.response?.data) {
    const apiError = err.response.data.error;
    error = new APIError(
      apiError?.message || 'External API error',
      err.response.status || 500
    );
  }

  // Send error response
  const response = {
    success: false,
    error: error.message || 'Internal server error',
    statusCode: error.statusCode
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
}

/**
 * Handle 404 errors for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

module.exports = {
  APIError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};
