/**
 * Authentication Helper Functions
 * 
 * Handles database verification, cleanup, and authentication state checks
 */

import { TestUser } from './test-user';

// Mock supabaseAPI for now - we'll import the real one in tests
let supabaseAPI: any = null;

/**
 * Initialize the supabase API
 */
export function initSupabaseAPI(api: any): void {
  supabaseAPI = api;
}

/**
 * Verify user exists in database
 */
export async function verifyUserInDatabase(email: string): Promise<any> {
  if (!supabaseAPI) {
    throw new Error('Supabase API not initialized');
  }
  
  try {
    // Try to get user by email from database
    const { data, error } = await supabaseAPI.getUserByEmail(email);
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error verifying user in database:', error);
    return null;
  }
}

/**
 * Clean up test user from database
 */
export async function cleanupTestUser(user: TestUser): Promise<boolean> {
  if (!supabaseAPI) {
    console.warn('Supabase API not initialized, skipping cleanup');
    return false;
  }
  
  try {
    // Try to delete user from database
    const { error } = await supabaseAPI.deleteUser(user.email);
    
    if (error) {
      console.warn('Error cleaning up test user:', error);
      return false;
    }
    
    console.log(`✅ Cleaned up test user: ${user.email}`);
    return true;
  } catch (error) {
    console.warn('Error during test user cleanup:', error);
    return false;
  }
}

/**
 * Clean up multiple test users
 */
export async function cleanupTestUsers(users: TestUser[]): Promise<void> {
  console.log(`🧹 Cleaning up ${users.length} test users...`);
  
  const cleanupPromises = users.map(user => cleanupTestUser(user));
  const results = await Promise.allSettled(cleanupPromises);
  
  const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
  const failed = results.length - successful;
  
  console.log(`✅ Cleanup complete: ${successful} successful, ${failed} failed`);
}

/**
 * Check if user is authenticated
 */
export function isUserAuthenticated(authContext: any): boolean {
  return authContext && 
         authContext.user && 
         authContext.user.email && 
         authContext.token;
}

/**
 * Get authentication state info
 */
export function getAuthStateInfo(authContext: any): any {
  if (!authContext) {
    return { authenticated: false, reason: 'No auth context' };
  }
  
  if (!authContext.user) {
    return { authenticated: false, reason: 'No user in context' };
  }
  
  if (!authContext.user.email) {
    return { authenticated: false, reason: 'No email in user' };
  }
  
  if (!authContext.token) {
    return { authenticated: false, reason: 'No token in context' };
  }
  
  return {
    authenticated: true,
    user: {
      email: authContext.user.email,
      id: authContext.user.id
    },
    token: authContext.token
  };
}

/**
 * Wait for authentication state to change
 */
export function waitForAuthStateChange(
  authContext: any, 
  expectedState: boolean, 
  timeout: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkState = () => {
      const currentState = isUserAuthenticated(authContext);
      
      if (currentState === expectedState) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(false);
        return;
      }
      
      setTimeout(checkState, 100);
    };
    
    checkState();
  });
}

/**
 * Validate sign up result
 */
export function validateSignUpResult(result: any): boolean {
  return result && 
         typeof result === 'object' && 
         (result.success === true || result.user || result.id);
}

/**
 * Validate sign in result
 */
export function validateSignInResult(result: any): boolean {
  return result && 
         typeof result === 'object' && 
         (result.success === true || result.user || result.token);
}

/**
 * Log authentication test step
 */
export function logAuthStep(step: string, details?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`🔐 [${timestamp}] ${step}`);
  if (details) {
    console.log('   Details:', details);
  }
}

/**
 * Log test result
 */
export function logTestResult(testName: string, passed: boolean, details?: any): void {
  const emoji = passed ? '✅' : '❌';
  const status = passed ? 'PASSED' : 'FAILED';
  console.log(`${emoji} ${testName}: ${status}`);
  if (details) {
    console.log('   Details:', details);
  }
  console.log('');
}
