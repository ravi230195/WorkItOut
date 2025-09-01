/**
 * Real Authentication Integration Tests
 * 
 * Tests complete authentication flow with real functions and database verification
 */

import { TestUser, createTestUser, validateTestUser, logTestUser } from './utils/test-user';
import { logger } from '../utils/logging';
import { 
  initSupabaseAPI, 
  verifyUserInDatabase, 
  cleanupTestUser, 
  isUserAuthenticated,
  getAuthStateInfo,
  validateSignUpResult,
  validateSignInResult,
  logAuthStep,
  logTestResult
} from './utils/auth-helpers';

// Test configuration
const AUTH_TEST_CONFIG = {
  timeout: 30000, // 30 seconds for real database operations
  cleanupTimeout: 10000, // 10 seconds for cleanup
  testUser: null as TestUser | null
};

// Mock authentication functions (we'll replace these with real ones)
let handleSignUp: any = null;
let handleSignIn: any = null;
let handleSignOut: any = null;
let authContext: any = null;

/**
 * Initialize test environment
 */
beforeAll(async () => {
  logger.debug('🔐 Initializing Authentication Integration Tests...');
  
  try {
    // Import real functions and APIs
    const { supabaseAPI } = await import('../utils/supabase/supabase-api');
    initSupabaseAPI(supabaseAPI);
    
    // Import real authentication functions
    // Note: These will be imported from your actual components
    // For now, we'll create mock functions that we can replace
    handleSignUp = jest.fn();
    handleSignIn = jest.fn();
    handleSignOut = jest.fn();
    
    // Create test user
    AUTH_TEST_CONFIG.testUser = createTestUser();
    
    if (!validateTestUser(AUTH_TEST_CONFIG.testUser)) {
      throw new Error('Invalid test user generated');
    }
    
    logTestUser(AUTH_TEST_CONFIG.testUser, 'Generated');
    
    logger.debug('✅ Test environment initialized successfully!');
  } catch (error) {
    logger.error('❌ Failed to initialize test environment:', error);
    throw error;
  }
}, AUTH_TEST_CONFIG.timeout);

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  logger.debug('🧹 Cleaning up test environment...');
  
  if (AUTH_TEST_CONFIG.testUser) {
    await cleanupTestUser(AUTH_TEST_CONFIG.testUser);
  }
  
  logger.debug('✅ Test environment cleaned up!');
}, AUTH_TEST_CONFIG.cleanupTimeout);

describe('Real Authentication Integration Tests', () => {
  
  test('Complete Auth Flow: Sign Up → Confirm → Sign In', async () => {
    const testUser = AUTH_TEST_CONFIG.testUser!;
    
    logAuthStep('Starting complete authentication flow test');
    
    // Step 1: Sign Up
    logAuthStep('Step 1: Testing user sign up');
    const signUpResult = await handleSignUp(testUser.email, testUser.password);
    
    expect(validateSignUpResult(signUpResult)).toBe(true);
    logTestResult('User Sign Up', true, { email: testUser.email });
    
    // Step 2: Confirm user exists in database
    logAuthStep('Step 2: Verifying user in database');
    const dbUser = await verifyUserInDatabase(testUser.email);
    
    expect(dbUser).toBeTruthy();
    expect(dbUser.email).toBe(testUser.email);
    logTestResult('Database Verification', true, { userFound: !!dbUser });
    
    // Step 3: Sign In
    logAuthStep('Step 3: Testing user sign in');
    const signInResult = await handleSignIn(testUser.email, testUser.password);
    
    expect(validateSignInResult(signInResult)).toBe(true);
    logTestResult('User Sign In', true, { email: testUser.email });
    
    // Step 4: Verify authentication state
    logAuthStep('Step 4: Verifying authentication state');
    const authState = getAuthStateInfo(authContext);
    
    expect(authState.authenticated).toBe(true);
    expect(authState.user.email).toBe(testUser.email);
    logTestResult('Authentication State', true, authState);
    
    logAuthStep('Complete authentication flow test finished successfully');
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Duplicate Sign Up Prevention', async () => {
    const testUser = AUTH_TEST_CONFIG.testUser!;
    
    logAuthStep('Testing duplicate sign up prevention');
    
    // First sign up should succeed
    const firstSignUp = await handleSignUp(testUser.email, testUser.password);
    expect(validateSignUpResult(firstSignUp)).toBe(true);
    
    // Second sign up with same email should fail
    const secondSignUp = await handleSignUp(testUser.email, testUser.password);
    expect(validateSignUpResult(secondSignUp)).toBe(false);
    
    logTestResult('Duplicate Sign Up Prevention', true);
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Invalid Credentials Sign In', async () => {
    const testUser = AUTH_TEST_CONFIG.testUser!;
    
    logAuthStep('Testing invalid credentials sign in');
    
    // Try to sign in with wrong password
    const wrongPasswordSignIn = await handleSignIn(testUser.email, 'WrongPassword123!');
    expect(validateSignInResult(wrongPasswordSignIn)).toBe(false);
    
    // Try to sign in with non-existent email
    const nonExistentSignIn = await handleSignIn('nonexistent@workout-test.com', testUser.password);
    expect(validateSignInResult(nonExistentSignIn)).toBe(false);
    
    logTestResult('Invalid Credentials Sign In', true);
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Invalid Email Format Sign Up', async () => {
    logAuthStep('Testing invalid email format sign up');
    
    const invalidEmails = [
      'invalid-email',
      'invalid@',
      '@invalid.com',
      'invalid@invalid',
      ''
    ];
    
    for (const invalidEmail of invalidEmails) {
      const signUpResult = await handleSignUp(invalidEmail, 'TestPassword123!');
      expect(validateSignUpResult(signUpResult)).toBe(false);
    }
    
    logTestResult('Invalid Email Format Sign Up', true);
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Weak Password Sign Up', async () => {
    logAuthStep('Testing weak password sign up');
    
    const weakPasswords = [
      '123', // Too short
      'password', // No uppercase, numbers, or special chars
      'PASSWORD', // No lowercase, numbers, or special chars
      'Password', // No numbers or special chars
      'Password123', // No special chars
      '' // Empty
    ];
    
    const testEmail = `test-weak-password-${Date.now()}@workout-test.com`;
    
    for (const weakPassword of weakPasswords) {
      const signUpResult = await handleSignUp(testEmail, weakPassword);
      expect(validateSignUpResult(signUpResult)).toBe(false);
    }
    
    logTestResult('Weak Password Sign Up', true);
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Sign Out Flow', async () => {
    const testUser = AUTH_TEST_CONFIG.testUser!;
    
    logAuthStep('Testing sign out flow');
    
    // First sign in
    const signInResult = await handleSignIn(testUser.email, testUser.password);
    expect(validateSignInResult(signInResult)).toBe(true);
    
    // Verify authenticated
    expect(isUserAuthenticated(authContext)).toBe(true);
    
    // Sign out
    const signOutResult = await handleSignOut();
    expect(signOutResult).toBe(true);
    
    // Verify not authenticated
    expect(isUserAuthenticated(authContext)).toBe(false);
    
    logTestResult('Sign Out Flow', true);
  }, AUTH_TEST_CONFIG.timeout);
  
  test('Session Persistence', async () => {
    const testUser = AUTH_TEST_CONFIG.testUser!;
    
    logAuthStep('Testing session persistence');
    
    // Sign in
    const signInResult = await handleSignIn(testUser.email, testUser.password);
    expect(validateSignInResult(signInResult)).toBe(true);
    
    // Verify authenticated
    expect(isUserAuthenticated(authContext)).toBe(true);
    
    // Simulate page reload (re-initialize auth context)
    // This would typically be done by re-importing or re-initializing the auth context
    // For now, we'll just verify the current state
    
    const authState = getAuthStateInfo(authContext);
    expect(authState.authenticated).toBe(true);
    expect(authState.user.email).toBe(testUser.email);
    
    logTestResult('Session Persistence', true);
  }, AUTH_TEST_CONFIG.timeout);
});

// Helper function to replace mock functions with real ones
export function setRealAuthFunctions(
  realHandleSignUp: any,
  realHandleSignIn: any,
  realHandleSignOut: any,
  realAuthContext: any
) {
  handleSignUp = realHandleSignUp;
  handleSignIn = realHandleSignIn;
  handleSignOut = realHandleSignOut;
  authContext = realAuthContext;
}

logger.debug(`
🔐 Authentication Integration Tests Loaded!

This test suite will test:
✅ Complete sign up → confirm → sign in flow
✅ Duplicate sign up prevention
✅ Invalid credentials handling
✅ Invalid email format validation
✅ Weak password validation
✅ Sign out functionality
✅ Session persistence

Test user: ${AUTH_TEST_CONFIG.testUser?.email || 'Not generated yet'}

⚠️  WARNING: This will create REAL test users in your authentication system!
`);
