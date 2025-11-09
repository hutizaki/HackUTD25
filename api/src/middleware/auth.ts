import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { env } from '../config/env';
import { logSecurityEvent, SecurityEventType } from '../config/logger';
import { ErrorMessages, createErrorResponse } from '../utils/errors';

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
 * Authentication middleware
 * Extracts JWT from httpOnly cookie, verifies it, and attaches user to request
 * Returns 401 if token is missing, invalid, or user not found
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from httpOnly cookie
    const token = req.cookies[env.COOKIE_NAME];

    if (!token) {
      logSecurityEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        details: { reason: 'No token provided' },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_NO_TOKEN));
      return;
    }

    // Verify JWT token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    } catch {
      logSecurityEvent({
        type: SecurityEventType.INVALID_TOKEN,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
        details: { reason: 'Invalid token' },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_INVALID_TOKEN));
      return;
    }

    // Check if session exists and is not revoked
    const session = await Session.findOne({ token, revoked: false });
    if (!session) {
      logSecurityEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: decoded.userId,
        requestId: req.requestId,
        details: { reason: 'Session not found or revoked' },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_INVALID_TOKEN));
      return;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Mark as revoked
      await Session.updateOne({ _id: session._id }, { $set: { revoked: true } });
      logSecurityEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: decoded.userId,
        requestId: req.requestId,
        details: { reason: 'Session expired' },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_INVALID_TOKEN));
      return;
    }

    // Update last activity
    await Session.updateOne(
      { _id: session._id },
      { $set: { lastActivity: new Date() } }
    );

    // Find user by ID from token
    const user = await User.findById(decoded.userId);

    if (!user) {
      logSecurityEvent({
        type: SecurityEventType.UNAUTHORIZED_ACCESS,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent'],
        userId: decoded.userId,
        requestId: req.requestId,
        details: { reason: 'User not found' },
      });
      res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_USER_NOT_FOUND));
      return;
    }

    // Attach user to request object
    // The user object will be transformed by toJSON, so passwordHash is excluded
    // Type assertion needed because Mongoose Document._id is typed as unknown
    const userId = (user._id as { toString: () => string }).toString();
    req.user = {
      _id: userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    req.userId = userId;

    next();
  } catch (error) {
    logSecurityEvent({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      ip: getClientIp(req),
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
  }
}

