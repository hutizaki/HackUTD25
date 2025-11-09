/**
 * Mock MongoDB connection for testing without MongoDB
 * Uses in-memory storage
 */

import { logger } from '../config/logger';

// In-memory storage
export const mockDB = {
  users: [] as any[],
  projects: [] as any[],
  tickets: [] as any[],
  runs: [] as any[],
  agentRuns: [] as any[],
  agents: [] as any[],
  sessions: [] as any[],
};

/**
 * Mock connect function
 */
export async function connectDB(): Promise<void> {
  logger.info('Using mock in-memory database (MongoDB not available)');
  
  // Seed default admin user
  mockDB.users.push({
    _id: 'mock-user-1',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$10$YourHashedPasswordHere', // Mock hash
    roles: ['user'],
    created_at: new Date(),
    updated_at: new Date(),
  });
  
  logger.info('Mock database initialized with test user');
}

/**
 * Mock disconnect function
 */
export async function disconnectDB(): Promise<void> {
  logger.info('Mock database disconnected');
}
