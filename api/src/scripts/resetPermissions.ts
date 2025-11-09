import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../db/connect';
import { seedDefaultPermissions } from '../utils/permissionSeed';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * Reset permissions by clearing all and seeding default permissions
 */
async function resetPermissions(): Promise<void> {
  if (env.NODE_ENV !== 'development') {
    logger.error('Permission reset script can only be run in development environment.');
    process.exit(1);
  }

  try {
    logger.info('Starting permission reset...');

    // Connect to database
    await connectToDatabase();

    // Seed default permissions (this clears existing and creates new ones)
    await seedDefaultPermissions();

    logger.info('Permission reset completed successfully');
  } catch (error) {
    logger.error('Failed to reset permissions', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    // Disconnect from database
    await disconnectFromDatabase();
  }
}

// Run the script if called directly
if (require.main === module) {
  resetPermissions()
    .then(() => {
      logger.info('Permission reset script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Permission reset script failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

export { resetPermissions };

