import mongoose from 'mongoose';
import { getMongoUri } from '../config/env';
import { logger } from '../config/logger';

/**
 * Connects to MongoDB using the configured URI
 * @throws Error if connection fails
 */
export async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = getMongoUri();

    await mongoose.connect(mongoUri);

    logger.info('Connected to MongoDB');

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

/**
 * Disconnects from MongoDB
 */
export async function disconnectFromDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
    throw error;
  }
}

