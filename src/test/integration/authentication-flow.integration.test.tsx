/**
 * Integration tests for the complete authentication flow
 * Tests login, token management, protected routes, and logout
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, createMockUser } from '../utils';
import { LoginForm } from '../../components/auth/LoginForm';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { UserProfile } from '../../components/auth/UserProfile';
import { authService } from '../../services/authService';
import { server, mockAuthResponse } from '../integration-setup';
import { http, HttpResponse } from 'msw';

// Test component that requires authentication
const ProtectedComponent: React.FC = () => (
  <div>Protected Content</div>
);

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should complete full login workflow', async () => {
      const onLogin = vi.fn();

      render(<LoginForm onLogin={onLogin} />);

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for login to complete
      await waitFor(() => {
        expect(onLogin).toHaveBeenCalled();
      });

      // Verify token is stored
      expect(localStorage.getItem('scholarfinder_token')).toBe('mock-jwt-token');
    });

    it('should handle login failure gracefully', async () => {
      // Mock login failure
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json(
            { type: 'AUTHENTICATION_ERROR', message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      render(<LoginForm />);

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'wrongpassword' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Verify no token is stored
      expect(localStorage.getItem('scholarfinder_token')).toBeNull();
    });

    it('should show loading state during login', async () => {
      // Mock delayed response
      server.use(
        http.post('/api/auth/login', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(mockAuthResponse);
        })
      );

      render(<LoginForm />);

      // Fill in login form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Check loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
      expect(screen.getByLabelText(/password/i)).toBeDisabled();

      // Wait for login to complete
      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when not authenticated', async () => {
      render(
        <ProtectedRoute>
          <ProtectedComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show protected content when authenticated', async () => {
      // Set up authenticated state
      localStorage.setItem('scholarfinder_token', 'valid-token');

      render(
        <ProtectedRoute>
          <ProtectedComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(screen.queryByText(/sign in to your account/i)).not.toBeInTheDocument();
    });

    it('should handle role-based access control', async () => {
      // Set up authenticated state with USER role
      localStorage.setItem('scholarfinder_token', 'valid-token');

      render(
        <ProtectedRoute requiredRole="ADMIN">
          <ProtectedComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Token Management', () => {
    it('should handle token expiration', async () => {
      // Mock expired token verification
      server.use(
        http.get('/api/auth/verify', () => {
          return HttpResponse.json(
            { type: 'AUTHENTICATION_ERROR', message: 'Token expired' },
            { status: 401 }
          );
        })
      );

      // Set expired token
      localStorage.setItem('scholarfinder_token', 'expired-token');

      render(
        <ProtectedRoute>
          <ProtectedComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
      });

      // Verify token was cleared
      expect(localStorage.getItem('scholarfinder_token')).toBeNull();
    });

    it('should handle network errors during token verification', async () => {
      // Mock network error
      server.use(
        http.get('/api/auth/verify', () => {
          return HttpResponse.error();
        })
      );

      localStorage.setItem('scholarfinder_token', 'valid-token');

      render(
        <ProtectedRoute>
          <ProtectedComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Profile Management', () => {
    it('should load and display user profile', async () => {
      localStorage.setItem('scholarfinder_token', 'valid-token');

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('USER')).toBeInTheDocument();
    });

    it('should handle profile loading errors', async () => {
      server.use(
        http.get('/api/auth/profile', () => {
          return HttpResponse.json(
            { type: 'SERVER_ERROR', message: 'Failed to load profile' },
            { status: 500 }
          );
        })
      );

      localStorage.setItem('scholarfinder_token', 'valid-token');

      render(<UserProfile />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    it('should complete full logout workflow', async () => {
      localStorage.setItem('scholarfinder_token', 'valid-token');

      const TestComponent: React.FC = () => {
        const handleLogout = async () => {
          await authService.logout();
        };

        return (
          <div>
            <div>Authenticated Content</div>
            <button onClick={handleLogout}>Logout</button>
          </div>
        );
      };

      render(<TestComponent />);

      // Click logout
      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(localStorage.getItem('scholarfinder_token')).toBeNull();
      });
    });

    it('should clear token even if logout API fails', async () => {
      server.use(
        http.post('/api/auth/logout', () => {
          return HttpResponse.error();
        })
      );

      localStorage.setItem('scholarfinder_token', 'valid-token');

      await authService.logout();

      expect(localStorage.getItem('scholarfinder_token')).toBeNull();
    });
  });

  describe('Password Change', () => {
    it('should handle password change successfully', async () => {
      localStorage.setItem('scholarfinder_token', 'valid-token');

      const result = await authService.changePassword({
        oldPassword: 'oldpass',
        newPassword: 'newpass'
      });

      expect(result).toBeDefined();
    });

    it('should handle password change errors', async () => {
      server.use(
        http.post('/api/auth/change-password', () => {
          return HttpResponse.json(
            { type: 'VALIDATION_ERROR', message: 'Current password is incorrect' },
            { status: 400 }
          );
        })
      );

      localStorage.setItem('scholarfinder_token', 'valid-token');

      await expect(
        authService.changePassword({
          oldPassword: 'wrongpass',
          newPassword: 'newpass'
        })
      ).rejects.toThrow();
    });
  });
});