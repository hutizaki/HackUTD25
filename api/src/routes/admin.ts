import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Permission } from '../models/Permission';
import { FeatureFlag } from '../models/FeatureFlag';
import { ActivityLog } from '../models/ActivityLog';
import { Role } from '../models/Role';
import { RoleGroup } from '../models/RoleGroup';
import { adminOnly } from '../middleware/admin';
import { csrfProtection } from '../middleware/csrf';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { logger } from '../config/logger';
import { sanitizeEmail, sanitizeName } from '../utils/sanitize';
import { validatePasswordStrength } from '../utils/passwordValidation';
import { env } from '../config/env';
import { logActivity, logActivityForUser } from '../utils/activityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { validateObjectId, validateObjectIds } from '../utils/validation';
import { validateRequest as validateRequestMiddleware } from '../middleware/validators/validateRequest';

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
 * Parse JWT expiresIn string to milliseconds
 * Supports formats: "7d", "24h", "3600s", "3600000ms", or number in seconds
 */
function parseJwtExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms]|ms)?$/);
  if (!match) {
    // Default to 7 days if format is invalid
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    case 'ms':
      return value;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}

const router = Router();

// All admin routes require development environment (NO authentication required)
router.use(adminOnly);

/**
 * GET /api/admin/users
 * List all users with pagination
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - search: Search term for email or name (optional)
 */
router.get('/users', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const search = (req.query.search as string)?.trim();

  const skip = (page - 1) * limit;

  // Build query
  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  // Get total count
  const total = await User.countDocuments(query);

  // Get users
  const users = await User.find(query)
    .select('-passwordHash') // Exclude password hash
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  });
}));

/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
router.get('/users/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.params.id;

  // Validate MongoDB ObjectId format
  if (!validateObjectId(userId, res, 'User ID')) return;

  const user = await User.findById(userId)
    .select('-passwordHash')
    .populate('permissions', 'name description resources actions createdAt updatedAt')
    .lean();

  if (!user) {
    res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
    return;
  }

  res.json({ data: user });
}));

/**
 * Validation schema for updating user
 */
const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
});

/**
 * PUT /api/admin/users/:id
 * Update user (email and/or name)
 * Body: { email?: string, name?: string }
 */
router.put(
  '/users/:id',
  csrfProtection,
  validateRequestMiddleware(updateUserSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    const { email, name } = req.body; // Already validated by middleware

    // Check if at least one field is provided
    if (!email && !name) {
        res.status(400).json(createErrorResponse('Validation failed', 'At least one field (email or name) must be provided'));
        return;
      }

      // Find user
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Check if email is being changed and if it already exists
      if (email && email !== user.email) {
        const sanitizedEmail = sanitizeEmail(email);
        const existingUser = await User.findOne({ email: sanitizedEmail });

        if (existingUser && (existingUser._id as { toString: () => string }).toString() !== userId) {
          res.status(409).json(createErrorResponse(ErrorMessages.USER_EXISTS, 'User with this email already exists'));
          return;
        }

        user.email = sanitizedEmail;
      }

      // Update name if provided
      if (name) {
        user.name = sanitizeName(name);
      }

      // Save user
      await user.save();

      // Log user update
      await logActivityForUser(
        userId,
        'admin_update_user',
        req.method,
        req.path,
        getClientIp(req),
        req.headers['user-agent'],
        req.requestId,
        { updatedFields: { email: email ? true : false, name: name ? true : false } }
      );

    // Return updated user (passwordHash excluded by toJSON transform)
    res.json({ data: user.toJSON() });
  })
);

/**
 * DELETE /api/admin/users/:id
 * Delete user by ID
 */
router.delete(
  '/users/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    // Find and delete user
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
      return;
    }

    // Log deletion
    logger.info('User deleted by admin', {
      deletedUserId: userId,
      deletedUserEmail: user.email,
      adminUserId: req.userId || 'anonymous',
      requestId: req.requestId,
    });

    // Log activity for the deleted user
    await logActivityForUser(
      userId,
      'admin_delete_user',
      req.method,
      req.path,
      getClientIp(req),
      req.headers['user-agent'],
      req.requestId,
      { deletedBy: req.userId || 'anonymous' }
    );

    res.json({ message: 'User deleted successfully' });
  })
);

/**
 * Validation schema for changing password
 */
const changePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .refine(
      (password) => {
        const validation = validatePasswordStrength(password);
        return validation.isValid;
      },
      {
        message: 'Password does not meet strength requirements',
      }
    ),
});

/**
 * PATCH /api/admin/users/:id/password
 * Change user password
 * Body: { password: string }
 */
router.patch(
  '/users/:id/password',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    // Validate request body
    const validationResult = changePasswordSchema.safeParse(req.body);

    if (!validationResult.success) {
      // Check if password validation failed and provide detailed errors
      const passwordIssue = validationResult.error.issues.find((issue) => issue.path[0] === 'password');

      if (passwordIssue && req.body.password) {
        // Run password validation to get detailed errors
        const passwordValidation = validatePasswordStrength(req.body.password);
        if (!passwordValidation.isValid) {
          res.status(400).json(
            createErrorResponse(
              ErrorMessages.PASSWORD_VALIDATION_FAILED,
              undefined,
              passwordValidation.errors.map((error) => ({
                path: ['password'],
                message: error,
              }))
            )
          );
          return;
        }
      }

      res.status(400).json(
        createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
      );
      return;
    }

    const { password } = validationResult.data;

      // Find user
      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password hash
      user.passwordHash = passwordHash;
      await user.save();

      // Log password change
      logger.info('User password changed by admin', {
        userId,
        userEmail: user.email,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

      // Log activity for the user whose password was changed
      await logActivityForUser(
        userId,
        'admin_change_password',
        req.method,
        req.path,
        getClientIp(req),
        req.headers['user-agent'],
        req.requestId,
        { changedBy: req.userId || 'anonymous' }
      );

    res.json({ message: 'Password changed successfully' });
  })
);

/**
 * POST /api/admin/users/:id/impersonate
 * Sign in as a user (admin impersonation)
 * Sets a JWT cookie for the target user
 */
router.post(
  '/users/:id/impersonate',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

      // Find user
      const user = await User.findById(userId).select('-passwordHash').lean();

      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Generate JWT and set cookie (same logic as login)
      const payload = { userId };
      const secret = env.JWT_SECRET;
      const options = {
        expiresIn: env.JWT_EXPIRES_IN,
      } as jwt.SignOptions;
      const token = jwt.sign(payload, secret, options);

      const isProduction = env.NODE_ENV === 'production';

      res.cookie(env.COOKIE_NAME, token, {
        httpOnly: isProduction, // Allow JavaScript access in development for debugging
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        domain: env.COOKIE_DOMAIN,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      });

      // Create session for impersonated user
      const expiresInMs = parseJwtExpiresIn(env.JWT_EXPIRES_IN);
      const expiresAt = new Date(Date.now() + expiresInMs);

      const session = new Session({
        userId,
        token,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        expiresAt,
        lastActivity: new Date(),
        revoked: false,
      });

      await session.save();

      // Log impersonation
      logger.info('User impersonated by admin', {
        impersonatedUserId: userId,
        impersonatedUserEmail: user.email,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

      // Log activity for the impersonated user
      await logActivityForUser(
        userId,
        'admin_impersonate',
        req.method,
        req.path,
        getClientIp(req),
        req.headers['user-agent'],
        req.requestId,
        { impersonatedBy: req.userId || 'anonymous' }
      );

      // Return user data
      res.json({
        data: {
          id: userId,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
  })
);

/**
 * GET /api/admin/sessions
 * List active sessions
 * Query parameters:
 *   - userId: Filter by user ID (optional)
 *   - status: Filter by status - 'active', 'expired', 'revoked', 'all' (default: 'active')
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get('/sessions', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const userId = req.query.userId as string | undefined;
    const status = (req.query.status as string) || 'active';

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};
    
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.userId = new mongoose.Types.ObjectId(userId);
    }

    // Filter by status
    const now = new Date();
    if (status === 'active') {
      query.revoked = false;
      query.expiresAt = { $gt: now };
    } else if (status === 'expired') {
      query.expiresAt = { $lte: now };
    } else if (status === 'revoked') {
      query.revoked = true;
    }
    // 'all' doesn't add any status filter

    // Get total count
    const total = await Session.countDocuments(query);

    // Get sessions with user details
    const sessions = await Session.find(query)
      .populate('userId', 'email name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform sessions for response
    const sessionsData = sessions.map((session) => {
      const userIdPopulated = session.userId as unknown;
      const user = userIdPopulated && typeof userIdPopulated === 'object' && '_id' in userIdPopulated
        ? (userIdPopulated as { _id: mongoose.Types.ObjectId; email: string; name: string })
        : null;
      const userIdValue = user
        ? (user._id as mongoose.Types.ObjectId).toString()
        : (session.userId as mongoose.Types.ObjectId).toString();
      const isExpired = new Date(session.expiresAt) < now;
      
      return {
        id: (session._id as mongoose.Types.ObjectId).toString(),
        userId: userIdValue,
        userEmail: user?.email || null,
        userName: user?.name || null,
        ipAddress: session.ipAddress || null,
        userAgent: session.userAgent || null,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
        revoked: session.revoked,
        status: session.revoked ? 'revoked' : isExpired ? 'expired' : 'active',
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: sessionsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  })
);

/**
 * GET /api/admin/cookies
 * Get all cookies (including HttpOnly cookies)
 * Returns cookies sent by the browser in the request
 */
router.get('/cookies', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get all cookies from the request
    const cookies = req.cookies || {};
    
    // Transform cookies into array format
    const cookiesArray = Object.entries(cookies).map(([name, value]) => ({
      name,
      value: String(value),
      httpOnly: true, // All cookies from req.cookies are HttpOnly (or at least server-accessible)
    }));
    
    res.json({
      data: cookiesArray,
    });
  })
);

/**
 * DELETE /api/admin/sessions/:id
 * Revoke a session by ID
 */
router.delete(
  '/sessions/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(sessionId, res, 'Session ID')) return;

    // Find and revoke session
    const session = await Session.findByIdAndUpdate(
      sessionId,
      { $set: { revoked: true } },
      { new: true }
    );

    if (!session) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Session not found'));
      return;
    }

    // Log revocation
    logger.info('Session revoked by admin', {
      sessionId,
      userId: session.userId.toString(),
      adminUserId: req.userId || 'anonymous',
      requestId: req.requestId,
    });

    // Log activity for the user whose session was revoked
    await logActivityForUser(
      session.userId.toString(),
      'admin_revoke_session',
      req.method,
      req.path,
      getClientIp(req),
      req.headers['user-agent'],
      req.requestId,
      { sessionId, revokedBy: req.userId || 'anonymous' }
    );

    res.json({ message: 'Session revoked successfully' });
  })
);

/**
 * GET /api/admin/permissions
 * List all permissions
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get('/permissions', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const skip = (page - 1) * limit;

    // Get total count
    const total = await Permission.countDocuments();

    // Get permissions
    const permissions = await Permission.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: permissions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  })
);

/**
 * GET /api/admin/permissions/:id
 * Get single permission details
 */
router.get('/permissions/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const permissionId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(permissionId, res, 'Permission ID')) return;

    // Find permission
    const permission = await Permission.findById(permissionId).lean();

    if (!permission) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Permission not found'));
      return;
    }

    res.json({
      data: {
        id: (permission._id as { toString: () => string }).toString(),
        name: permission.name,
        description: permission.description,
        resources: permission.resources,
        actions: permission.actions,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      },
    });
  })
);

/**
 * Validation schema for creating/updating permission
 */
const permissionSchema = z.object({
  name: z.string().min(1, 'Permission name is required').max(100, 'Permission name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  resources: z.array(z.string()).min(1, 'At least one resource is required'),
  actions: z.array(z.string()).min(1, 'At least one action is required'),
});

/**
 * POST /api/admin/permissions
 * Create a new permission
 * Body: { name: string, description: string, resources: string[], actions: string[] }
 */
router.post(
  '/permissions',
  csrfProtection,
  validateRequestMiddleware(permissionSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, description, resources, actions } = req.body; // Already validated by middleware

      // Check if permission with same name already exists
      const existingPermission = await Permission.findOne({ name: name.toLowerCase() });
      if (existingPermission) {
        res.status(409).json(createErrorResponse('Permission already exists', `Permission with name '${name}' already exists`));
        return;
      }

      // Create permission
      const permission = new Permission({
        name: name.toLowerCase(),
        description,
        resources,
        actions,
      });

      await permission.save();

    res.status(201).json({ data: permission.toJSON() });
  })
);

/**
 * PUT /api/admin/permissions/:id
 * Update a permission
 * Body: { description?: string, resources?: string[], actions?: string[] }
 */
const updatePermissionHandler = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const permissionId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(permissionId, res, 'Permission ID')) return;

      // Validate request body (all fields optional for update)
      const updateSchema = permissionSchema.partial().extend({
        name: z.string().min(1).max(100).optional(),
      });
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json(
          createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
        );
        return;
      }

      const { description, resources, actions } = validationResult.data;

      // Find permission
      const permission = await Permission.findById(permissionId);

      if (!permission) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Permission not found'));
        return;
      }

      // Update fields if provided
      if (description !== undefined) {
        permission.description = description;
      }
      if (resources !== undefined) {
        permission.resources = resources;
      }
      if (actions !== undefined) {
        permission.actions = actions;
      }

      await permission.save();

    res.json({ data: permission.toJSON() });
  });

router.put('/permissions/:id', csrfProtection, updatePermissionHandler);
router.patch('/permissions/:id', csrfProtection, updatePermissionHandler);

/**
 * DELETE /api/admin/permissions/:id
 * Delete a permission
 */
router.delete(
  '/permissions/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const permissionId = req.params.id;

      // Validate MongoDB ObjectId format
      if (!validateObjectId(permissionId, res, 'Permission ID')) return;

      // Find and delete permission
      const permission = await Permission.findByIdAndDelete(permissionId);

      if (!permission) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Permission not found'));
        return;
      }

      // Remove permission from all users
      await User.updateMany(
        { permissions: permissionId },
        { $pull: { permissions: permissionId } }
      );

      // Log deletion
      logger.info('Permission deleted by admin', {
        permissionId,
        permissionName: permission.name,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

    res.json({ message: 'Permission deleted successfully' });
  })
);

/**
 * POST /api/admin/users/:id/permissions
 * Assign permissions to a user
 * Body: { permissionIds: string[] }
 */
router.post(
  '/users/:id/permissions',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.params.id;

      // Validate MongoDB ObjectId format
      if (!validateObjectId(userId, res, 'User ID')) return;

      // Validate request body
      const assignSchema = z.object({
        permissionIds: z.array(z.string()).min(1, 'At least one permission ID is required'),
      });
      const validationResult = assignSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json(
          createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
        );
        return;
      }

      const { permissionIds } = validationResult.data;

      // Validate all permission IDs are valid ObjectIds
      if (!validateObjectIds(permissionIds, res, 'Permission IDs')) return;

      // Verify all permissions exist
      const permissions = await Permission.find({ _id: { $in: permissionIds } });
      if (permissions.length !== permissionIds.length) {
        res.status(404).json(createErrorResponse('Permission not found', 'One or more permissions do not exist'));
        return;
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Add permissions (avoid duplicates)
      const uniquePermissions = [...new Set([...user.permissions.map((p) => p.toString()), ...permissionIds])]
        .map((id) => new mongoose.Types.ObjectId(id));

      user.permissions = uniquePermissions;
      await user.save();

      // Log assignment
      logger.info('Permissions assigned to user by admin', {
        userId,
        userEmail: user.email,
        permissionIds,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

    res.json({ message: 'Permissions assigned successfully', data: user.toJSON() });
  })
);

/**
 * DELETE /api/admin/users/:id/permissions/:permissionId
 * Remove a permission from a user
 */
router.delete(
  '/users/:id/permissions/:permissionId',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.params.id;
      const permissionId = req.params.permissionId;

      // Validate MongoDB ObjectId formats
      if (!validateObjectId(userId, res, 'User ID')) return;
      if (!validateObjectId(permissionId, res, 'Permission ID')) return;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Remove permission
      user.permissions = user.permissions.filter(
        (p) => p.toString() !== permissionId
      );
      await user.save();

      // Log removal
      logger.info('Permission removed from user by admin', {
        userId,
        userEmail: user.email,
        permissionId,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

    res.json({ message: 'Permission removed successfully', data: user.toJSON() });
  })
);

/**
 * GET /api/admin/users/:id/permissions
 * Get user's direct permissions
 */
router.get(
  '/users/:id/permissions',
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

      // Find user with permissions populated
      const user = await User.findById(userId).populate('permissions').lean();

      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Get direct permissions (user.permissions is populated, so it's an array of Permission documents)
      const directPermissions = (user.permissions || []) as unknown as Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        description: string;
        resources: string[];
        actions: string[];
        createdAt: Date;
        updatedAt: Date;
      }>;

      res.json({
        data: directPermissions.map((permission) => ({
          id: (permission._id as { toString: () => string }).toString(),
          name: permission.name,
          description: permission.description,
          resources: permission.resources,
          actions: permission.actions,
          createdAt: permission.createdAt,
          updatedAt: permission.updatedAt,
        })),
      });
  })
);

/**
 * GET /api/admin/users/:id/permissions/effective
 * Get user's effective permissions (role + direct)
 */
router.get(
  '/users/:id/permissions/effective',
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.params.id;

      // Validate MongoDB ObjectId format
      if (!validateObjectId(userId, res, 'User ID')) return;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Get effective permissions using the User model method
      const effectivePermissions = await user.getEffectivePermissions();

      // Get detailed permission information for each effective permission
      // We need to find the actual Permission documents that match these resources/actions
      const allPermissions = await Permission.find().lean();
      
      // Map effective permissions to full permission details
      const detailedPermissions: Array<{
        id: string;
        name: string;
        description: string;
        resources: string[];
        actions: string[];
        source: 'role' | 'direct';
        roleName?: string;
      }> = [];

      // Get user's roles to identify role-based permissions
      await user.populate('roles');
      const userRoles = user.roles as unknown as Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        displayName: string;
        permissions: mongoose.Types.ObjectId[];
      }>;

      // Get role permissions
      const rolePermissionIds = new Set<string>();
      const rolePermissionMap = new Map<string, string>(); // permissionId -> roleName
      
      for (const role of userRoles) {
        if (role.permissions && Array.isArray(role.permissions)) {
          for (const permId of role.permissions) {
            const permIdStr = permId.toString();
            rolePermissionIds.add(permIdStr);
            if (!rolePermissionMap.has(permIdStr)) {
              rolePermissionMap.set(permIdStr, role.displayName || role.name);
            }
          }
        }
      }

      // Get direct permission IDs
      const directPermissionIds = new Set(
        user.permissions.map((p) => p.toString())
      );

      // Build detailed permissions list
      for (const perm of allPermissions) {
        const permId = (perm._id as { toString: () => string }).toString();
        const isFromRole = rolePermissionIds.has(permId);
        const isDirect = directPermissionIds.has(permId);

        if (isFromRole || isDirect) {
          detailedPermissions.push({
            id: permId,
            name: perm.name,
            description: perm.description,
            resources: perm.resources,
            actions: perm.actions,
            source: isDirect ? 'direct' : 'role',
            roleName: isFromRole ? rolePermissionMap.get(permId) : undefined,
          });
        }
      }

      // Remove duplicates (same permission from multiple roles)
      const uniquePermissions = Array.from(
        new Map(detailedPermissions.map((p) => [p.id, p])).values()
      );

      res.json({
        data: uniquePermissions,
      });
  })
);

/**
 * POST /api/admin/users/:id/permissions/bulk
 * Bulk set permissions for a user (replaces all existing direct permissions)
 * Body: { permissionIds: string[] }
 */
router.post(
  '/users/:id/permissions/bulk',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.params.id;

      // Validate MongoDB ObjectId format
      if (!validateObjectId(userId, res, 'User ID')) return;

      // Validate request body
      const bulkSchema = z.object({
        permissionIds: z.array(z.string()).min(0, 'Permission IDs array is required'),
      });
      const validationResult = bulkSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json(
          createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
        );
        return;
      }

      const { permissionIds } = validationResult.data;

      // Validate all permission IDs are valid ObjectIds
      if (!validateObjectIds(permissionIds, res, 'Permission IDs')) return;

      // Verify all permissions exist (if any provided)
      if (permissionIds.length > 0) {
        const permissions = await Permission.find({ _id: { $in: permissionIds } });
        if (permissions.length !== permissionIds.length) {
          res.status(404).json(createErrorResponse('Permission not found', 'One or more permissions do not exist'));
          return;
        }
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Replace all direct permissions with the new set
      user.permissions = permissionIds.map((id) => new mongoose.Types.ObjectId(id));
      await user.save();

      // Log bulk assignment
      logger.info('Permissions bulk set for user by admin', {
        userId,
        userEmail: user.email,
        permissionIds,
        permissionCount: permissionIds.length,
        adminUserId: req.userId || 'anonymous',
        requestId: req.requestId,
      });

      res.json({
        message: 'Permissions bulk set successfully',
        data: user.toJSON(),
      });
  })
);

/**
 * GET /api/admin/users/:id/roles
 * Get user's roles
 */
router.get(
  '/users/:id/roles',
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

      // Find user with roles populated
      const user = await User.findById(userId).populate('roles').lean();

      if (!user) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
        return;
      }

      // Get roles with their groups populated
      const roles = await Role.find({ _id: { $in: user.roles } })
        .populate('group')
        .lean();

      res.json({
        data: roles.map((role) => ({
          id: (role._id as { toString: () => string }).toString(),
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissionsCount: Array.isArray(role.permissions) ? role.permissions.length : 0,
          group: role.group ? {
            id: (role.group as any)._id ? (role.group as any)._id.toString() : role.group.toString(),
            name: (role.group as any).name || '',
            displayName: (role.group as any).displayName || '',
            isSystemGroup: (role.group as any).isSystemGroup || false,
          } : null,
        })),
      });
  })
);

/**
 * PATCH /api/admin/users/:id/roles
 * Assign/update roles for user
 * Body: { roleIds: string[] } - Array of role IDs
 */
router.patch(
  '/users/:id/roles',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    // Validate request body
    const assignSchema = z.object({
      roleIds: z.array(z.string()).min(0, 'Role IDs array is required'),
    });
    const validationResult = assignSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(
        createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
      );
      return;
    }

    const { roleIds } = validationResult.data;

    // Validate all role IDs are valid ObjectIds
    if (!validateObjectIds(roleIds, res, 'Role IDs')) return;

    // Verify all roles exist and populate their groups
    const roleObjectIds = roleIds.map((id) => new mongoose.Types.ObjectId(id));
    const foundRoles = await Role.find({ _id: { $in: roleObjectIds } }).populate('group');
    if (foundRoles.length !== roleIds.length) {
      res.status(404).json(createErrorResponse('Role not found', 'One or more roles do not exist'));
      return;
    }

    // Find user
    const user = await User.findById(userId).populate('roles');
    if (!user) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
      return;
    }

    // Get all role groups that require one role
    const groupsRequiringOne = await RoleGroup.find({ requiresOne: true }).populate('defaultRoleId');
    
    // Get user's current roles with their groups
    const userCurrentRoles = await Role.find({ _id: { $in: user.roles } }).populate('group');
    
    // Get new roles with their groups
    const newRoles = await Role.find({ _id: { $in: roleObjectIds } }).populate('group');
    
    // Combine current and new roles for validation
    const allRoleIds = new Set([...user.roles.map((r) => r.toString()), ...roleObjectIds.map((id) => id.toString())]);
    const allRoles = [...userCurrentRoles, ...newRoles];

    for (const group of groupsRequiringOne) {
      const groupId = (group._id as { toString: () => string }).toString();
      const currentRolesInGroup = userCurrentRoles.filter((r) => r.group && ((r.group as any)._id ? (r.group as any)._id.toString() : r.group.toString()) === groupId);
      const newRolesInGroup = newRoles.filter((r) => r.group && ((r.group as any)._id ? (r.group as any)._id.toString() : r.group.toString()) === groupId);
      
      // Calculate final roles in group after assignment
      // If new roles from this group are being assigned, they replace current roles from this group
      // Otherwise, keep current roles
      const finalRoles = newRolesInGroup.length > 0 
        ? newRolesInGroup  // New roles replace current roles
        : currentRolesInGroup; // Keep current roles
      
      if (finalRoles.length === 0) {
        // User will have no role from this group - assign default role
        if (group.defaultRoleId) {
          const defaultRoleId = (group.defaultRoleId as any)._id ? (group.defaultRoleId as any)._id.toString() : group.defaultRoleId.toString();
          if (!allRoleIds.has(defaultRoleId)) {
            allRoleIds.add(defaultRoleId);
            roleObjectIds.push(new mongoose.Types.ObjectId(defaultRoleId));
          }
        } else {
          res.status(400).json(
            createErrorResponse(
              'Missing required role',
              `User must have exactly one role from group "${group.displayName}". No default role is set for this group.`
            )
          );
          return;
        }
      } else if (finalRoles.length > 1) {
        res.status(400).json(
          createErrorResponse(
            'Too many roles from group',
            `User can only have one role from group "${group.displayName}". Would have: ${finalRoles.map((r) => r.displayName).join(', ')}`
          )
        );
        return;
      }
      
      // If new roles from this group are being assigned, remove current roles from this group
      if (newRolesInGroup.length > 0) {
        user.roles = user.roles.filter((r) => {
          const role = userCurrentRoles.find((cr) => (cr._id as { toString: () => string }).toString() === r.toString());
          if (!role || !role.group) return true;
          const rGroupId = (role.group as any)._id ? (role.group as any)._id.toString() : role.group.toString();
          return rGroupId !== groupId;
        });
      }
    }

    // Add new roles (avoid duplicates)
    const currentRoleIds = user.roles.map((r) => r.toString());
    const finalRoleIds = roleObjectIds.filter((id) => !currentRoleIds.includes(id.toString()));
    user.roles = [...user.roles, ...finalRoleIds];

    await user.save();

    // Log assignment
    await logActivity(req, 'assign_roles_to_user', {
      userId,
      userEmail: user.email,
      roleIds,
      adminUserId: req.userId || 'anonymous',
    });

    res.json({ message: 'Roles assigned successfully', data: user.toJSON() });
  })
);

/**
 * POST /api/admin/users/:id/roles
 * Add role to user
 * Body: { roleId: string }
 */
router.post(
  '/users/:id/roles',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    // Validate request body
    const addSchema = z.object({
      roleId: z.string().min(1, 'Role ID is required'),
    });
    const validationResult = addSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json(
        createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
      );
      return;
    }

    const { roleId } = validationResult.data;

    // Validate role ID is valid ObjectId
    if (!validateObjectId(roleId, res, 'Role ID')) return;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
      return;
    }

    // Check if user already has this role
    if (user.roles.some((r) => r.toString() === roleId)) {
      res.status(409).json(createErrorResponse('Role already assigned', 'User already has this role'));
      return;
    }

    // Get the role and its group
    const role = await Role.findById(roleId).populate('group');
    if (!role) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
      return;
    }

    // Check if the role's group requires one role
    if (role.group) {
      const group = await RoleGroup.findById((role.group as any)._id || role.group);
      if (group && group.requiresOne) {
        // Check if user already has a role from this group
        const userRoles = await Role.find({ _id: { $in: user.roles } }).populate('group');
        const existingRoleInGroup = userRoles.find(
          (r) => r.group && ((r.group as any)._id ? (r.group as any)._id.toString() : r.group.toString()) === (group._id as { toString: () => string }).toString()
        );

        if (existingRoleInGroup) {
          // Replace the existing role with the new one
          user.roles = user.roles.filter((r) => r.toString() !== (existingRoleInGroup._id as { toString: () => string }).toString());
        }
      }
    }

    // Add role
    const roleObjectId = new mongoose.Types.ObjectId(roleId);
    user.roles.push(roleObjectId);
    await user.save();

    // Log assignment
    await logActivity(req, 'add_role_to_user', {
      userId,
      userEmail: user.email,
      roleId,
      adminUserId: req.userId || 'anonymous',
    });

    res.json({ message: 'Role added successfully', data: user.toJSON() });
  })
);

/**
 * DELETE /api/admin/users/:id/roles/:roleId
 * Remove role from user
 */
router.delete(
  '/users/:id/roles/:roleId',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;
    const roleId = req.params.roleId;

    // Validate MongoDB ObjectId formats
    if (!validateObjectId(userId, res, 'User ID')) return;
    if (!validateObjectId(roleId, res, 'Role ID')) return;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'User not found'));
      return;
    }

    // Remove role
    user.roles = user.roles.filter((r) => r.toString() !== roleId);
    await user.save();

    // Log removal
    await logActivity(req, 'remove_role_from_user', {
      userId,
      userEmail: user.email,
      roleId,
      adminUserId: req.userId || 'anonymous',
    });

    res.json({ message: 'Role removed successfully', data: user.toJSON() });
  })
);

/**
 * GET /api/admin/feature-flags
 * List all feature flags
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get('/feature-flags', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const skip = (page - 1) * limit;

    // Get total count
    const total = await FeatureFlag.countDocuments();

    // Get feature flags
    const featureFlags = await FeatureFlag.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: featureFlags,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  })
);

/**
 * GET /api/admin/feature-flags/:name
 * Get feature flag details by name
 */
router.get('/feature-flags/:name', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const name = req.params.name.toLowerCase();

    const featureFlag = await FeatureFlag.findOne({ name }).lean();

    if (!featureFlag) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Feature flag not found'));
      return;
    }

    res.json({ data: featureFlag });
  })
);

/**
 * Validation schema for creating/updating feature flag
 */
const featureFlagSchema = z.object({
  name: z.string().min(1, 'Feature flag name is required').max(100, 'Feature flag name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  enabled: z.boolean().optional(),
});

/**
 * POST /api/admin/feature-flags
 * Create a new feature flag
 * Body: { name: string, description: string, enabled?: boolean }
 */
router.post(
  '/feature-flags',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Validate request body
      const validationResult = featureFlagSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json(
          createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
        );
        return;
      }

      const { name, description, enabled } = validationResult.data;

      // Check if feature flag with same name already exists
      const existingFlag = await FeatureFlag.findOne({ name: name.toLowerCase() });
      if (existingFlag) {
        res.status(409).json(createErrorResponse('Feature flag already exists', `Feature flag with name '${name}' already exists`));
        return;
      }

      // Create feature flag
      const featureFlag = new FeatureFlag({
        name: name.toLowerCase(),
        description,
        enabled: enabled ?? false,
      });

      await featureFlag.save();

    res.status(201).json({ data: featureFlag.toJSON() });
  })
);

/**
 * PUT /api/admin/feature-flags/:name
 * Update a feature flag
 * Body: { description?: string, enabled?: boolean }
 */
router.put(
  '/feature-flags/:name',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const name = req.params.name.toLowerCase();

      // Validate request body (all fields optional for update)
      const updateSchema = featureFlagSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json(
          createErrorResponse(ErrorMessages.VALIDATION_FAILED, undefined, validationResult.error.issues)
        );
        return;
      }

      const { description, enabled } = validationResult.data;

      // Find feature flag
      const featureFlag = await FeatureFlag.findOne({ name });

      if (!featureFlag) {
        res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Feature flag not found'));
        return;
      }

      // Update fields if provided
      if (description !== undefined) {
        featureFlag.description = description;
      }
      if (enabled !== undefined) {
        featureFlag.enabled = enabled;
      }

      await featureFlag.save();

    res.json({ data: featureFlag.toJSON() });
  })
);

/**
 * DELETE /api/admin/feature-flags/:name
 * Delete a feature flag
 */
router.delete(
  '/feature-flags/:name',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const name = req.params.name.toLowerCase();

    // Find and delete feature flag
    const featureFlag = await FeatureFlag.findOneAndDelete({ name });

    if (!featureFlag) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Feature flag not found'));
      return;
    }

    // Log deletion
    logger.info('Feature flag deleted by admin', {
      featureFlagName: name,
      adminUserId: req.userId || 'anonymous',
      requestId: req.requestId,
    });

    res.json({ message: 'Feature flag deleted successfully' });
  })
);

/**
 * GET /api/admin/users/:id/activity-logs
 * Get activity logs for a specific user
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 50, max: 200)
 *   - action: Filter by action type (optional)
 *   - startDate: Filter by start date (ISO string, optional)
 *   - endDate: Filter by end date (ISO string, optional)
 */
router.get('/users/:id/activity-logs', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(userId, res, 'User ID')) return;

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const skip = (page - 1) * limit;
    const actionFilter = req.query.action as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    // Build query
    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (actionFilter) {
      query.action = actionFilter;
    }

    if (startDate || endDate) {
      const timestampQuery: Record<string, Date> = {};
      if (startDate) {
        timestampQuery.$gte = startDate;
      }
      if (endDate) {
        timestampQuery.$lte = endDate;
      }
      query.timestamp = timestampQuery;
    }

    // Get total count
    const total = await ActivityLog.countDocuments(query);

    // Get activity logs
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform logs for response
    const logsData = logs.map((log) => ({
      id: (log._id as mongoose.Types.ObjectId).toString(),
      userId: (log.userId as mongoose.Types.ObjectId).toString(),
      action: log.action,
      method: log.method,
      path: log.path,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
      requestId: log.requestId || null,
      details: log.details || {},
      timestamp: log.timestamp,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: logsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  })
);

/**
 * GET /api/admin/stats
 * Get database statistics
 * Returns:
 *   - Connection status
 *   - Database name
 *   - Collection counts
 *   - Database statistics
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = mongoose.connection;
    const db = connection.db;

    if (!db) {
      res.status(503).json(
        createErrorResponse('Database not connected', 'Database connection is not available')
      );
      return;
    }

    // Get database name
    const dbName = db.databaseName;

    // Get connection status
    const connectionState = connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    const status = connectionStates[connectionState as keyof typeof connectionStates] || 'unknown';

    // Get collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    // Get collection counts
    const collectionCounts: Record<string, number> = {};
    for (const collectionName of collectionNames) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        collectionCounts[collectionName] = count;
      } catch (error) {
        logger.warn(`Failed to get count for collection ${collectionName}`, { error });
        collectionCounts[collectionName] = -1; // Indicate error
      }
    }

    // Get database stats (if available)
    let dbStats = null;
    try {
      dbStats = await db.stats();
    } catch (error) {
      logger.warn('Failed to get database stats', { error });
    }

    res.json({
      data: {
        connection: {
          status,
          state: connectionState,
          database: dbName,
        },
        collections: {
          names: collectionNames,
          counts: collectionCounts,
          total: collectionNames.length,
        },
        stats: dbStats
          ? {
              dataSize: dbStats.dataSize,
              storageSize: dbStats.storageSize,
              indexes: dbStats.indexes,
              indexSize: dbStats.indexSize,
              collections: dbStats.collections,
            }
          : null,
      },
    });
  })
);

/**
 * GET /api/admin/collections/:name/documents
 * Get documents from a collection
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get('/collections/:name/documents', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = mongoose.connection;
    const db = connection.db;

    if (!db) {
      res.status(503).json(
        createErrorResponse('Database not connected', 'Database connection is not available')
      );
      return;
    }

    const collectionName = req.params.name;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    // Verify collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some((col) => col.name === collectionName);
    
    if (!collectionExists) {
      res.status(404).json(
        createErrorResponse('Collection not found', `Collection '${collectionName}' does not exist`)
      );
      return;
    }

    const collection = db.collection(collectionName);

    // Get total count
    const total = await collection.countDocuments();

    // Get documents
    const documents = await collection
      .find({})
      .skip(skip)
      .limit(limit)
      .toArray();

    // Transform _id to id for consistency
    const transformedDocuments = documents.map((doc) => {
      const { _id, ...rest } = doc;
      return {
        id: _id.toString(),
        ...rest,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      data: transformedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  })
);

/**
 * PUT /api/admin/collections/:name/documents/:id
 * Update a document in a collection
 */
router.put('/collections/:name/documents/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = mongoose.connection;
    const db = connection.db;

    if (!db) {
      res.status(503).json(
        createErrorResponse('Database not connected', 'Database connection is not available')
      );
      return;
    }

    const collectionName = req.params.name;
    const documentId = req.params.id;
    const updates = req.body;

    // Verify collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some((col) => col.name === collectionName);
    
    if (!collectionExists) {
      res.status(404).json(
        createErrorResponse('Collection not found', `Collection '${collectionName}' does not exist`)
      );
      return;
    }

    const collection = db.collection(collectionName);

    // Verify document exists
    const document = await collection.findOne({ _id: new mongoose.Types.ObjectId(documentId) });
    if (!document) {
      res.status(404).json(
        createErrorResponse('Document not found', `Document with ID '${documentId}' does not exist`)
      );
      return;
    }

    // Update document (exclude _id from updates)
    const { _id, ...updateFields } = updates;
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(documentId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      res.status(404).json(
        createErrorResponse('Document not found', `Document with ID '${documentId}' does not exist`)
      );
      return;
    }

    // Get updated document
    const updatedDocument = await collection.findOne({ _id: new mongoose.Types.ObjectId(documentId) });
    if (!updatedDocument) {
      res.status(404).json(
        createErrorResponse('Document not found', `Document with ID '${documentId}' does not exist`)
      );
      return;
    }

    // Transform _id to id for consistency
    const { _id: docId, ...rest } = updatedDocument;
    const transformedDocument = {
      id: docId.toString(),
      ...rest,
    };

    res.json({
      data: transformedDocument,
    });
  })
);

/**
 * DELETE /api/admin/collections/:name/documents/:id
 * Delete a document from a collection
 */
router.delete('/collections/:name/documents/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const connection = mongoose.connection;
    const db = connection.db;

    if (!db) {
      res.status(503).json(
        createErrorResponse('Database not connected', 'Database connection is not available')
      );
      return;
    }

    const collectionName = req.params.name;
    const documentId = req.params.id;

    // Verify collection exists
    const collections = await db.listCollections().toArray();
    const collectionExists = collections.some((col) => col.name === collectionName);
    
    if (!collectionExists) {
      res.status(404).json(
        createErrorResponse('Collection not found', `Collection '${collectionName}' does not exist`)
      );
      return;
    }

    const collection = db.collection(collectionName);

    // Verify document exists
    const document = await collection.findOne({ _id: new mongoose.Types.ObjectId(documentId) });
    if (!document) {
      res.status(404).json(
        createErrorResponse('Document not found', `Document with ID '${documentId}' does not exist`)
      );
      return;
    }

    // Delete document
    const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(documentId) });

    if (result.deletedCount === 0) {
      res.status(404).json(
        createErrorResponse('Document not found', `Document with ID '${documentId}' does not exist`)
      );
      return;
    }

    res.json({
      message: 'Document deleted successfully',
    });
  })
);

export default router;

