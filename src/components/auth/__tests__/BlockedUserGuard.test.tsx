/**
 * Tests for BlockedUserGuard component and user blocking enforcement
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlockedUserGuard } from '../BlockedUserGuard';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  authService: {
    getCurrentToken: vi.fn(),
    verifyToken: vi.fn(),
    getProfile: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

// Mock the auth context
const mockAuthContext = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null,
  tokenState: {
    token: null,
    isValid: false,
    expiresAt: null,
    lastValidated: null,
    validationError: null,
  },
  error: null,
  authError: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  clearError: vi.fn(),
  recoverFromError: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
};

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => mockAuthContext,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('BlockedUserGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset mock context to default state
    Object.assign(mockAuthContext, {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      token: null,
      error: null,
      authError: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Normal Operation', () => {
    it('should render children when user is not blocked', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      expect(screen.getByText('Normal Content')).toBeInTheDocument();
      expect(screen.queryByText('Account Blocked')).not.toBeInTheDocument();
    });

    it('should render children when user is not authenticated', () => {
      mockAuthContext.isAuthenticated = false;

      render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Login Form</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      expect(screen.getByText('Login Form')).toBeInTheDocument();
      expect(screen.queryByText('Account Blocked')).not.toBeInTheDocument();
    });
  });

  describe('Blocked User Detection', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
    });

    it('should show blocked notification when auth error indicates blocked user', async () => {
      mockAuthContext.authError = {
        type: 'AUTHORIZATION_ERROR',
        message: 'Account has been blocked. Please contact an administrator.',
        timestamp: new Date(),
        shouldRetry: false,
        retryCount: 0,
        maxRetries: 0,
        recoveryAction: 'LOGOUT',
      };

      render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(screen.getByText(/Your account has been temporarily blocked/)).toBeInTheDocument();
      expect(screen.getByText('Contact Support')).toBeInTheDocument();
      expect(screen.queryByText('Normal Content')).not.toBeInTheDocument();
    });

    it('should not show blocked notification for other auth errors', () => {
      mockAuthContext.authError = {
        type: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        timestamp: new Date(),
        shouldRetry: true,
        retryCount: 1,
        maxRetries: 3,
        recoveryAction: 'REFRESH',
      };

      render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      expect(screen.getByText('Normal Content')).toBeInTheDocument();
      expect(screen.queryByText('Account Blocked')).not.toBeInTheDocument();
    });
  });

  describe('Auto-logout Functionality', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
    });

    it('should automatically logout blocked user after delay', async () => {
      mockAuthContext.authError = {
        type: 'AUTHORIZATION_ERROR',
        message: 'Account has been blocked. Please contact an administrator.',
        timestamp: new Date(),
        shouldRetry: false,
        retryCount: 0,
        maxRetries: 0,
        recoveryAction: 'LOGOUT',
      };

      render(
        <TestWrapper>
          <BlockedUserGuard autoLogoutDelay={5000}>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-logout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
      });
    });

    it('should show auto-logout warning in notification', async () => {
      mockAuthContext.authError = {
        type: 'AUTHORIZATION_ERROR',
        message: 'Account has been blocked. Please contact an administrator.',
        timestamp: new Date(),
        shouldRetry: false,
        retryCount: 0,
        maxRetries: 0,
        recoveryAction: 'LOGOUT',
      };

      render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(screen.getByText(/You will be automatically logged out in 30 seconds/)).toBeInTheDocument();
    });
  });

  describe('Support Contact', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      mockAuthContext.authError = {
        type: 'AUTHORIZATION_ERROR',
        message: 'Account has been blocked. Please contact an administrator.',
        timestamp: new Date(),
        shouldRetry: false,
        retryCount: 0,
        maxRetries: 0,
        recoveryAction: 'LOGOUT',
      };
    });

    it('should display custom support email', async () => {
      render(
        <TestWrapper>
          <BlockedUserGuard supportEmail="help@company.com">
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(screen.getByText('help@company.com')).toBeInTheDocument();
    });

    it('should display support phone when provided', async () => {
      render(
        <TestWrapper>
          <BlockedUserGuard 
            supportEmail="help@company.com" 
            supportPhone="+1-555-123-4567"
          >
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(screen.getByText('+1-555-123-4567')).toBeInTheDocument();
      expect(screen.getByText(/Call Support:/)).toBeInTheDocument();
    });

    it('should call onUserBlocked callback when user is blocked', async () => {
      const onUserBlocked = vi.fn();

      render(
        <TestWrapper>
          <BlockedUserGuard onUserBlocked={onUserBlocked}>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(onUserBlocked).toHaveBeenCalledWith(
        expect.objectContaining({
          isBlocked: true,
          blockReason: 'Account has been blocked. Please contact an administrator.',
          showNotification: true,
        })
      );
    });
  });

  describe('Integration with Auth Context', () => {
    it('should handle auth context state changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      expect(screen.getByText('Normal Content')).toBeInTheDocument();

      // Simulate user getting blocked
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
      mockAuthContext.authError = {
        type: 'AUTHORIZATION_ERROR',
        message: 'Account has been blocked. Please contact an administrator.',
        timestamp: new Date(),
        shouldRetry: false,
        retryCount: 0,
        maxRetries: 0,
        recoveryAction: 'LOGOUT',
      };

      rerender(
        <TestWrapper>
          <BlockedUserGuard>
            <div>Normal Content</div>
          </BlockedUserGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      });

      expect(screen.queryByText('Normal Content')).not.toBeInTheDocument();
    });
  });
});