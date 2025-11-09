/**
 * Extended Express Request interface for authenticated routes
 * The user property is added by the authentication middleware
 * The requestId property is added by the request ID middleware
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        name: string;
        createdAt: Date;
      };
      userId?: string;
      requestId?: string; // Request ID for tracing
    }
  }
}

export {};

