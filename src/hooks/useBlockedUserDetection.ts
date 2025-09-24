/**
 * Hook for detecting blocked users and handling automatic session termination
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface BlockedUserState {
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  showNotification: boolean;
}

export interface UseBlockedUserDetectionOptions {
  checkInterval?: number; // in milliseconds
  autoLogout?: boolean;
  autoLogoutDelay?: number; // in milliseconds
  onUserBlocked?: (blockInfo: BlockedUserState) => void;
}

/**
 * Hook to detect if the current user has been blocked
 */
export const useBlockedUserDetection = (options: UseBlockedUserDetectionOptions = {}) => {
  const {
    checkInterval = 30000, // 30 seconds
    autoLogout = true,
    autoLogoutDelay = 5000, // 5 seconds
    onUserBlocked,
  } = options;

  const { user, isAuthenticated, logout, authError } = useAuth();
  const [blockedState, setBlockedState] = useState<BlockedUserState>({
    isBlocked: false,
    showNotification: false,
  });

  // Check if user is blocked based on auth errors
  useEffect(() => {
    if (authError && authError.type === 'AUTHORIZATION_ERROR' && 
        authError.message.includes('blocked')) {
      const newBlockedState: BlockedUserState = {
        isBlocked: true,
        blockReason: authError.message,
        showNotification: true,
      };

      setBlockedState(newBlockedState);

      if (onUserBlocked) {
        onUserBlocked(newBlockedState);
      }

      // Auto-logout after delay
      if (autoLogout) {
        setTimeout(() => {
          logout();
        }, autoLogoutDelay);
      }
    }
  }, [authError, onUserBlocked, autoLogout, autoLogoutDelay, logout]);

  // Periodic check for user status (if needed)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const checkUserStatus = async () => {
      try {
        // In a real implementation, you might want to make an API call
        // to check the user's current status
        // const response = await authService.checkUserStatus();
        // if (response.isBlocked) {
        //   // Handle blocked user
        // }
      } catch (error) {
        console.error('Error checking user status:', error);
      }
    };

    const interval = setInterval(checkUserStatus, checkInterval);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, checkInterval]);

  const dismissNotification = () => {
    setBlockedState(prev => ({
      ...prev,
      showNotification: false,
    }));
  };

  const forceLogout = () => {
    logout();
  };

  return {
    ...blockedState,
    dismissNotification,
    forceLogout,
  };
};

export default useBlockedUserDetection;