/**
 * Authentication flow integration tests
 * Tests the complete authentication workflow including login, token management, and logout
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../contexts/AuthContext';
import { ProtectedRoute } from '../ProtectedRoute';
import { LoginForm } from '../LoginForm';
import { authService } from '../../../services/authService';
import type { AuthResponse, UserProfile } from '../../../types/api';

// Mock the auth service
jest.mock('../../../services/authService');
const mockAuthService = authService as jest.Mocked<typeof authService>;

// Mock user data
const mockUser: UserProfile = {
  id: '1',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockAuthResponse: AuthResponse = {
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser
};

// Test component that requires authentication
const ProtectedComponent: React.FC = () => (
  <div>Protected Content</div>
);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
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

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('ProtectedRoute', () => {
    it('should show login form when user is not authenticated', async () => {
      mockAuthService.verifyToken.mockResolvedValue(false);

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show protected content when user is authenticated', async () => {
      mockAuthService.verifyToken.mockResolvedValue(true);
      mockAuthService.getProfile.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(screen.queryByText('Sign in to your account')).not.toBeInTheDocument();
    });

    it('should show access denied for insufficient role', async () => {
      mockAuthService.verifyToken.mockResolvedValue(true);
      mockAuthService.getProfile.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <ProtectedRoute requiredRole="ADMIN">
            <ProtectedComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      mockAuthService.verifyToken.mockResolvedValue(false);

      const onLogin = jest.fn();

      render(
        <TestWrapper>
          <LoginForm onLogin={onLogin} />
        </TestWrapper>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      expect(onLogin).toHaveBeenCalled();
    });

    it('should handle login failure', async () => {
      const loginError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(loginError);
      mockAuthService.verifyToken.mockResolvedValue(false);

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Login Failed')).toBeInTheDocument();
      });
    });

    it('should disable form during login', async () => {
      mockAuthService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      mockAuthService.verifyToken.mockResolvedValue(false);

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      );

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Check that form is disabled during login
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();
    });
  });

  describe('Token Management', () => {
    it('should handle token expiration', async () => {
      // Mock expired token
      const expiredToken = 'expired-token';
      mockAuthService.verifyToken.mockResolvedValue(false);
      mockAuthService.getProfile.mockRejectedValue(new Error('Token expired'));

      // Set expired token in localStorage
      localStorage.setItem('scholarfinder_token', expiredToken);

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should handle token refresh', async () => {
      const newToken = 'new-jwt-token';
      mockAuthService.refreshToken.mockResolvedValue(newToken);
      mockAuthService.verifyToken.mockResolvedValue(true);
      mockAuthService.getProfile.mockResolvedValue(mockUser);

      render(
        <TestWrapper>
          <ProtectedRoute>
            <ProtectedComponent />
          </ProtectedRoute>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    it('should handle successful logout', async () => {
      mockAuthService.logout.mockResolvedValue();
      mockAuthService.verifyToken.mockResolvedValue(true);
      mockAuthService.getProfile.mockResolvedValue(mockUser);

      const TestComponent: React.FC = () => {
        const { logout } = React.useContext(require('../../../contexts/AuthContext').default)!;
        
        return (
          <div>
            <div>Authenticated Content</div>
            <button onClick={logout}>Logout</button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
      });

      // Click logout
      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
    });
  });
});