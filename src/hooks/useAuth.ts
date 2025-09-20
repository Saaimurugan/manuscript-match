/**
 * Authentication-related React Query hooks
 * Provides hooks for login, logout, profile management, and token verification
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import type { 
  LoginCredentials, 
  AuthResponse, 
  UserProfile, 
  ChangePasswordRequest 
} from '../types/api';

/**
 * Hook for user authentication (login)
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials): Promise<AuthResponse> => 
      authService.login(credentials),
    onSuccess: (data) => {
      // Cache user profile data
      queryClient.setQueryData(queryKeys.auth.profile(), data.user);
      // Invalidate auth verification
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.verify() });
    },
    onError: (error) => {
      console.error('Login failed:', error);
      // Clear any cached auth data on login failure
      cacheUtils.invalidateAuth(queryClient);
    },
  });
};

/**
 * Hook for user logout
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (): Promise<void> => authService.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      cacheUtils.clearAll(queryClient);
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Clear cache even if logout fails
      cacheUtils.clearAll(queryClient);
    },
  });
};

/**
 * Hook for getting user profile
 */
export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: (): Promise<UserProfile> => authService.getProfile(),
    staleTime: 10 * 60 * 1000, // Profile data is stable for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.type === 'AUTHENTICATION_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for token verification
 */
export const useVerifyToken = () => {
  return useQuery({
    queryKey: queryKeys.auth.verify(),
    queryFn: (): Promise<boolean> => authService.verifyToken(),
    staleTime: 2 * 60 * 1000, // Verify token every 2 minutes
    gcTime: 5 * 60 * 1000, // Keep verification result for 5 minutes
    retry: false, // Don't retry token verification
    refetchOnWindowFocus: true, // Verify when user returns to app
  });
};

/**
 * Hook for changing password
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest): Promise<void> => 
      authService.changePassword(data.oldPassword, data.newPassword),
    onError: (error) => {
      console.error('Password change failed:', error);
    },
  });
};

/**
 * Hook for checking authentication status
 */
export const useAuthStatus = () => {
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const { data: isTokenValid, isLoading: tokenLoading, error: tokenError } = useVerifyToken();
  
  const isAuthenticated = !!(profile && isTokenValid);
  const isLoading = profileLoading || tokenLoading;
  const error = profileError || tokenError;
  
  return {
    isAuthenticated,
    isLoading,
    error,
    user: profile,
  };
};

/**
 * Main authentication hook (alias for useAuthStatus)
 */
export const useAuth = useAuthStatus;