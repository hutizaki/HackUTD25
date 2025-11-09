import mongoose from 'mongoose';
import { connectToDatabase } from '../db/connect';
import { User } from '../models/User';
import { Permission } from '../models/Permission';
import { logger } from '../config/logger';

/**
 * Test script to verify permission assignment and checking logic
 */
async function testPermissions(): Promise<void> {
  try {
    logger.info('Connecting to database...');
    await connectToDatabase();
    logger.info('Connected to database');

    // Find the edit-name permission
    const editNamePermission = await Permission.findOne({ name: 'edit-name' });
    if (!editNamePermission) {
      logger.error('edit-name permission not found');
      return;
    }
    logger.info('Found edit-name permission', { permissionId: (editNamePermission._id as mongoose.Types.ObjectId).toString() });

    // Find a test user
    const testUser = await User.findOne({ email: 'test2@example.com' });
    if (!testUser) {
      logger.error('Test user not found');
      return;
    }
    logger.info('Found test user', { userId: (testUser._id as mongoose.Types.ObjectId).toString(), email: testUser.email });

    // Check current permissions
    logger.info('Current user permissions (before assignment):', {
      permissions: testUser.permissions.map((p) => p.toString()),
      permissionsCount: testUser.permissions.length,
    });

    // Assign the permission
    const permissionId = editNamePermission._id as mongoose.Types.ObjectId;
    if (!testUser.permissions.some((p) => p.toString() === permissionId.toString())) {
      testUser.permissions.push(permissionId);
      await testUser.save();
      logger.info('Assigned permission to user', { permissionId: permissionId.toString() });
    } else {
      logger.info('Permission already assigned to user');
    }

    // Reload user to verify
    const updatedUser = await User.findById(testUser._id).populate('permissions');
    logger.info('Updated user permissions:', {
      permissions: updatedUser?.permissions.map((p) => {
        if (p && typeof p === 'object' && '_id' in p) {
          return (p._id as { toString: () => string }).toString();
        }
        return (p as mongoose.Types.ObjectId).toString();
      }),
      permissionsCount: updatedUser?.permissions.length,
    });

    // Test effective permissions
    if (updatedUser) {
      const effectivePermissions = await updatedUser.getEffectivePermissions();
      logger.info('Effective permissions:', {
        effectivePermissions,
        count: effectivePermissions.length,
      });

      // Test hasPermission
      const hasPermission = await updatedUser.hasPermission('account', 'write');
      logger.info('Has account:write permission:', { hasPermission });
    }

    logger.info('Test completed successfully');
  } catch (error) {
    logger.error('Test failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run the test
testPermissions()
  .then(() => {
    logger.info('Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Test script failed:', error);
    process.exit(1);
  });

