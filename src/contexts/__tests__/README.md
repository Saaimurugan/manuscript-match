# AuthContext Integration Tests

## Overview

This directory contains comprehensive integration tests for the AuthContext that cover the complete authentication flow with various invalid token scenarios, error recovery mechanisms, token refresh behavior, and logging functionality.

## Test Files

### AuthContext.integration.test.tsx
Main integration test file covering:

#### Invalid Token Scenarios (Requirements 1.1, 1.2, 2.1, 2.2)
- **Malformed JWT tokens**: Tests handling of tokens with invalid format
- **Base64 decode errors**: Tests handling of tokens with corrupted base64 encoding
- **Expired tokens**: Tests detection and handling of expired tokens with refresh attempts
- **Invalid JSON payload**: Tests handling of tokens with malformed JSON content

#### Error Recovery Mechanisms (Requirements 1.3, 4.3, 4.4)
- **Automatic recovery**: Tests automatic recovery for expired tokens through refresh
- **Infinite loop prevention**: Tests that retry loops are prevented after max attempts
- **Recovery cooldown**: Tests that recovery attempts respect cooldown periods
- **Token cleanup**: Tests automatic cleanup of invalid tokens

#### Token Refresh Behavior (Requirements 3.1, 3.2, 3.3, 3.4)
- **Refresh validation**: Tests that refreshed tokens are validated before acceptance
- **Service failures**: Tests handling of refresh service failures
- **Simultaneous attempts**: Tests prevention of multiple simultaneous refresh attempts
- **Scheduled refresh**: Tests automatic token refresh before expiration

#### Logging Functionality (Requirements 4.1, 4.2)
- **Validation failures**: Tests logging of token validation failures with context
- **Authentication events**: Tests logging of login/logout events with metadata
- **Error patterns**: Tests logging for error pattern monitoring
- **Refresh attempts**: Tests logging of token refresh attempts and results

#### End-to-End Authentication Flow
- **Complete flow**: Tests full login-to-logout flow with token validation
- **Token expiration**: Tests handling of token expiration during active session
- **Network errors**: Tests handling of network errors during authentication
- **State persistence**: Tests authentication state maintenance across re-renders

### AuthContext.comprehensive.integration.test.tsx
Extended comprehensive test file with additional edge cases and detailed scenarios.

## Requirements Coverage

### Requirement 1: Invalid Token Handling
- **1.1**: ✅ Token format validation before decoding
- **1.2**: ✅ Clear invalid tokens and redirect to login
- **1.3**: ✅ Log errors and initiate logout process
- **1.4**: ✅ Prevent infinite retry loops

### Requirement 2: JWT Token Validation Utilities
- **2.1**: ✅ Check proper format (three parts separated by dots)
- **2.2**: ✅ Verify base64 encoding before decoding
- **2.3**: ✅ Return specific error types for different failure modes
- **2.4**: ✅ Distinguish between expired and malformed tokens

### Requirement 3: Token Refresh Management
- **3.1**: ✅ Validate token format before refresh attempts
- **3.2**: ✅ Prevent multiple simultaneous refresh attempts
- **3.3**: ✅ Clear authentication state on refresh failure
- **3.4**: ✅ Attempt refresh only once per expiration window

### Requirement 4: Authentication Error Logging
- **4.1**: ✅ Log specific failure reasons for token validation
- **4.2**: ✅ Include relevant context in error logs
- **4.3**: ✅ Log token refresh failures with error details
- **4.4**: ✅ Log logout events triggered by token errors

## Test Scenarios Covered

### Invalid Token Scenarios
1. Malformed JWT tokens (wrong format)
2. Base64 decode errors (corrupted encoding)
3. Expired tokens (past expiration time)
4. Invalid JSON payload (malformed content)
5. Missing token parts (incomplete JWT structure)

### Error Recovery Scenarios
1. Automatic recovery for expired tokens
2. Recovery failure handling
3. Infinite loop prevention
4. Recovery cooldown enforcement
5. Token cleanup on validation failure

### Token Refresh Scenarios
1. Successful token refresh
2. Refresh service failures
3. Invalid refreshed token handling
4. Multiple simultaneous refresh prevention
5. Scheduled automatic refresh

### Logging Scenarios
1. Token validation failure logging
2. Authentication event logging
3. Error pattern tracking
4. Recovery attempt logging
5. Session lifecycle logging

## Running the Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test src/contexts/__tests__/AuthContext.integration.test.tsx

# Run with coverage
npm run test:coverage
```

## Test Environment

The tests use:
- **Vitest** as the test runner
- **@testing-library/react** for component testing
- **jsdom** environment for DOM simulation
- **MSW** for API mocking (in integration setup)
- **vi.mock()** for module mocking

## Mock Strategy

The tests mock:
- `jwtValidator` - For token validation behavior
- `authService` - For authentication API calls
- `authLogger` - For logging verification
- `tokenRefreshManager` - For refresh management (implicitly through AuthContext)

## Assertions

Tests verify:
- Component state changes
- Error handling behavior
- Recovery mechanism execution
- Logging function calls
- Service method invocations
- Token state management

## Coverage

The integration tests provide comprehensive coverage of:
- All authentication error scenarios
- Token validation edge cases
- Error recovery mechanisms
- Logging functionality
- Complete authentication flows
- Network error handling
- State management across component lifecycle