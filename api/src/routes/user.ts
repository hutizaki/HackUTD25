import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { getEnabledFeatures, isFeatureEnabled } from '../utils/featureFlags';
import { User } from '../models/User';
import { Permission } from '../models/Permission';
import { logActivity } from '../utils/activityLog';
import { sanitizeName } from '../utils/sanitize';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';

const router = Router();

/**
 * GET /user/profile
 * Get user profile (protected route)
 */
router.get('/profile', authenticate, asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
    return;
  }

  // Log profile access
  await logActivity(req, 'view_profile', {});

  res.json({ data: req.user });
}));

/**
 * GET /api/feature-flags
 * Get enabled feature flags (public endpoint)
 * Returns list of enabled feature flag names
 */
router.get('/feature-flags', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const enabledFeatures = await getEnabledFeatures();
  res.json({ data: enabledFeatures });
}));

/**
 * Zod schema for theme preference update
 */
const themePreferenceSchema = z.object({
  themePreference: z.enum(['light', 'dark', 'system']),
});

/**
 * PATCH /api/user/theme-preference
 * Update user's theme preference (protected route)
 * Requires authentication and dark-mode-toggle feature flag to be enabled
 */
router.patch('/theme-preference', authenticate, validateRequest(themePreferenceSchema), asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.userId) {
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
    return;
  }

  // Check if dark-mode-toggle feature flag is enabled
  const isDarkModeEnabled = await isFeatureEnabled('dark-mode-toggle');
  if (!isDarkModeEnabled) {
    res.status(403).json(
      createErrorResponse('Dark mode toggle feature is not enabled')
    );
    return;
  }

  const { themePreference } = req.body; // Already validated by middleware

  // Update user's theme preference
  const user = await User.findByIdAndUpdate(
    req.userId,
    { themePreference },
    { new: true, runValidators: true }
  );

  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  // Return updated user (themePreference will be included via toJSON transform)
  res.json({
    data: {
      id: (user._id as { toString: () => string }).toString(),
      email: user.email,
      name: user.name,
      themePreference: user.themePreference,
      createdAt: user.createdAt,
    },
  });

  // Log theme preference update
  await logActivity(req, 'update_theme_preference', { themePreference });
}));

/**
 * Zod schema for name update
 */
const nameUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

/**
 * PATCH /api/user/name
 * Update user's name (protected route)
 * Requires authentication and "edit-name" permission
 */
router.patch('/name', authenticate, validateRequest(nameUpdateSchema), asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.userId) {
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
    return;
  }

  // Get user with permissions populated
  const user = await User.findById(req.userId).populate('roles').populate('permissions');
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  // Check if user has "edit-name" permission
  const hasPermission = await user.hasPermission('account', 'write');
  if (!hasPermission) {
    res.status(403).json(createErrorResponse('You do not have permission to edit your name'));
    return;
  }

  const { name } = req.body; // Already validated by middleware
  const sanitizedName = sanitizeName(name);

  // Update user's name
  const updatedUser = await User.findByIdAndUpdate(
    req.userId,
    { name: sanitizedName },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  // Return updated user
  res.json({
    data: {
      id: (updatedUser._id as { toString: () => string }).toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      themePreference: updatedUser.themePreference,
      createdAt: updatedUser.createdAt,
    },
  });

  // Log name update
  await logActivity(req, 'update_name', { name: sanitizedName });
}));

/**
 * GET /user/permissions/effective
 * Get current user's effective permissions (role + direct)
 */
router.get('/permissions/effective', authenticate, asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.userId) {
    res.status(401).json(createErrorResponse(ErrorMessages.UNAUTHORIZED));
    return;
  }

  // Find user (don't populate yet - we'll do it selectively)
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json(createErrorResponse('User not found'));
    return;
  }

  // Get all permissions from database
  const allPermissions = await Permission.find().lean();
  
  // Get direct permission IDs (unpopulated - just ObjectIds)
  const directPermissionIds = new Set(
    user.permissions.map((p) => p.toString())
  );

  // Get user's roles to identify role-based permissions
  // Populate roles (but not their permissions yet)
  await user.populate('roles');
  const userRoles = user.roles as unknown as Array<{
    _id: mongoose.Types.ObjectId;
    name: string;
    displayName: string;
    permissions: mongoose.Types.ObjectId[];
  }>;

  // Get role permissions (unpopulated - just ObjectIds)
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

  // Build detailed permissions list
  const detailedPermissions: Array<{
    id: string;
    name: string;
    description: string;
    resources: string[];
    actions: string[];
    source: 'role' | 'direct';
    roleName?: string;
  }> = [];

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
}));

export default router;

