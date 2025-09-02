/**
 * Test User Management Utilities
 *
 * Handles creation, management, and cleanup of test users
 */
import { logger } from "../../utils/logging";

export interface TestUser {
  email: string;
  password: string;
  id?: string;
  createdAt?: string;
}

/**
 * Creates a unique test user with timestamp-based email
 */
export function createTestUser(): TestUser {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return {
    email: `test-user-${timestamp}-${randomSuffix}@workout-test.com`,
    password: 'TestPassword123!',
    createdAt: new Date().toISOString()
  };
}

/**
 * Creates multiple test users for batch testing
 */
export function createTestUsers(count: number): TestUser[] {
  return Array.from({ length: count }, () => createTestUser());
}

/**
 * Validates test user data
 */
export function validateTestUser(user: TestUser): boolean {
  if (!user.email || !user.password) {
    return false;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    return false;
  }
  
  // Password strength validation
  if (user.password.length < 8) {
    return false;
  }
  
  if (!/[A-Z]/.test(user.password)) {
    return false;
  }
  
  if (!/[a-z]/.test(user.password)) {
    return false;
  }
  
  if (!/[0-9]/.test(user.password)) {
    return false;
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(user.password)) {
    return false;
  }
  
  return true;
}

/**
 * Generates test user with specific email pattern
 */
export function createTestUserWithEmail(emailPattern: string): TestUser {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  
  return {
    email: emailPattern.replace('{timestamp}', timestamp.toString()).replace('{random}', randomSuffix),
    password: 'TestPassword123!',
    createdAt: new Date().toISOString()
  };
}

/**
 * Logs test user information
 */
export function logTestUser(user: TestUser, action: string = 'Created'): void {
  logger.debug(`🔐 ${action} Test User:`);
  logger.debug(`   Email: ${user.email}`);
  logger.debug(`   Password: ${user.password}`);
  if (user.id) {
    logger.debug(`   ID: ${user.id}`);
  }
  if (user.createdAt) {
    logger.debug(`   Created: ${user.createdAt}`);
  }
  logger.debug('');
}
