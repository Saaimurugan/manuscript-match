/**
 * Example usage of the updated authentication system
 * Demonstrates the complete authentication flow with JWT token management
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ProtectedRoute, AdminRoute } from '../components/auth';
import { LoginForm } from '../components/auth/LoginForm';
import { Button } from '../components/ui/button';

// Example protected component
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <span>Welcome, {user?.email}</span>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">User Profile</h2>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <p>ID: {user?.id}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p>✅ Authenticated</p>
          <p>🔐 JWT Token Active</p>
          <p>🔄 Auto-refresh Enabled</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Features</h2>
          <ul className="space-y-1">
            <li>✅ Real backend authentication</li>
            <li>✅ JWT token management</li>
            <li>✅ Automatic token refresh</li>
            <li>✅ Role-based access control</li>
            <li>✅ Secure logout</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Example admin component
const AdminPanel: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          🔒 This content is only visible to administrators.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          Current user role: {user?.role}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">System Management</h2>
          <p>Manage users, processes, and system settings.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Analytics</h2>
          <p>View system usage and performance metrics.</p>
        </div>
      </div>
    </div>
  );
};

// Example public component (no authentication required)
const PublicPage: React.FC = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-4">Public Page</h1>
    <p>This page is accessible without authentication.</p>
  </div>
);

// Main application example
const AuthenticationExample: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/public" element={<PublicPage />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* Admin-only routes */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                } 
              />
              
              {/* Default route - protected dashboard */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Example of manual authentication usage
const ManualAuthExample: React.FC = () => {
  const { login, logout, user, isAuthenticated, isLoading, error } = useAuth();
  const [credentials, setCredentials] = React.useState({
    email: '',
    password: ''
  });

  const handleLogin = async () => {
    try {
      await login(credentials);
      console.log('Login successful');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return <div>Loading authentication state...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Manual Login Example</h2>
        
        <div className="max-w-md space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={credentials.email}
            onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-2 border rounded"
          />
          
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
            className="w-full p-2 border rounded"
          />
          
          <Button onClick={handleLogin} className="w-full">
            Login
          </Button>
          
          {error && (
            <div className="text-red-600 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Authenticated User</h2>
      
      <div className="space-y-2 mb-4">
        <p>Email: {user?.email}</p>
        <p>Role: {user?.role}</p>
        <p>ID: {user?.id}</p>
      </div>
      
      <Button onClick={handleLogout} variant="outline">
        Logout
      </Button>
    </div>
  );
};

export default AuthenticationExample;

// Export individual examples for testing
export {
  Dashboard,
  AdminPanel,
  PublicPage,
  ManualAuthExample
};

/**
 * Key Features Implemented:
 * 
 * 1. Real Backend Authentication:
 *    - Uses actual API endpoints for login/logout
 *    - JWT token-based authentication
 *    - Secure token storage and management
 * 
 * 2. Automatic Token Management:
 *    - Automatic token refresh before expiration
 *    - Handles token expiration gracefully
 *    - Clears state on authentication failures
 * 
 * 3. Protected Routes:
 *    - ProtectedRoute component for authentication checks
 *    - AdminRoute component for role-based access
 *    - Automatic redirect to login when needed
 * 
 * 4. Context-Based State Management:
 *    - AuthContext provides global authentication state
 *    - useAuth hook for easy access to auth methods
 *    - Consistent state across the application
 * 
 * 5. Error Handling:
 *    - User-friendly error messages
 *    - Graceful handling of network issues
 *    - Proper cleanup on errors
 * 
 * 6. Security Features:
 *    - Secure token storage
 *    - Automatic logout on token expiration
 *    - Role-based access control
 *    - CSRF protection through JWT
 */