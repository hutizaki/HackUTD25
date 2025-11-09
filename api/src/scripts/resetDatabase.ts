import mongoose from 'mongoose';
import { connectToDatabase, disconnectFromDatabase } from '../db/connect';
import { seedDefaultRoles } from '../utils/roleSeed';
import { seedDefaultPermissions } from '../utils/permissionSeed';
import { FeatureFlag } from '../models/FeatureFlag';
import { logger } from '../config/logger';

/**
 * Seed default feature flags
 */
async function seedDefaultFeatureFlags(): Promise<void> {
  try {
    const defaultFeatureFlags = [
      {
        name: 'dark-mode-toggle',
        description: 'Enable dark mode toggle functionality for users',
        enabled: false,
      },
    ];

    for (const flagData of defaultFeatureFlags) {
      const existingFlag = await FeatureFlag.findOne({ name: flagData.name });
      if (!existingFlag) {
        const featureFlag = new FeatureFlag({
          name: flagData.name.toLowerCase(),
          description: flagData.description,
          enabled: flagData.enabled,
        });
        await featureFlag.save();
        logger.info(`Created default feature flag: ${flagData.name}`, { flagName: flagData.name });
      } else {
        logger.info(`Feature flag already exists: ${flagData.name}`, { flagName: flagData.name });
      }
    }

    logger.info('Default feature flags seeded successfully');
  } catch (error) {
    logger.error('Failed to seed default feature flags', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Reset the database by dropping all collections and re-seeding default data
 */
async function resetDatabase(): Promise<void> {
  try {
    logger.info('Starting database reset...');

    // Connect to database
    await connectToDatabase();

    // Get the database name from the connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    logger.info(`Found ${collectionNames.length} collections to drop`, { collections: collectionNames });

    // Drop all collections
    for (const collectionName of collectionNames) {
      try {
        await db.collection(collectionName).drop();
        logger.info(`Dropped collection: ${collectionName}`);
      } catch (error) {
        // Ignore errors for collections that don't exist or are already dropped
        if (error instanceof Error && !error.message.includes('ns not found')) {
          logger.warn(`Failed to drop collection ${collectionName}:`, error.message);
        }
      }
    }

    logger.info('All collections dropped successfully');

    // Seed default data
    logger.info('Seeding default data...');

    // Seed default roles (System group and roles)
    await seedDefaultRoles();

    // Seed default permissions
    await seedDefaultPermissions();

    // Seed default feature flags
    await seedDefaultFeatureFlags();

    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Failed to reset database', {
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
  resetDatabase()
    .then(() => {
      logger.info('Database reset script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Database reset script failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}

export { resetDatabase, seedDefaultFeatureFlags };

