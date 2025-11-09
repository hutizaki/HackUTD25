import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import crypto from 'crypto';
import { env } from '../config/env';
import { logSecurityEvent, SecurityEventType } from '../config/logger';
import { ErrorMessages, createErrorResponse } from '../utils/errors';

const tokens = new csrf();

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * State-changing HTTP methods that require CSRF protection
 */
const STATE_CHANGING_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * Safe HTTP methods that don't require CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Get or create CSRF secret from cookie
 */
function getCsrfSecret(req: Request): string {
  const cookieSecret = req.cookies[env.CSRF_COOKIE_NAME];
  if (cookieSecret) {
    return cookieSecret;
  }

  // Generate new secret if not present
  const newSecret = crypto.randomBytes(32).toString('hex');
  return newSecret;
}

/**
 * Set CSRF secret cookie
 */
function setCsrfSecretCookie(res: Response, secret: string): void {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(env.CSRF_COOKIE_NAME, secret, {
    httpOnly: isProduction, // Allow JavaScript access in development for debugging
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    domain: env.COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

/**
 * CSRF token generation endpoint middleware
 * This should be applied to a GET endpoint that returns the CSRF token
 */
export function csrfToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const secret = getCsrfSecret(req);
    const token = tokens.create(secret);

    // Set secret cookie if not already set
    if (!req.cookies[env.CSRF_COOKIE_NAME]) {
      setCsrfSecretCookie(res, secret);
    }

    res.json({ csrfToken: token });
  } catch (error) {
    next(error);
  }
}

/**
 * CSRF protection middleware
 * Validates CSRF tokens on state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // Skip CSRF check for state-changing methods that don't require it
  // (e.g., health checks, public endpoints)
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    return next();
  }

  try {
    const secret = getCsrfSecret(req);

    // Get token from header (X-CSRF-Token) or body (csrfToken)
    const token =
      req.headers['x-csrf-token'] ||
      (req.body && req.body.csrfToken) ||
      (req.query && req.query.csrfToken);

    if (!token || typeof token !== 'string') {
      logSecurityEvent({
        type: SecurityEventType.CSRF_FAILED,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.userId,
        requestId: req.requestId,
        details: { reason: 'CSRF token missing' },
      });
      res.status(403).json(
        createErrorResponse(ErrorMessages.CSRF_TOKEN_MISSING, ErrorMessages.CSRF_TOKEN_REQUIRED)
      );
      return;
    }

    // Verify token
    if (!tokens.verify(secret, token)) {
      logSecurityEvent({
        type: SecurityEventType.CSRF_FAILED,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.userId,
        requestId: req.requestId,
        details: { reason: 'Invalid CSRF token' },
      });
      res.status(403).json(
        createErrorResponse(ErrorMessages.CSRF_TOKEN_INVALID, ErrorMessages.CSRF_TOKEN_VALIDATION_FAILED)
      );
      return;
    }

    // Set secret cookie if not already set
    if (!req.cookies[env.CSRF_COOKIE_NAME]) {
      setCsrfSecretCookie(res, secret);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Initialize CSRF secret cookie middleware
 * Ensures CSRF secret cookie is set for all requests
 */
export function initCsrfSecret(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies[env.CSRF_COOKIE_NAME]) {
    const secret = crypto.randomBytes(32).toString('hex');
    setCsrfSecretCookie(res, secret);
  }
  next();
}

