import rateLimit from 'express-rate-limit';
import { logSecurityEvent, SecurityEventType } from '../config/logger';
import { ErrorMessages } from '../utils/errors';
import { env } from '../config/env';

/**
 * Get client IP address from request
 */
function getClientIp(req: { ip?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const headers = req.headers || {};
  return (
    (headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Get request ID from headers (if set by requestId middleware)
 */
function getRequestId(req: { headers?: Record<string, string | string[] | undefined> }): string | undefined {
  const headers = req.headers || {};
  return headers['x-request-id'] as string | undefined;
}

/**
 * Check if we're in development mode
 */
const isDevelopment = env.NODE_ENV === 'development';

/**
 * Rate limiter for authentication endpoints
 * Development: 100 requests per 1 minute per IP (lenient for testing)
 * Production: 5 requests per 15 minutes per IP (strict for security)
 * Used for: /api/auth/register, /api/auth/login
 */
export const authLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: isDevelopment ? 100 : 5, // 100 requests in dev, 5 in prod
  message: {
    error: ErrorMessages.RATE_LIMIT_AUTH,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: false,
  // Include retry-after header
  handler: (req, res) => {
    const windowMs = isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000;
    const resetTime = new Date(Date.now() + windowMs).toISOString();
    
    // Log rate limit hit
    logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_HIT,
      ip: getClientIp(req),
      method: req.method || 'UNKNOWN',
      path: req.path || 'UNKNOWN',
      userAgent: req.headers?.['user-agent'],
      requestId: getRequestId(req),
      details: { limiter: 'auth', resetTime },
    });
    
    res.status(429).json({
      error: ErrorMessages.RATE_LIMIT_AUTH,
      retryAfter: resetTime,
    });
  },
});

/**
 * General API rate limiter
 * Development: 1000 requests per 1 minute per IP (lenient for testing)
 * Production: 100 requests per 15 minutes per IP (strict for security)
 * Used for: All API routes
 */
export const generalLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: isDevelopment ? 1000 : 100, // 1000 requests in dev, 100 in prod
  message: {
    error: ErrorMessages.RATE_LIMIT_GENERAL,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const windowMs = isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000;
    const resetTime = new Date(Date.now() + windowMs).toISOString();
    
    // Log rate limit hit
    logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_HIT,
      ip: getClientIp(req),
      method: req.method || 'UNKNOWN',
      path: req.path || 'UNKNOWN',
      userAgent: req.headers?.['user-agent'],
      requestId: getRequestId(req),
      details: { limiter: 'general', resetTime },
    });
    
    res.status(429).json({
      error: ErrorMessages.RATE_LIMIT_GENERAL,
      retryAfter: resetTime,
    });
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Development: 50 requests per 1 minute per IP (lenient for testing)
 * Production: 3 requests per 15 minutes per IP (strict for security)
 * Used for: Sensitive operations (future use)
 */
export const strictLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 minutes in prod
  max: isDevelopment ? 50 : 3, // 50 requests in dev, 3 in prod
  message: {
    error: ErrorMessages.RATE_LIMIT_STRICT,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const windowMs = isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000;
    const resetTime = new Date(Date.now() + windowMs).toISOString();
    
    // Log rate limit hit
    logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_HIT,
      ip: getClientIp(req),
      method: req.method || 'UNKNOWN',
      path: req.path || 'UNKNOWN',
      userAgent: req.headers?.['user-agent'],
      requestId: getRequestId(req),
      details: { limiter: 'strict', resetTime },
    });
    
    res.status(429).json({
      error: ErrorMessages.RATE_LIMIT_STRICT,
      retryAfter: resetTime,
    });
  },
});

