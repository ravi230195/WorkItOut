/**
 * Jest Test Setup
 * 
 * Configures the test environment for authentication tests
 */

import '@testing-library/jest-dom';

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock as Storage;

// Suppress console logs during tests (uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
(global as any).testUtils = {
  // Wait for a condition to be true
  waitForCondition: (condition: () => boolean, timeout = 5000) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkCondition = () => {
        if (condition()) {
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkCondition, 100);
      };
      
      checkCondition();
    });
  },
  
  // Generate test data
  generateTestData: (type: string, count: number = 1) => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const timestamp = Date.now() + i;
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      
      switch (type) {
        case 'email':
          data.push(`test-${timestamp}-${randomSuffix}@workout-test.com`);
          break;
        case 'password':
          data.push(`TestPassword${timestamp}!`);
          break;
        case 'routine':
          data.push(`Test Routine ${timestamp}`);
          break;
        default:
          data.push(`test-${timestamp}-${randomSuffix}`);
      }
    }
    
    return count === 1 ? data[0] : data;
  },
  
  // Mock authentication context
  createMockAuthContext: (user: any = null, token: string | null = null) => ({
    user,
    token,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    loading: false,
  }),
  
  // Mock workout context
  createMockWorkoutContext: () => ({
    routines: [],
    currentRoutine: null,
    loading: false,
    createRoutine: jest.fn(),
    updateRoutine: jest.fn(),
    deleteRoutine: jest.fn(),
  }),
};

console.log('🧪 Test environment configured successfully!');
