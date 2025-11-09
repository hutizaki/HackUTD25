import mongoose from 'mongoose';
import { Permission } from '../models/Permission';
import { logger } from '../config/logger';

/**
 * Clear all permissions and seed default permissions
 */
export async function seedDefaultPermissions(): Promise<void> {
  try {
    // Clear all existing permissions
    const deleteResult = await Permission.deleteMany({});
    logger.info(`Cleared ${deleteResult.deletedCount} existing permissions`);

    // Create default permissions
    const defaultPermissions = [
      {
        name: 'edit-name',
        description: 'Allows users to edit their name in account settings',
        resources: ['account'],
        actions: ['write'],
        category: 'Account',
      },
    ];

    const createdPermissions: { name: string; id: string }[] = [];

    for (const permissionData of defaultPermissions) {
      const permission = new Permission({
        name: permissionData.name,
        description: permissionData.description,
        resources: permissionData.resources,
        actions: permissionData.actions,
        category: permissionData.category,
      });

      await permission.save();
      createdPermissions.push({
        name: permission.name,
        id: (permission._id as mongoose.Types.ObjectId).toString(),
      });
      logger.info(`Created permission: ${permission.name}`, { permissionId: (permission._id as mongoose.Types.ObjectId).toString() });
    }

    logger.info(`Seeded ${createdPermissions.length} default permissions`, {
      permissions: createdPermissions.map((p) => p.name),
    });
  } catch (error) {
    logger.error('Failed to seed default permissions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

