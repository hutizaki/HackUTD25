import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { ErrorMessages, createErrorResponse } from '../utils/errors';

/**
 * Permission checking middleware
 * Checks if the authenticated user has the required permission
 * 
 * Usage:
 *   router.get('/admin/users', requirePermission('users', 'read'), handler);
 *   router.post('/admin/users', requirePermission('users', 'write'), handler);
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_USER_NOT_FOUND));
        return;
      }

      const hasPermission = await user.hasPermission(resource, action);
      if (!hasPermission) {
        res.status(403).json(
          createErrorResponse(
            'Permission denied',
            `You do not have permission to ${action} ${resource}`
          )
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Permission checking middleware for multiple permissions (OR logic)
 * User needs at least one of the specified permissions
 * 
 * Usage:
 *   router.get('/admin', requireAnyPermission([
 *     { resource: 'admin', action: 'read' },
 *     { resource: 'users', action: 'read' }
 *   ]), handler);
 */
export function requireAnyPermission(
  permissions: Array<{ resource: string; action: string }>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED, 'Authentication required'));
        return;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED_USER_NOT_FOUND));
        return;
      }

      const hasAnyPermission = await user.hasAnyPermission(permissions);
      if (!hasAnyPermission) {
        res.status(403).json(
          createErrorResponse(
            'Permission denied',
            'You do not have the required permissions'
          )
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

