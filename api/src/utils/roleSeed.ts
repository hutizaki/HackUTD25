import mongoose from 'mongoose';
import { Role } from '../models/Role';
import { RoleGroup } from '../models/RoleGroup';
import { logger } from '../config/logger';

/**
 * Create default system role group and roles if they don't exist
 */
export async function seedDefaultRoles(): Promise<void> {
  try {
    // Create System group first (without requiresOne initially)
    let systemGroup = await RoleGroup.findOne({ name: 'system' });
    if (!systemGroup) {
      systemGroup = new RoleGroup({
        name: 'system',
        displayName: 'System',
        description: 'System roles that all users must have',
        requiresOne: false, // Will be set to true after roles are created
        isSystemGroup: true,
      });
      await systemGroup.save();
      logger.info('Created System role group', { groupName: 'system' });
    }

    // Create default roles
    const defaultRoles = [
      {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access to all features and settings',
        permissions: [], // Permissions can be assigned later via admin panel
      },
      {
        name: 'user',
        displayName: 'User',
        description: 'Basic user permissions',
        permissions: [], // Permissions can be assigned later via admin panel
      },
      {
        name: 'developer',
        displayName: 'Developer',
        description: 'Development access (dev environment only)',
        permissions: [], // Permissions can be assigned later via admin panel
      },
    ];

    const createdRoles: { name: string; id: mongoose.Types.ObjectId }[] = [];

    for (const roleData of defaultRoles) {
      let existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        const role = new Role({
          ...roleData,
          group: systemGroup._id,
        });
        await role.save();
        createdRoles.push({ name: roleData.name, id: role._id as mongoose.Types.ObjectId });
        logger.info(`Created default role: ${roleData.name}`, { roleName: roleData.name });
      } else {
        // Update existing role to belong to System group if it doesn't
        if (!existingRole.group || existingRole.group.toString() !== (systemGroup._id as { toString: () => string }).toString()) {
          existingRole.group = systemGroup._id as mongoose.Types.ObjectId;
          await existingRole.save();
        }
        createdRoles.push({ name: roleData.name, id: existingRole._id as mongoose.Types.ObjectId });
      }
    }

    // Set requiresOne to true and default role to "user"
    const userRole = await Role.findOne({ name: 'user' });
    if (userRole) {
      systemGroup.requiresOne = true;
      systemGroup.defaultRoleId = userRole._id as mongoose.Types.ObjectId;
      await systemGroup.save();
      logger.info('Set requiresOne to true and default role to "user" for System group');
    }

    logger.info('Default roles seeded successfully');
  } catch (error) {
    logger.error('Failed to seed default roles', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - allow server to start even if seeding fails
  }
}

