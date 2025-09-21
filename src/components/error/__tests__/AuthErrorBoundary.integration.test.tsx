/**
 * Integration test for AuthErrorBoundary
 * Tests the actual functionality without complex mocking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthErrorBoundary } from '../AuthErrorBoundary';

// Mock authLogger
vi.mock('@/utils/authLogger', () => ({
  authLogger: {
    logAuthError: vi.fn(),
    logAuthEvent: vi.fn(),
  },
}));

describe('AuthErrorBoundary Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be importable and instantiable', () => {
    expect(AuthErrorBoundary).toBeDefined();
    expect(typeof AuthErrorBoundary).toBe('function');
  });

  it('should have correct static methods', () => {
    expect(AuthErrorBoundary.getDerivedStateFromError).toBeDefined();
    expect(typeof AuthErrorBoundary.getDerivedStateFromError).toBe('function');
  });

  it('should categorize authentication errors correctly', () => {
    // Test token validation error
    const tokenError = new Error('Invalid token format');
    const state = AuthErrorBoundary.getDerivedStateFromError(tokenError);
    expect(state.authErrorType).toBe('TOKEN_INVALID');

    // Test token expiration error
    const expiredError = new Error('Token has expired');
    const expiredState = AuthErrorBoundary.getDerivedStateFromError(expiredError);
    expect(expiredState.authErrorType).toBe('TOKEN_EXPIRED');

    // Test decode error
    const decodeError = new Error('Failed to decode base64');
    const decodeState = AuthErrorBoundary.getDerivedStateFromError(decodeError);
    expect(decodeState.authErrorType).toBe('DECODE_ERROR');

    // Test network error
    const networkError = new Error('Network connection failed');
    const networkState = AuthErrorBoundary.getDerivedStateFromError(networkError);
    expect(networkState.authErrorType).toBe('NETWORK_ERROR');

    // Test refresh error
    const refreshError = new Error('Token refresh failed with 401');
    const refreshState = AuthErrorBoundary.getDerivedStateFromError(refreshError);
    expect(refreshState.authErrorType).toBe('REFRESH_FAILED');

    // Test malformed token error
    const malformedError = new Error('Malformed JWT token');
    const malformedState = AuthErrorBoundary.getDerivedStateFromError(malformedError);
    expect(malformedState.authErrorType).toBe('MALFORMED_TOKEN');
  });

  it('should generate unique error IDs', () => {
    const error1 = new Error('Test error 1');
    const error2 = new Error('Test error 2');
    
    const state1 = AuthErrorBoundary.getDerivedStateFromError(error1);
    const state2 = AuthErrorBoundary.getDerivedStateFromError(error2);
    
    expect(state1.errorId).toBeDefined();
    expect(state2.errorId).toBeDefined();
    expect(state1.errorId).not.toBe(state2.errorId);
    expect(state1.errorId).toMatch(/^auth_error_\d+_[a-z0-9]+$/);
    expect(state2.errorId).toMatch(/^auth_error_\d+_[a-z0-9]+$/);
  });

  it('should set hasError to true when error occurs', () => {
    const error = new Error('Test error');
    const state = AuthErrorBoundary.getDerivedStateFromError(error);
    
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);
    expect(state.showFallback).toBe(true);
  });

  it('should handle edge cases in error categorization', () => {
    // Test empty error message
    const emptyError = new Error('');
    const emptyState = AuthErrorBoundary.getDerivedStateFromError(emptyError);
    expect(emptyState.authErrorType).toBe('VALIDATION_ERROR'); // default

    // Test error with no message
    const noMessageError = new Error();
    const noMessageState = AuthErrorBoundary.getDerivedStateFromError(noMessageError);
    expect(noMessageState.authErrorType).toBe('VALIDATION_ERROR'); // default

    // Test error with mixed case message
    const mixedCaseError = new Error('INVALID TOKEN FORMAT');
    const mixedCaseState = AuthErrorBoundary.getDerivedStateFromError(mixedCaseError);
    expect(mixedCaseState.authErrorType).toBe('TOKEN_INVALID');
  });

  it('should handle InvalidCharacterError specifically', () => {
    const invalidCharError = new Error('InvalidCharacterError: Failed to execute \'atob\'');
    const state = AuthErrorBoundary.getDerivedStateFromError(invalidCharError);
    expect(state.authErrorType).toBe('DECODE_ERROR');
  });

  it('should handle JWT validation errors from jwtValidator', () => {
    const jwtValidatorError = new Error('Error in jwtValidator.safeDecodeToken');
    const state = AuthErrorBoundary.getDerivedStateFromError(jwtValidatorError);
    expect(state.authErrorType).toBe('TOKEN_INVALID');
  });

  it('should handle various token format errors', () => {
    const formatErrors = [
      'JWT token must have 3 parts',
      'Invalid token structure',
      'Token format validation failed',
      'Malformed token header',
    ];

    formatErrors.forEach(errorMessage => {
      const error = new Error(errorMessage);
      const state = AuthErrorBoundary.getDerivedStateFromError(error);
      expect(state.authErrorType).toBe('TOKEN_INVALID');
    });
  });

  it('should handle various expiration errors', () => {
    const expirationErrors = [
      'Token has expired',
      'JWT expired at 2023-01-01',
      'exp claim validation failed',
      'Token expiration check failed',
    ];

    expirationErrors.forEach(errorMessage => {
      const error = new Error(errorMessage);
      const state = AuthErrorBoundary.getDerivedStateFromError(error);
      expect(state.authErrorType).toBe('TOKEN_EXPIRED');
    });
  });

  it('should handle various network errors', () => {
    const networkErrors = [
      'Network request failed',
      'Connection timeout',
      'Failed to fetch',
      'Network connection lost',
    ];

    networkErrors.forEach(errorMessage => {
      const error = new Error(errorMessage);
      const state = AuthErrorBoundary.getDerivedStateFromError(error);
      expect(state.authErrorType).toBe('NETWORK_ERROR');
    });
  });
});