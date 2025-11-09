import { Session } from '../models/Session';
import { logger } from '../config/logger';

/**
 * Clean up expired sessions
 * Removes sessions that have expired (expiresAt < now)
 * This should be run periodically or on server startup
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const now = new Date();
    const result = await Session.deleteMany({
      expiresAt: { $lt: now },
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
    }

    return result.deletedCount || 0;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Clean up revoked sessions older than specified days
 * @param daysOld - Number of days old sessions should be before cleanup (default: 30)
 */
export async function cleanupOldRevokedSessions(daysOld = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Session.deleteMany({
      revoked: true,
      updatedAt: { $lt: cutoffDate },
    });

    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old revoked sessions (older than ${daysOld} days)`);
    }

    return result.deletedCount || 0;
  } catch (error) {
    logger.error('Failed to cleanup old revoked sessions', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

