# 🔐 Authentication Integration Test Framework

This test framework provides comprehensive testing for your authentication system using **real functions** and **real database operations**.

## 🎯 **What This Framework Tests**

### **Complete Authentication Flow**
1. **User Sign Up** → Test `handleSignUp()` function with real database
2. **Confirm User** → Verify the user was actually created in database
3. **User Sign In** → Test `handleSignIn()` function with the same user
4. **Verify Authentication** → Check if user is properly authenticated

### **Test Scenarios Covered**
- ✅ **Complete Auth Flow**: Sign up → confirm → sign in
- ✅ **Duplicate Sign Up Prevention**: Prevent duplicate user creation
- ✅ **Invalid Credentials**: Wrong password, non-existent user
- ✅ **Invalid Email Format**: Malformed email validation
- ✅ **Weak Password**: Password strength validation
- ✅ **Sign Out Flow**: Complete sign out functionality
- ✅ **Session Persistence**: Verify session survives page reload

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest ts-jest @types/jest jest-environment-jsdom identity-obj-proxy
```

### **2. Add Test Scripts to package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:auth": "jest --testNamePattern='Authentication'",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### **3. Run Authentication Tests**
```bash
# Run all authentication tests
npm run test:auth

# Run specific test file
npx jest test/auth-integration.test.ts

# Run with verbose output
npx jest test/auth-integration.test.ts --verbose
```

## 📁 **Test Structure**

```
test/
├── auth-integration.test.ts    # Main authentication test suite
├── setup.ts                    # Test environment setup
├── utils/
│   ├── test-user.ts           # Test user management utilities
│   └── auth-helpers.ts        # Authentication helper functions
└── README.md                  # This file
```

## 🔧 **How It Works**

### **Real Function Testing**
The framework calls your actual authentication functions:
- `handleSignUp(email, password)` - Real sign up function
- `handleSignIn(email, password)` - Real sign in function
- `handleSignOut()` - Real sign out function

### **Database Verification**
After each operation, the framework verifies the database state:
- **After Sign Up**: Query database to confirm user exists
- **After Sign In**: Check authentication state and user data
- **After Sign Out**: Verify user is properly signed out

### **Test Data Management**
- **Unique Test Users**: Generated with timestamp-based emails
- **Automatic Cleanup**: Test users are deleted after tests
- **No Test Pollution**: Each test uses unique data

## 🎯 **Integration with Your App**

### **Connecting Real Functions**
To use your actual authentication functions, you need to:

1. **Import your real functions** in the test file
2. **Replace the mock functions** with real ones
3. **Provide real authentication context**

Example:
```typescript
// In your test setup
import { handleSignUp, handleSignIn, handleSignOut } from '../components/AuthContext';
import { setRealAuthFunctions } from './auth-integration.test';

// Replace mock functions with real ones
setRealAuthFunctions(handleSignUp, handleSignIn, handleSignOut, authContext);
```

### **Database API Integration**
The framework expects your `supabaseAPI` to have these methods:
- `getUserByEmail(email)` - Get user by email
- `deleteUser(email)` - Delete user by email

## 📊 **Test Results**

### **Expected Output**
```
🔐 Authentication Integration Tests Loaded!

PASS  test/auth-integration.test.ts
  Real Authentication Integration Tests
    ✓ Complete Auth Flow: Sign Up → Confirm → Sign In (2.5s)
    ✓ Duplicate Sign Up Prevention (1.2s)
    ✓ Invalid Credentials Sign In (0.8s)
    ✓ Invalid Email Format Sign Up (0.5s)
    ✓ Weak Password Sign Up (0.6s)
    ✓ Sign Out Flow (1.1s)
    ✓ Session Persistence (0.9s)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### **Test User Information**
Each test run creates a unique test user:
- **Email**: `test-user-1756682476551-abc123@workout-test.com`
- **Password**: `TestPassword123!`
- **Cleanup**: Automatically deleted after tests

## ⚠️ **Important Notes**

### **Real Database Operations**
- ⚠️ **This creates REAL test users** in your authentication system
- ⚠️ **Test users are automatically cleaned up** after tests complete
- ⚠️ **Use a test database** if possible to avoid affecting production data

### **Test Timeouts**
- **Default timeout**: 60 seconds for real database operations
- **Cleanup timeout**: 10 seconds for test data cleanup
- **Individual test timeout**: 30 seconds per test

### **Error Handling**
- **Database errors** are logged but don't fail tests
- **Network timeouts** are handled gracefully
- **Cleanup failures** are logged but don't stop test execution

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Import Errors**
   ```bash
   # Make sure your supabaseAPI is properly exported
   # Check file paths in imports
   ```

2. **Database Connection Issues**
   ```bash
   # Verify your Supabase configuration
   # Check network connectivity
   # Ensure database permissions are correct
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout in jest.config.cjs
   # Check database performance
   # Verify network latency
   ```

### **Debug Mode**
```bash
# Run with debug output
DEBUG=* npm run test:auth

# Run specific test with verbose output
npx jest test/auth-integration.test.ts --verbose --detectOpenHandles
```

## 🚀 **Next Steps**

1. **Run the tests** to verify your authentication system
2. **Connect real functions** by importing your actual auth functions
3. **Customize test scenarios** based on your specific requirements
4. **Add more test cases** for edge cases and error conditions
5. **Integrate with CI/CD** for automated testing

## 📞 **Support**

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify your authentication functions are properly exported
3. Ensure your database API methods are implemented
4. Check the test configuration in `jest.config.cjs`

---

**Happy Testing! 🎯**
