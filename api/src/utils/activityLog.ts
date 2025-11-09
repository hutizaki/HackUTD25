import { Request } from 'express';
import mongoose from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Log user activity to database
 */
export async function logActivity(
  req: Request,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    // Only log if user is authenticated
    if (!req.userId) {
      return;
    }

    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      action,
      method: req.method,
      path: req.path,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      details: details || {},
      timestamp: new Date(),
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the request
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log activity with custom userId (for admin actions on behalf of users)
 */
export async function logActivityForUser(
  userId: string,
  action: string,
  method: string,
  path: string,
  ipAddress?: string,
  userAgent?: string,
  requestId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action,
      method,
      path,
      ipAddress,
      userAgent,
      requestId,
      details: details || {},
      timestamp: new Date(),
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the request
    console.error('Failed to log activity:', error);
  }
}

