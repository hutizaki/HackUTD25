import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { RoleGroup } from '../models/RoleGroup';
import { Role } from '../models/Role';
import { adminOnly } from '../middleware/admin';
import { csrfProtection } from '../middleware/csrf';
import { ErrorMessages, createErrorResponse } from '../utils/errors';
import { logger } from '../config/logger';
import { logActivity } from '../utils/activityLog';
import { asyncHandler } from '../utils/asyncHandler';
import { validateRequest } from '../middleware/validators/validateRequest';
import { validateObjectId } from '../utils/validation';

const router = Router();

// All role group routes require admin access
router.use(adminOnly);

/**
 * Validation schema for creating role group
 */
const createRoleGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Group name must be lowercase alphanumeric with dashes only'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  requiresOne: z.boolean().optional(),
  defaultRoleId: z.string().optional(),
});

/**
 * Validation schema for updating role group
 */
const updateRoleGroupSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  requiresOne: z.boolean().optional(),
  defaultRoleId: z.string().optional(),
});

/**
 * GET /api/admin/role-groups
 * List all role groups
 */
router.get('/role-groups', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const groups = await RoleGroup.find()
    .populate('defaultRoleId')
    .sort({ createdAt: -1 })
    .lean();

  const transformedGroups = groups.map((group) => ({
    id: (group._id as { toString: () => string }).toString(),
    name: group.name,
    displayName: group.displayName,
    description: group.description,
    requiresOne: group.requiresOne,
    defaultRoleId: group.defaultRoleId
      ? (group.defaultRoleId as any)._id
        ? (group.defaultRoleId as any)._id.toString()
        : group.defaultRoleId.toString()
      : null,
    defaultRole: group.defaultRoleId
      ? {
          id: (group.defaultRoleId as any)._id
            ? (group.defaultRoleId as any)._id.toString()
            : group.defaultRoleId.toString(),
          name: (group.defaultRoleId as any).name || '',
          displayName: (group.defaultRoleId as any).displayName || '',
        }
      : null,
    isSystemGroup: group.isSystemGroup,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  }));

  res.json({ data: transformedGroups });
}));

/**
 * GET /api/admin/role-groups/:id
 * Get role group details
 */
router.get('/role-groups/:id', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const groupId = req.params.id;

  if (!validateObjectId(groupId, res, 'Group ID')) return;

  const group = await RoleGroup.findById(groupId).populate('defaultRoleId').lean();

  if (!group) {
    res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role group not found'));
    return;
  }

  res.json({
    data: {
      id: (group._id as { toString: () => string }).toString(),
      name: group.name,
      displayName: group.displayName,
      description: group.description,
      requiresOne: group.requiresOne,
      defaultRoleId: group.defaultRoleId
        ? (group.defaultRoleId as any)._id
          ? (group.defaultRoleId as any)._id.toString()
          : group.defaultRoleId.toString()
        : null,
      defaultRole: group.defaultRoleId
        ? {
            id: (group.defaultRoleId as any)._id
              ? (group.defaultRoleId as any)._id.toString()
              : group.defaultRoleId.toString(),
            name: (group.defaultRoleId as any).name || '',
            displayName: (group.defaultRoleId as any).displayName || '',
          }
        : null,
      isSystemGroup: group.isSystemGroup,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    },
  });
}));

/**
 * POST /api/admin/role-groups
 * Create a new role group
 */
router.post(
  '/role-groups',
  csrfProtection,
  validateRequest(createRoleGroupSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { name, displayName, description, requiresOne, defaultRoleId } = req.body; // Already validated by middleware

    // Check if group with same name already exists
    const existingGroup = await RoleGroup.findOne({ name: name.toLowerCase() });
    if (existingGroup) {
      res.status(409).json(createErrorResponse('Group already exists', `Group with name '${name}' already exists`));
      return;
    }

    // Validate defaultRoleId if requiresOne is true
    if (requiresOne && defaultRoleId) {
      if (!validateObjectId(defaultRoleId, res, 'Default role ID')) return;

      const defaultRole = await Role.findById(defaultRoleId);
      if (!defaultRole) {
        res.status(404).json(createErrorResponse('Default role not found', 'The specified default role does not exist'));
        return;
      }
    } else if (requiresOne && !defaultRoleId) {
      res.status(400).json(createErrorResponse('Default role required', 'Default role is required when requiresOne is true'));
      return;
    }

    // Create group
    const group = new RoleGroup({
      name: name.toLowerCase(),
      displayName,
      description,
      requiresOne: requiresOne || false,
      defaultRoleId: defaultRoleId ? new mongoose.Types.ObjectId(defaultRoleId) : undefined,
      isSystemGroup: false,
    });

    await group.save();

    // Log activity
    await logActivity(req, 'create_role_group', {
      groupId: (group._id as { toString: () => string }).toString(),
      groupName: group.name,
    });

    res.status(201).json({ data: group.toJSON() });
  })
);

/**
 * PATCH /api/admin/role-groups/:id
 * Update a role group
 */
router.patch(
  '/role-groups/:id',
  csrfProtection,
  validateRequest(updateRoleGroupSchema),
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const groupId = req.params.id;

    if (!validateObjectId(groupId, res, 'Group ID')) return;

    const group = await RoleGroup.findById(groupId);
    if (!group) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role group not found'));
      return;
    }

    // System groups cannot be modified
    if (group.isSystemGroup) {
      res.status(403).json(createErrorResponse('Cannot modify system group', 'System groups cannot be modified'));
      return;
    }

    const { displayName, description, requiresOne, defaultRoleId } = req.body; // Already validated by middleware

    // Update fields
    if (displayName !== undefined) {
      group.displayName = displayName;
    }
    if (description !== undefined) {
      group.description = description;
    }
    if (requiresOne !== undefined) {
      group.requiresOne = requiresOne;
      // If requiresOne is set to false, clear defaultRoleId
      if (!requiresOne) {
        group.defaultRoleId = undefined;
      }
    }
    if (defaultRoleId !== undefined) {
      if (defaultRoleId) {
        if (!validateObjectId(defaultRoleId, res, 'Default role ID')) return;

        const defaultRole = await Role.findById(defaultRoleId);
        if (!defaultRole) {
          res.status(404).json(createErrorResponse('Default role not found', 'The specified default role does not exist'));
          return;
        }

        // Verify the default role belongs to this group
        if (defaultRole.group.toString() !== groupId) {
          res.status(400).json(createErrorResponse('Invalid default role', 'Default role must belong to this group'));
          return;
        }

        group.defaultRoleId = new mongoose.Types.ObjectId(defaultRoleId);
      } else {
        group.defaultRoleId = undefined;
      }
    }

    // Validate: if requiresOne is true, defaultRoleId must be set
    if (group.requiresOne && !group.defaultRoleId) {
      res.status(400).json(createErrorResponse('Default role required', 'Default role is required when requiresOne is true'));
      return;
    }

    await group.save();

    // Log activity
    await logActivity(req, 'update_role_group', {
      groupId: (group._id as { toString: () => string }).toString(),
      groupName: group.name,
    });

    res.json({ data: group.toJSON() });
  })
);

/**
 * DELETE /api/admin/role-groups/:id
 * Delete a role group
 */
router.delete(
  '/role-groups/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const groupId = req.params.id;

    if (!validateObjectId(groupId, res, 'Group ID')) return;

    const group = await RoleGroup.findById(groupId);
    if (!group) {
      res.status(404).json(createErrorResponse(ErrorMessages.NOT_FOUND, 'Role group not found'));
      return;
    }

    // System groups cannot be deleted
    if (group.isSystemGroup) {
      res.status(403).json(createErrorResponse('Cannot delete system group', 'System groups cannot be deleted'));
      return;
    }

    // Check if there are any roles in this group
    const rolesInGroup = await Role.countDocuments({ group: groupId });
    if (rolesInGroup > 0) {
      res.status(400).json(
        createErrorResponse(
          'Cannot delete group with roles',
          `Cannot delete group that contains ${rolesInGroup} role(s). Please move or delete all roles first.`
        )
      );
      return;
    }

    await RoleGroup.findByIdAndDelete(groupId);

    // Log activity
    await logActivity(req, 'delete_role_group', {
      groupId: (group._id as { toString: () => string }).toString(),
      groupName: group.name,
    });

    res.json({ message: 'Role group deleted successfully' });
  })
);

export default router;

