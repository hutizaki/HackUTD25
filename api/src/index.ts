import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { connectToDatabase } from './db/connect';
import { env } from './config/env';
import { logger, logSecurityEvent, SecurityEventType } from './config/logger';
import { ErrorMessages, createErrorResponse } from './utils/errors';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import projectRoutes from './routes/project.routes';
import adminRoutes from './routes/admin';
import agentRoutes from './routes/agent.routes';
import { generalLimiter } from './middleware/rateLimit';
import { configureSecurityHeaders } from './middleware/security';
import { initCsrfSecret, csrfToken } from './middleware/csrf';
import { requestId } from './middleware/requestId';
import { cleanupExpiredSessions } from './utils/sessionCleanup';
import { getEnabledFeatures } from './utils/featureFlags';
import { seedDefaultRoles } from './utils/roleSeed';
import { createAgentService } from './services/agent.service';
import roleRoutes from './routes/roles';
import roleGroupRoutes from './routes/roleGroups';

// Load environment variables (already done in config/env.ts, but ensure it's loaded)
import './config/env';

const app = express();

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

// Security headers (must be applied early, before other middleware)
app.use(configureSecurityHeaders());

// Request ID middleware (for tracing and debugging)
app.use(requestId);

// CORS configuration
// When using credentials: true, the origin cannot be '*' - it must be the specific origin
// Using a function to validate the origin and ensure it matches exactly
// Allow both the configured origin and common development ports (5173, 5174, 5175)
app.use(
  cors({
    origin: (origin, callback) => {
      // If no origin (same-origin request), allow it but don't set CORS headers
      // The cors package will handle this correctly
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if the origin matches the configured CORS origin exactly
      if (origin === env.CORS_ORIGIN) {
        // Return the origin string (not true) to ensure it's set correctly
        return callback(null, origin);
      }
      
      // Allow common development ports (5173, 5174, 5175) for flexibility during development
      // This helps when frontend dev server restarts on different ports
      const allowedOrigins = [
        env.CORS_ORIGIN,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      
      // Reject other origins
      return callback(new Error(`Not allowed by CORS. Origin: ${origin}, Expected one of: ${allowedOrigins.join(', ')}`));
    },
    credentials: true,
    optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

// Cookie parser middleware (required for CSRF)
app.use(cookieParser());

// Initialize CSRF secret cookie for all requests
app.use(initCsrfSecret);

// CSRF token endpoint (GET /api/csrf-token)
app.get('/api/csrf-token', csrfToken);

// Body parser middleware with size limits
// JSON body parser (default: 10MB)
app.use(
  express.json({
    limit: env.MAX_JSON_SIZE || '10mb',
  })
);

// URL-encoded body parser (default: 1MB)
app.use(
  express.urlencoded({
    extended: true,
    limit: env.MAX_URLENCODED_SIZE || '1mb',
  })
);

// Request logging middleware (development only)
if (env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoints (our project format)
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/readyz', async (_req: Request, res: Response) => {
  // Check database connection
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

// API routes with general rate limiting
app.use('/api', generalLimiter);

// Public feature flags endpoint (must be before other routes)
app.get('/api/feature-flags', async (req: Request, res: Response): Promise<void> => {
  try {
    const enabledFeatures = await getEnabledFeatures();
    res.json({ data: enabledFeatures });
  } catch {
    res.status(500).json(createErrorResponse(ErrorMessages.INTERNAL_SERVER_ERROR));
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/agents', agentRoutes);

// Admin routes (development only - protected by adminAuth middleware)
// Note: Admin routes are NOT rate-limited to allow dev tools to work freely
app.use('/api/admin', adminRoutes);
app.use('/api/admin', roleRoutes);
app.use('/api/admin', roleGroupRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Handle payload too large errors
  if (
    err instanceof Error &&
    ('type' in err || err.message.includes('limit') || err.message.includes('too large'))
  ) {
    const errorType = 'type' in err ? (err as { type?: string }).type : '';
    if (
      errorType === 'entity.too.large' ||
      err.message.includes('limit') ||
      err.message.includes('too large')
    ) {
      logSecurityEvent({
        type: SecurityEventType.PAYLOAD_TOO_LARGE,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: req.userId,
        requestId: req.requestId,
        details: { errorType, message: err.message },
      });

      res.status(413).json(
        createErrorResponse(ErrorMessages.PAYLOAD_TOO_LARGE, ErrorMessages.PAYLOAD_TOO_LARGE_MESSAGE)
      );
      return;
    }
  }

  logger.error('Unhandled error', {
    error: {
      message: err.message,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: getClientIp(req),
      requestId: req.requestId,
    },
  });

  res.status(500).json(
    createErrorResponse(
      ErrorMessages.INTERNAL_SERVER_ERROR,
      env.NODE_ENV === 'development' ? err.message : undefined
    )
  );
});

/**
 * Start server
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectToDatabase();

    // Cleanup expired sessions on startup
    await cleanupExpiredSessions();

    // Seed default roles
    await seedDefaultRoles();

    // Seed default agents (PM, DEV, QA)
    const agentService = createAgentService();
    await agentService.seedDefaultAgents();

    // Start server (use port 8080 as default for our project)
    const port = parseInt(env.PORT, 10) || 8080;
    app.listen(port, () => {
      logger.info('Server started', {
        port,
        environment: env.NODE_ENV,
        corsOrigin: env.CORS_ORIGIN,
      });
      console.log(`Server is running on port ${port}`);
      console.log(`Environment: ${env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${port}/healthz`);
      console.log(`Readiness check: http://localhost:${port}/readyz`);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

