/**
 * Authentication context for global authentication state management
 * Provides authentication state and methods throughout the React application
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/authService';
import type { LoginCredentials, UserProfile } from '../types/api';

export interface AuthContextType {
  // Authentication state
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;

  // Profile methods
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication provider component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Computed authentication state
  const isAuthenticated = user !== null && token !== null;

  /**
   * Initialize authentication state on app load
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Set up automatic token refresh and expiration handling
   */
  useEffect(() => {
    if (!token || !isAuthenticated) {
      return;
    }

    // Check token expiration every minute
    const checkTokenExpiration = () => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const timeUntilExpiration = expirationTime - currentTime;

        // If token expires in less than 5 minutes, try to refresh
        if (timeUntilExpiration < 5 * 60 * 1000 && timeUntilExpiration > 0) {
          refreshToken().catch((error) => {
            console.error('Automatic token refresh failed:', error);
            // Force logout on refresh failure
            logout();
          });
        }
        // If token is already expired, logout immediately
        else if (timeUntilExpiration <= 0) {
          console.warn('Token has expired, logging out');
          logout();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Set up interval to check every minute
    const intervalId = setInterval(checkTokenExpiration, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [token, isAuthenticated]);

  /**
   * Initialize authentication state from stored token
   */
  const initializeAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if we have a valid token
      const isValidToken = await authService.verifyToken();
      
      if (isValidToken) {
        // Get current token and user profile
        const currentToken = authService.getCurrentToken();
        const userProfile = await authService.getProfile();
        
        setToken(currentToken);
        setUser(userProfile);
      } else {
        // Clear any invalid state
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      setError('Failed to initialize authentication');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user with credentials
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const authResponse = await authService.login(credentials);
      
      setToken(authResponse.token);
      setUser(authResponse.user);
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout current user
   */
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Don't throw error for logout - we still want to clear local state
    } finally {
      // Always clear local state
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  /**
   * Refresh authentication token
   */
  const refreshToken = async (): Promise<void> => {
    setError(null);

    try {
      const newToken = await authService.refreshToken();
      setToken(newToken);
      
      // Optionally refresh user profile
      const userProfile = await authService.getProfile();
      setUser(userProfile);
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      setError(error.message || 'Token refresh failed');
      
      // Clear authentication state on refresh failure
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    setError(null);

    try {
      const updatedProfile = await authService.updateProfile(profileData);
      setUser(updatedProfile);
    } catch (error: any) {
      console.error('Profile update failed:', error);
      setError(error.message || 'Profile update failed');
      throw error;
    }
  };

  /**
   * Change user password
   */
  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    setError(null);

    try {
      await authService.changePassword({ oldPassword, newPassword });
    } catch (error: any) {
      console.error('Password change failed:', error);
      setError(error.message || 'Password change failed');
      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    setError(null);
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    login,
    logout,
    refreshToken,
    clearError,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to check if user has specific role
 */
export const useAuthRole = (requiredRole: string): boolean => {
  const { user } = useAuth();
  return user?.role === requiredRole;
};

/**
 * Hook to check if user is admin
 */
export const useIsAdmin = (): boolean => {
  return useAuthRole('ADMIN');
};

export default AuthContext;