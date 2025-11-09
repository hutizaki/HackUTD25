import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

/**
 * Request ID middleware
 * Generates a unique request ID for each request and includes it in:
 * - Response headers (X-Request-ID)
 * - Log entries
 * - Error responses (for tracing)
 *
 * This enables request tracing across distributed systems and helps with debugging.
 * Clients can provide their own request ID via X-Request-ID header for distributed tracing.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Generate or use existing request ID from header
  // Allows clients to provide their own request ID for tracing
  const id = (req.headers['x-request-id'] as string) || randomUUID();

  // Attach request ID to request object for use in other middleware/routes
  req.requestId = id;

  // Add request ID to response header
  res.setHeader('X-Request-ID', id);

  // Log request with request ID (in development)
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Request ${id}: ${req.method} ${req.path}`, { requestId: id });
  }

  next();
}

