/**
 * Security Middleware Module
 * Comprehensive security controls for the Grok Chat API
 */

const crypto = require('crypto');

/**
 * Generate CSRF token for session
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
function validateCSRFToken(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    return next(); // Skip in development for easier testing
  }

  const token = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

/**
 * Sanitize response data to prevent information leakage
 */
function sanitizeResponse(data) {
  // Remove sensitive fields if they accidentally get included
  const sanitized = JSON.parse(JSON.stringify(data));
  
  if (sanitized.error) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      delete sanitized.error.stack;
      delete sanitized.error.config;
    }
  }
  
  return sanitized;
}

/**
 * Detect and block suspicious request patterns
 */
function detectSuspiciousActivity(req, res, next) {
  const suspiciousPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  try {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const bodyStr = JSON.stringify(req.body);
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bodyStr)) {
        console.warn('Suspicious pattern detected in request:', {
          ip: req.ip,
          pattern: pattern.toString(),
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({ error: 'Invalid request content' });
      }
    }
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    // Allow request to proceed if checking fails
  }

  next();
}

/**
 * Add security headers to all responses
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Enforce HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}

/**
 * Log security events
 */
function logSecurityEvent(event, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    severity: details.severity || 'info'
  };
  
  // In production, this should go to a proper logging service
  if (process.env.NODE_ENV === 'production') {
    console.warn('SECURITY EVENT:', JSON.stringify(logEntry));
  } else {
    console.log('Security Event:', logEntry);
  }
}

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  sanitizeResponse,
  detectSuspiciousActivity,
  securityHeaders,
  logSecurityEvent
};
