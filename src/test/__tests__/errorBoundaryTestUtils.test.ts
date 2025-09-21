/**
 * Test suite for Error Boundary Test Utilities
 * 
 * Verifies that our error boundary testing utilities work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ErrorSimulator, 
  ErrorBoundaryTestHelpers,
  ErrorType 
} from '../errorBoundaryTestUtils';

describe('ErrorBoundaryTestUtils', () => {
  describe('ErrorSimulator', () => {
    it('should create syntax errors correctly', () => {
      const error = ErrorSimulator.createSyntaxError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SyntaxError');
      expect(error.message).toContain('Unexpected token');
      expect(error.stack).toContain('SyntaxError');
    });

    it('should create network errors correctly', () => {
      const error = ErrorSimulator.createNetworkError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toContain('Failed to fetch');
      expect(error.stack).toContain('NetworkError');
    });

    it('should create system errors correctly', () => {
      const error = ErrorSimulator.createSystemError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('QuotaExceededError');
      expect(error.message).toContain('Memory quota exceeded');
      expect(error.stack).toContain('QuotaExceededError');
    });

    it('should create user errors correctly', () => {
      const error = ErrorSimulator.createUserError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toContain('Invalid input format');
      expect(error.stack).toContain('ValidationError');
    });

    it('should create runtime errors correctly', () => {
      const error = ErrorSimulator.createRuntimeError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TypeError');
      expect(error.message).toContain('Cannot read properties');
      expect(error.stack).toContain('TypeError');
    });

    it('should create errors with custom messages', () => {
      const customMessage = 'Custom error message';
      const error = ErrorSimulator.createRuntimeError(customMessage);
      
      expect(error.message).toBe(customMessage);
    });

    it('should create errors based on configuration', () => {
      const config = {
        type: 'network' as ErrorType,
        message: 'Custom network error',
      };
      
      const error = ErrorSimulator.createError(config);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Custom network error');
    });
  });

  describe('ErrorBoundaryTestHelpers', () => {
    let mockEnv: ReturnType<typeof ErrorBoundaryTestHelpers.createMockEnvironment>;

    beforeEach(() => {
      mockEnv = ErrorBoundaryTestHelpers.createMockEnvironment();
    });

    afterEach(() => {
      mockEnv.cleanup();
    });

    it('should create mock environment correctly', () => {
      expect(mockEnv.consoleError).toBeDefined();
      expect(mockEnv.localStorage).toBeDefined();
      expect(mockEnv.sessionStorage).toBeDefined();
      expect(mockEnv.fetch).toBeDefined();
      expect(mockEnv.location).toBeDefined();
      expect(mockEnv.history).toBeDefined();
      expect(mockEnv.windowOpen).toBeDefined();
      expect(mockEnv.cleanup).toBeDefined();
    });

    it('should mock localStorage correctly', () => {
      const localStorage = ErrorBoundaryTestHelpers.mockLocalStorage();
      
      localStorage.setItem('test-key', 'test-value');
      expect(localStorage.getItem('test-key')).toBe('test-value');
      
      localStorage.removeItem('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
      
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.clear();
      expect(localStorage.store).toEqual({});
    });

    it('should mock sessionStorage correctly', () => {
      const sessionStorage = ErrorBoundaryTestHelpers.mockSessionStorage();
      
      sessionStorage.setItem('session-key', 'session-value');
      expect(sessionStorage.getItem('session-key')).toBe('session-value');
      
      sessionStorage.removeItem('session-key');
      expect(sessionStorage.getItem('session-key')).toBeNull();
    });

    it('should mock console.error correctly', () => {
      const mockConsoleError = ErrorBoundaryTestHelpers.mockConsoleError();
      
      console.error('test error');
      expect(mockConsoleError).toHaveBeenCalledWith('test error');
      
      mockConsoleError.restore();
    });

    it('should mock fetch correctly', () => {
      const mockFetch = ErrorBoundaryTestHelpers.mockFetch();
      
      expect(global.fetch).toBe(mockFetch);
      expect(mockFetch).toBeDefined();
    });

    it('should mock window.location correctly', () => {
      const mockLocation = ErrorBoundaryTestHelpers.mockWindowLocation();
      
      expect(window.location).toBe(mockLocation);
      expect(mockLocation.href).toBe('http://localhost:3000');
      expect(mockLocation.pathname).toBe('/');
    });

    it('should mock window.history correctly', () => {
      const mockHistory = ErrorBoundaryTestHelpers.mockWindowHistory();
      
      expect(window.history).toBe(mockHistory);
      expect(mockHistory.pushState).toBeDefined();
      expect(mockHistory.replaceState).toBeDefined();
    });

    it('should mock window.open correctly', () => {
      const mockOpen = ErrorBoundaryTestHelpers.mockWindowOpen();
      
      expect(window.open).toBe(mockOpen);
    });
  });
});