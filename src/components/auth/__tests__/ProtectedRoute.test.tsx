/**
 * Tests for ProtectedRoute component with enhanced role support
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute, AdminRoute, ManagerRoute, QCRoute, StaffRoute } from '../ProtectedRoute';
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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Loading State', () => {
    it('should show loading spinner when authentication is loading', () => {
      mockAuthContext.isLoading = true;

      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated Access', () => {
    it('should show login form when user is not authenticated', () => {
      mockAuthContext.isAuthenticated = false;

      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should show login form (mocked)
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom fallback when provided', () => {
      mockAuthContext.isAuthenticated = false;

      render(
        <TestWrapper>
          <ProtectedRoute fallback={<div>Custom Login</div>}>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Custom Login')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Access', () => {
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

    it('should render children when user is authenticated and no role required', () => {
      render(
        <TestWrapper>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children when user has exact required role', () => {
      mockAuthContext.user!.role = 'ADMIN';

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('should deny access when user lacks required role', () => {
      mockAuthContext.user!.role = 'USER';

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required role: ADMIN, Your role: USER/)).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Role Hierarchy', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'MANAGER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
    });

    it('should allow access when user has higher role than required', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requireRoleOrHigher="QC">
            <div>QC Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('QC Content')).toBeInTheDocument();
    });

    it('should allow access when user has exact role required', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requireRoleOrHigher="MANAGER">
            <div>Manager Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Manager Content')).toBeInTheDocument();
    });

    it('should deny access when user has lower role than required', () => {
      mockAuthContext.user!.role = 'USER';

      render(
        <TestWrapper>
          <ProtectedRoute requireRoleOrHigher="QC">
            <div>QC Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required role: QC or higher, Your role: USER/)).toBeInTheDocument();
    });
  });

  describe('Multiple Roles', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'QC',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };
    });

    it('should allow access when user has one of the required roles', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRoles={['QC', 'MANAGER', 'ADMIN']}>
            <div>Staff Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Staff Content')).toBeInTheDocument();
    });

    it('should deny access when user does not have any of the required roles', () => {
      mockAuthContext.user!.role = 'USER';

      render(
        <TestWrapper>
          <ProtectedRoute requiredRoles={['QC', 'MANAGER', 'ADMIN']}>
            <div>Staff Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/Required roles: QC, MANAGER, ADMIN, Your role: USER/)).toBeInTheDocument();
    });
  });

  describe('Convenience Components', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
    });

    it('AdminRoute should require ADMIN role', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <AdminRoute>
            <div>Admin Dashboard</div>
          </AdminRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    it('ManagerRoute should allow MANAGER and higher', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'manager@example.com',
        role: 'MANAGER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <ManagerRoute>
            <div>Manager Dashboard</div>
          </ManagerRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    });

    it('QCRoute should allow QC and higher', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'qc@example.com',
        role: 'QC',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <QCRoute>
            <div>QC Dashboard</div>
          </QCRoute>
        </TestWrapper>
      );

      expect(screen.getByText('QC Dashboard')).toBeInTheDocument();
    });

    it('StaffRoute should allow QC, MANAGER, and ADMIN', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'qc@example.com',
        role: 'QC',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <StaffRoute>
            <div>Staff Dashboard</div>
          </StaffRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Staff Dashboard')).toBeInTheDocument();
    });

    it('StaffRoute should deny access to regular users', () => {
      mockAuthContext.user = {
        id: '1',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
      };

      render(
        <TestWrapper>
          <StaffRoute>
            <div>Staff Dashboard</div>
          </StaffRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Staff Dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Access Denied UI', () => {
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

    it('should show access denied with proper styling and information', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText(/You don't have permission to access this page/)).toBeInTheDocument();
      expect(screen.getByText(/Required role: ADMIN, Your role: USER/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    });

    it('should not show access denied when showAccessDenied is false', () => {
      render(
        <TestWrapper>
          <ProtectedRoute requiredRole="ADMIN" showAccessDenied={false}>
            <div>Admin Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });
});