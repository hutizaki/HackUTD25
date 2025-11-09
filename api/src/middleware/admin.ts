import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { createErrorResponse } from '../utils/errors';

/**
 * Admin middleware
 * Protects admin routes - only accessible in development environment
 * NO authentication required - admin endpoints are open in development for dev tools
 *
 * Security: Admin endpoints MUST only work in development environment
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  // CRITICAL: Only allow admin access in development environment
  if (env.NODE_ENV !== 'development') {
    res.status(403).json(
      createErrorResponse('Admin access denied', 'Admin endpoints are only available in development environment')
    );
    return;
  }

  // In development, allow access without authentication for dev tools convenience
  next();
}

