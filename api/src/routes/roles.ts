import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Role } from '../models/Role';
import { RoleGroup } from '../models/RoleGroup';
import { Permission } from '../models/Permission';
import { User } from '../models/User';
import { adminOnly } from '../middleware/admin';
import { csrfProtection } from '../middleware/csrf';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { logger } from '../config/logger';
import { logActivity } from '../utils/activityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';
import { validateObjectId, validateObjectIds } from '../utils/validation';

const router = Router();

// All role routes require development environment (NO authentication required)
router.use(adminOnly);

/**
 * Validation schema for creating role
 */
const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .max(100, 'Role name must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Role name must be lowercase alphanumeric with dashes only'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  permissions: z.array(z.string()).optional(),
  group: z.string().min(1, 'Group is required'),
});

/**
 * Validation schema for updating role
 */
const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).optional(),
  group: z.string().min(1).optional(),
});

/**
 * GET /api/admin/roles
 * List all roles with pagination
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 */
router.get('/roles', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  const skip = (page - 1) * limit;

  // Get total count
  const total = await Role.countDocuments();

  // Get roles with permissions and group populated
  const roles = await Role.find()
    .populate('permissions')
    .populate('group')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Transform roles
  const transformedRoles = roles.map((role) => ({
    id: ((role._id as unknown) as { toString: () => string }).toString(),
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions || [],
    permissionsCount: Array.isArray(role.permissions) ? role.permissions.length : 0,
    group: role.group ? {
      id: (role.group as any)._id ? (role.group as any)._id.toString() : role.group.toString(),
      name: (role.group as any).name || '',
      displayName: (role.group as any).displayName || '',
      isSystemGroup: (role.group as any).isSystemGroup || false,
    } : null,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }));

  res.json({
    data: transformedRoles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  });
}));

/**
 * GET /api/admin/roles/:id
 * Get role details
 */
router.get('/roles/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const roleId = req.params.id;

  // Validate MongoDB ObjectId format
  if (!validateObjectId(roleId, res, 'Role ID')) return;

  // Find role with permissions and group populated
  const role = await Role.findById(roleId).populate('permissions').populate('group').lean();

  if (!role) {
    res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
    return;
  }

  res.json({
    data: {
      id: (role._id as { toString: () => string }).toString(),
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions || [],
      group: role.group ? {
        id: (role.group as any)._id ? (role.group as any)._id.toString() : role.group.toString(),
        name: (role.group as any).name || '',
        displayName: (role.group as any).displayName || '',
        isSystemGroup: (role.group as any).isSystemGroup || false,
      } : null,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    },
  });
}));

/**
 * POST /api/admin/roles
 * Create a new role
 * Body: { name, displayName, description?, permissions? }
 */
router.post(
  '/roles',
  csrfProtection,
  validateRequest(createRoleSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, displayName, description, permissions, group } = req.body; // Already validated by middleware

    // Check if role with same name already exists
    const existingRole = await Role.findOne({ name: name.toLowerCase() });
    if (existingRole) {
      res.status(409).json(createErrorResponse('Role already exists', `Role with name '${name}' already exists`));
      return;
    }

    // Validate group ID
    if (!validateObjectId(group, res, 'Group ID')) return;

    // Verify group exists
    const foundGroup = await RoleGroup.findById(group);
    if (!foundGroup) {
      res.status(404).json(createErrorResponse('Group not found', 'The specified group does not exist'));
      return;
    }

    // Validate permission IDs if provided
    let permissionIds: mongoose.Types.ObjectId[] = [];
    if (permissions && permissions.length > 0) {
      const validatedIds = validateObjectIds(permissions, res, 'Permission IDs');
      if (!validatedIds) return;

      // Verify all permissions exist
      const foundPermissions = await Permission.find({ _id: { $in: permissions } });
      if (foundPermissions.length !== permissions.length) {
        res.status(404).json(createErrorResponse('Permission not found', 'One or more permissions do not exist'));
        return;
      }

      permissionIds = permissions.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    // Create role
    const role = new Role({
      name: name.toLowerCase(),
      displayName,
      description,
      permissions: permissionIds,
      group: new mongoose.Types.ObjectId(group),
    });

    await role.save();

    // Log activity
    await logActivity(req, 'create_role', { roleId: (role._id as { toString: () => string }).toString(), roleName: role.name });

    res.status(201).json({ data: role.toJSON() });
  })
);

/**
 * PATCH /api/admin/roles/:id
 * Update a role
 * Body: { displayName?, description?, permissions? }
 * Cannot update system role name
 */
router.patch(
  '/roles/:id',
  csrfProtection,
  validateRequest(updateRoleSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roleId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(roleId, res, 'Role ID')) return;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
      return;
    }

    const { displayName, description, permissions, group } = req.body; // Already validated by middleware

    // Update fields
    if (displayName !== undefined) {
      role.displayName = displayName;
    }
    if (description !== undefined) {
      role.description = description;
    }
    if (group !== undefined) {
      // Validate group ID
      if (!validateObjectId(group, res, 'Group ID')) return;

      // Verify group exists
      const foundGroup = await RoleGroup.findById(group);
      if (!foundGroup) {
        res.status(404).json(createErrorResponse('Group not found', 'The specified group does not exist'));
        return;
      }

      role.group = new mongoose.Types.ObjectId(group);
    }

    // Update permissions if provided
    if (permissions !== undefined) {
      const validatedIds = validateObjectIds(permissions, res, 'Permission IDs');
      if (!validatedIds) return;

      // Verify all permissions exist
      const foundPermissions = await Permission.find({ _id: { $in: permissions } });
      if (foundPermissions.length !== permissions.length) {
        res.status(404).json(createErrorResponse('Permission not found', 'One or more permissions do not exist'));
        return;
      }

      role.permissions = permissions.map((id: string) => new mongoose.Types.ObjectId(id));
    }

    await role.save();

    // Log activity
    await logActivity(req, 'update_role', { roleId: (role._id as { toString: () => string }).toString(), roleName: role.name });

    res.json({ data: role.toJSON() });
  })
);

/**
 * DELETE /api/admin/roles/:id
 * Delete a role
 * Cannot delete system roles
 * Check if any users have this role before deletion
 */
router.delete(
  '/roles/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roleId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!validateObjectId(roleId, res, 'Role ID')) return;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
      return;
    }

    // Check if role belongs to a system group
    await role.populate('group');
    const roleGroup = role.group as any;
    if (roleGroup && roleGroup.isSystemGroup) {
      res.status(403).json(createErrorResponse('Cannot delete system role', 'Roles in system groups cannot be deleted'));
      return;
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ roles: roleId });
    if (usersWithRole > 0) {
      res.status(409).json(
        createErrorResponse(
          'Cannot delete role',
          `Role is assigned to ${usersWithRole} user(s). Remove role from all users before deleting.`
        )
      );
      return;
    }

    await role.deleteOne();

    // Log activity
    await logActivity(req, 'delete_role', { roleId: (role._id as { toString: () => string }).toString(), roleName: role.name });

    res.json({ message: 'Role deleted successfully' });
  })
);

/**
 * POST /api/admin/roles/:id/permissions
 * Add permission to role
 * Body: { permissionId: string }
 */
router.post(
  '/roles/:id/permissions',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roleId = req.params.id;
    const { permissionId } = req.body;

    // Validate MongoDB ObjectId formats
    if (!validateObjectId(roleId, res, 'Role ID')) return;
    if (!permissionId || !validateObjectId(permissionId, res, 'Permission ID')) return;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
      return;
    }

    // Verify permission exists
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Permission not found'));
      return;
    }

    // Add permission if not already present
    const permissionObjectId = new mongoose.Types.ObjectId(permissionId);
    if (!role.permissions.some((p: mongoose.Types.ObjectId) => p.toString() === permissionId)) {
      role.permissions.push(permissionObjectId);
      await role.save();
    }

    // Log activity
    await logActivity(req, 'add_permission_to_role', {
      roleId: (role._id as { toString: () => string }).toString(),
      roleName: role.name,
      permissionId,
    });

    res.json({ data: role.toJSON() });
  })
);

/**
 * DELETE /api/admin/roles/:id/permissions/:permissionId
 * Remove permission from role
 */
router.delete(
  '/roles/:id/permissions/:permissionId',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const roleId = req.params.id;
    const permissionId = req.params.permissionId;

    // Validate MongoDB ObjectId formats
    if (!validateObjectId(roleId, res, 'Role ID')) return;
    if (!validateObjectId(permissionId, res, 'Permission ID')) return;

    // Find role
    const role = await Role.findById(roleId);
    if (!role) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role not found'));
      return;
    }

    // Remove permission
    role.permissions = role.permissions.filter((p: mongoose.Types.ObjectId) => p.toString() !== permissionId);
    await role.save();

    // Log activity
    await logActivity(req, 'remove_permission_from_role', {
      roleId: (role._id as { toString: () => string }).toString(),
      roleName: role.name,
      permissionId,
    });

    res.json({ data: role.toJSON() });
  })
);

export default router;

