import helmet from 'helmet';
import { env } from '../config/env';

/**
 * Configure Helmet security headers middleware
 * Sets various HTTP headers to help protect the app from well-known web vulnerabilities
 */
export function configureSecurityHeaders() {
  const isProduction = env.NODE_ENV === 'production';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (common in many frameworks)
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          env.CORS_ORIGIN, // Allow API calls from frontend origin
        ],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null, // Only upgrade in production
      },
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: isProduction ? 31536000 : 0, // 1 year in production, disabled in development
      includeSubDomains: true,
      preload: isProduction,
    },
    // X-Content-Type-Options: Prevent MIME type sniffing
    noSniff: true,
    // X-Frame-Options: Prevent clickjacking
    frameguard: {
      action: 'deny',
    },
    // X-XSS-Protection: Enable XSS filter (legacy, but still useful)
    xssFilter: true,
    // Referrer-Policy: Control referrer information
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    // Permissions-Policy: Control browser features
    permittedCrossDomainPolicies: false,
  });
}

