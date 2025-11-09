import winston from 'winston';
import { env } from './env';

/**
 * Winston logger configuration
 * Logs to console in development, structured JSON in production
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

/**
 * Security event types
 */
export enum SecurityEventType {
  AUTH_FAILED = 'auth_failed',
  AUTH_SUCCESS = 'auth_success',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  CSRF_FAILED = 'csrf_failed',
  PAYLOAD_TOO_LARGE = 'payload_too_large',
  INVALID_TOKEN = 'invalid_token',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

/**
 * Security event data structure
 */
export interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  method: string;
  path: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  requestId?: string; // Request ID for tracing
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  logger.warn(`Security Event: ${event.type}`, securityEvent);
}

/**
 * Log error with security context
 */
export function logSecurityError(
  error: Error,
  context: {
    ip?: string;
    method?: string;
    path?: string;
    userId?: string;
    details?: Record<string, unknown>;
  }
): void {
  logger.error('Security Error', {
    error: {
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

