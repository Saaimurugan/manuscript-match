/**
 * Authentication context for global authentication state management
 * Provides authentication state and methods throughout the React application
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { authService } from '../services/authService';
import { jwtValidator } from '../utils/jwtValidator';
import { createTokenRefreshManager, type TokenRefreshManager } from '../utils/tokenRefreshManager';
import { authLogger } from '../utils/authLogger';
import type { LoginCredentials, UserProfile } from '../types/api';

// Enhanced error state interface with retry tracking
export interface AuthError {
  type: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'REFRESH_FAILED' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'DECODE_ERROR' | 'MALFORMED_TOKEN' | 'PROFILE_LOAD_FAILED';
  message: string;
  timestamp: Date;
  shouldRetry: boolean;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  recoveryAction?: 'LOGOUT' | 'REFRESH' | 'CLEAR_TOKEN' | 'NONE';
}

// Token validation state interface
export interface TokenState {
  token: string | null;
  isValid: boolean;
  expiresAt: Date | null;
  lastValidated: Date | null;
  validationError: string | null;
}

export interface AuthContextType {
  // Authentication state
  user: UserProfile | null;
  token: string | null;
  tokenState: TokenState;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authError: AuthError | null;

  // Authentication methods
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  recoverFromError: () => Promise<void>;

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
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [tokenState, setTokenState] = useState<TokenState>({
    token: null,
    isValid: false,
    expiresAt: null,
    lastValidated: null,
    validationError: null,
  });

  // Error recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastRecoveryAttempt, setLastRecoveryAttempt] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // Token refresh manager
  const tokenRefreshManagerRef = useRef<TokenRefreshManager | null>(null);

  // Constants for error recovery
  const MAX_CONSECUTIVE_FAILURES = 3;
  const RECOVERY_COOLDOWN_MS = 30000; // 30 seconds
  const MAX_RETRY_ATTEMPTS = 2;

  // Computed authentication state
  const isAuthenticated = user !== null && token !== null && tokenState.isValid;

  /**
   * Create enhanced auth error with retry tracking
   */
  const createAuthError = (
    type: AuthError['type'],
    message: string,
    shouldRetry: boolean = false,
    recoveryAction: AuthError['recoveryAction'] = 'NONE'
  ): AuthError => {
    const currentError = authError;
    const retryCount = currentError?.type === type ? (currentError.retryCount || 0) + 1 : 1;

    const newError: AuthError = {
      type,
      message,
      timestamp: new Date(),
      shouldRetry: shouldRetry && retryCount <= MAX_RETRY_ATTEMPTS,
      retryCount,
      maxRetries: MAX_RETRY_ATTEMPTS,
      lastRetryAt: currentError?.lastRetryAt,
      recoveryAction,
    };

    // Log the authentication error
    authLogger.logAuthError(type, message, {
      recoveryAction,
      retryCount,
      maxRetries: MAX_RETRY_ATTEMPTS,
      shouldRetry: newError.shouldRetry,
      consecutiveFailures,
      lastRecoveryAttempt,
    }, {
      userId: user?.id,
    });

    return newError;
  };

  /**
   * Check if we should attempt error recovery
   */
  const shouldAttemptRecovery = (error: AuthError): boolean => {
    // Don't recover if already recovering
    if (isRecovering) {
      return false;
    }

    // Don't recover if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn('Too many consecutive failures, skipping recovery', {
        consecutiveFailures,
        maxFailures: MAX_CONSECUTIVE_FAILURES,
      });
      return false;
    }

    // Don't recover if within cooldown period
    if (lastRecoveryAttempt) {
      const timeSinceLastRecovery = Date.now() - lastRecoveryAttempt.getTime();
      if (timeSinceLastRecovery < RECOVERY_COOLDOWN_MS) {
        console.warn('Recovery cooldown active, skipping recovery', {
          timeSinceLastRecovery,
          cooldownMs: RECOVERY_COOLDOWN_MS,
        });
        return false;
      }
    }

    // Don't recover if max retries exceeded
    if (error.retryCount > error.maxRetries) {
      console.warn('Max retries exceeded, skipping recovery', {
        retryCount: error.retryCount,
        maxRetries: error.maxRetries,
      });
      return false;
    }

    return error.shouldRetry;
  };

  /**
   * Automatically clean up invalid tokens and state
   */
  const cleanupInvalidState = (reason: string): void => {
    console.log('Cleaning up invalid authentication state', { reason });

    // Log the cleanup event
    authLogger.logAuthEvent('LOGOUT', true, {
      metadata: {
        reason: 'automatic_cleanup',
        triggerReason: reason,
        consecutiveFailures,
      },
    }, {
      userId: user?.id,
    });

    // Clear token refresh manager scheduled checks
    if (tokenRefreshManagerRef.current) {
      tokenRefreshManagerRef.current.clearScheduledChecks();
      tokenRefreshManagerRef.current.reset();
    }

    // Clear token from storage
    try {
      authService.logout().catch(err => {
        console.warn('Failed to clear token from storage during cleanup:', err);
        authLogger.logAuthError('NETWORK_ERROR', 'Failed to clear token from storage during cleanup', {
          recoveryAction: 'NONE',
          retryCount: 0,
          maxRetries: 0,
          shouldRetry: false,
          stackTrace: err instanceof Error ? err.stack : undefined,
        }, {
          userId: user?.id,
        });
      });
    } catch (err) {
      console.warn('Error during token cleanup:', err);
      authLogger.logAuthError('VALIDATION_ERROR', 'Error during token cleanup', {
        recoveryAction: 'NONE',
        retryCount: 0,
        maxRetries: 0,
        shouldRetry: false,
        stackTrace: err instanceof Error ? err.stack : undefined,
      }, {
        userId: user?.id,
      });
    }

    // Clear local state
    setToken(null);
    setUser(null);
    setTokenState({
      token: null,
      isValid: false,
      expiresAt: null,
      lastValidated: new Date(),
      validationError: reason,
    });

    // Increment consecutive failures
    setConsecutiveFailures(prev => prev + 1);
  };

  /**
   * Handle managed token refresh using the token refresh manager
   */
  const handleManagedTokenRefresh = async (): Promise<void> => {
    if (!tokenRefreshManagerRef.current) {
      console.error('Token refresh manager not initialized');
      return;
    }

    const refreshManager = tokenRefreshManagerRef.current;

    // Check if refresh is already in progress to prevent multiple attempts
    if (refreshManager.isRefreshInProgress) {
      console.log('Token refresh already in progress, skipping duplicate request');
      return;
    }

    try {
      const refreshResult = await refreshManager.refreshToken();

      if (refreshResult.success && refreshResult.token) {
        // Validate the new token before setting it
        const validationResult = jwtValidator.safeDecodeToken(refreshResult.token);

        if (!validationResult.isValid) {
          const errorMessage = `Received invalid token from managed refresh: ${validationResult.error}`;
          console.error(errorMessage, {
            errorType: validationResult.errorType,
            timestamp: new Date().toISOString(),
          });

          const refreshError = createAuthError(
            'REFRESH_FAILED',
            errorMessage,
            false,
            'CLEAR_TOKEN'
          );
          setAuthError(refreshError);
          executeRecoveryAction(refreshError);
          return;
        }

        // Token is valid, update state
        const expirationTime = jwtValidator.getTokenExpirationTime(validationResult.payload);

        setToken(refreshResult.token);
        setTokenState({
          token: refreshResult.token,
          isValid: true,
          expiresAt: expirationTime ? new Date(expirationTime) : null,
          lastValidated: new Date(),
          validationError: null,
        });

        // Optionally refresh user profile
        try {
          const userProfile = await authService.getProfile();
          setUser(userProfile);
        } catch (profileError) {
          console.warn('Failed to refresh user profile after token refresh:', profileError);
          // Don't fail the entire refresh for profile errors
        }

        console.log('Managed token refresh successful', {
          expiresAt: expirationTime ? new Date(expirationTime).toISOString() : 'no expiration',
          timestamp: new Date().toISOString(),
        });

        // Schedule next token check
        refreshManager.scheduleTokenCheck(refreshResult.token);

      } else {
        // Refresh failed
        const errorMessage = refreshResult.error || 'Token refresh failed';
        console.error('Managed token refresh failed:', errorMessage);

        const refreshError = createAuthError(
          'REFRESH_FAILED',
          errorMessage,
          refreshResult.shouldRetry || false,
          'CLEAR_TOKEN'
        );
        setAuthError(refreshError);

        // Execute recovery action if not retrying
        if (!refreshResult.shouldRetry) {
          executeRecoveryAction(refreshError);
        }
      }
    } catch (error) {
      const errorMessage = `Managed token refresh error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage, error);

      const refreshError = createAuthError(
        'REFRESH_FAILED',
        errorMessage,
        false,
        'CLEAR_TOKEN'
      );
      setAuthError(refreshError);
      executeRecoveryAction(refreshError);
    }
  };

  /**
   * Execute recovery action based on error type
   */
  const executeRecoveryAction = async (error: AuthError): Promise<void> => {
    if (!shouldAttemptRecovery(error)) {
      return;
    }

    setIsRecovering(true);
    setLastRecoveryAttempt(new Date());
    const recoveryStartTime = Date.now();

    try {
      console.log('Executing recovery action', {
        errorType: error.type,
        recoveryAction: error.recoveryAction,
        retryCount: error.retryCount,
      });

      // Log recovery attempt
      authLogger.logAuthEvent('ERROR_RECOVERY', true, {
        metadata: {
          errorType: error.type,
          recoveryAction: error.recoveryAction,
          retryCount: error.retryCount,
          consecutiveFailures,
        },
      }, {
        userId: user?.id,
      });

      switch (error.recoveryAction) {
        case 'REFRESH':
          if (token) {
            await handleManagedTokenRefresh();
            setConsecutiveFailures(0); // Reset on successful recovery

            authLogger.logAuthEvent('ERROR_RECOVERY', true, {
              duration: Date.now() - recoveryStartTime,
              metadata: {
                action: 'token_refresh_success',
                errorType: error.type,
              },
            }, {
              userId: user?.id,
            });
          }
          break;

        case 'CLEAR_TOKEN':
          cleanupInvalidState(`Recovery action: ${error.recoveryAction}`);
          break;

        case 'LOGOUT':
          await logout();
          break;

        case 'NONE':
        default:
          // No automatic recovery action
          break;
      }
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      setConsecutiveFailures(prev => prev + 1);

      // Log recovery failure
      authLogger.logAuthEvent('ERROR_RECOVERY', false, {
        duration: Date.now() - recoveryStartTime,
        errorMessage: recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error',
        metadata: {
          errorType: error.type,
          recoveryAction: error.recoveryAction,
          consecutiveFailures: consecutiveFailures + 1,
        },
      }, {
        userId: user?.id,
      });

      // If recovery fails, force cleanup
      cleanupInvalidState('Recovery action failed');
    } finally {
      setIsRecovering(false);
    }
  };

  /**
   * Initialize token refresh manager
   */
  useEffect(() => {
    // Create token refresh manager with auth service refresh function
    tokenRefreshManagerRef.current = createTokenRefreshManager(
      () => authService.refreshToken(),
      {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        debounceMs: 500,
      }
    );

    // Cleanup on unmount
    return () => {
      if (tokenRefreshManagerRef.current) {
        tokenRefreshManagerRef.current.clearScheduledChecks();
        tokenRefreshManagerRef.current.reset();
      }
    };
  }, []);

  /**
   * Initialize authentication state on app load
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Set up managed token refresh and expiration handling
   */
  useEffect(() => {
    if (!token || !tokenRefreshManagerRef.current) {
      return;
    }

    const refreshManager = tokenRefreshManagerRef.current;

    // Clear any existing scheduled checks
    refreshManager.clearScheduledChecks();

    // Validate token and set up managed refresh
    const validationResult = jwtValidator.safeDecodeToken(token);

    if (!validationResult.isValid) {
      // Log specific validation error
      const errorMessage = `Token validation failed: ${validationResult.error}`;
      console.error(errorMessage, {
        errorType: validationResult.errorType,
        timestamp: new Date().toISOString(),
      });

      // Update token state with validation error
      setTokenState(prev => ({
        ...prev,
        isValid: false,
        validationError: validationResult.error || 'Unknown validation error',
        lastValidated: new Date(),
      }));

      // Create enhanced auth error with recovery action
      let authErrorType: AuthError['type'];
      let recoveryAction: AuthError['recoveryAction'];
      let shouldRetry = false;

      switch (validationResult.errorType) {
        case 'EXPIRED':
          authErrorType = 'TOKEN_EXPIRED';
          recoveryAction = 'REFRESH';
          shouldRetry = true;
          break;
        case 'DECODE_ERROR':
          authErrorType = 'DECODE_ERROR';
          recoveryAction = 'CLEAR_TOKEN';
          shouldRetry = false;
          break;
        case 'MALFORMED':
          authErrorType = 'MALFORMED_TOKEN';
          recoveryAction = 'CLEAR_TOKEN';
          shouldRetry = false;
          break;
        default:
          authErrorType = 'TOKEN_INVALID';
          recoveryAction = 'LOGOUT';
          shouldRetry = false;
      }

      const newAuthError = createAuthError(authErrorType, errorMessage, shouldRetry, recoveryAction);
      setAuthError(newAuthError);

      // Execute recovery action if appropriate
      executeRecoveryAction(newAuthError);
      return;
    }

    // Token is valid, update token state
    const expirationTime = jwtValidator.getTokenExpirationTime(validationResult.payload);
    setTokenState(prev => ({
      ...prev,
      token,
      isValid: true,
      expiresAt: expirationTime ? new Date(expirationTime) : null,
      lastValidated: new Date(),
      validationError: null,
    }));

    // Schedule managed token check for automatic refresh
    refreshManager.scheduleTokenCheck(token);

    // Check if token is already expired or needs immediate refresh
    if (expirationTime) {
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      if (timeUntilExpiration <= 0) {
        // Token is already expired, attempt refresh immediately
        console.warn('Token has expired, attempting immediate refresh', {
          expiredAt: new Date(expirationTime).toISOString(),
          timestamp: new Date().toISOString(),
        });

        handleManagedTokenRefresh();
      } else if (timeUntilExpiration < 5 * 60 * 1000) {
        // Token expires soon, attempt refresh
        console.log('Token expires soon, attempting managed refresh', {
          expiresIn: Math.floor(timeUntilExpiration / 1000),
          timestamp: new Date().toISOString(),
        });

        handleManagedTokenRefresh();
      }
    }

    // Cleanup function
    return () => {
      refreshManager.clearScheduledChecks();
    };
  }, [token]);

  /**
   * Initialize authentication state from stored token
   */
  const initializeAuth = async () => {
    setIsLoading(true);
    setError(null);
    setAuthError(null);
    const initStartTime = Date.now();

    try {
      // Log session initialization start
      authLogger.logAuthEvent('SESSION_INIT', true, {
        metadata: { phase: 'start' },
      });

      // Get current token first
      const currentToken = authService.getCurrentToken();

      if (currentToken) {
        // Validate token format and content before using it
        const validationResult = jwtValidator.safeDecodeToken(currentToken);

        if (!validationResult.isValid) {
          console.warn('Stored token is invalid during initialization', {
            error: validationResult.error,
            errorType: validationResult.errorType,
            timestamp: new Date().toISOString(),
          });

          const initError = createAuthError(
            'TOKEN_INVALID',
            `Stored token is invalid: ${validationResult.error}`,
            validationResult.errorType === 'EXPIRED',
            'CLEAR_TOKEN'
          );
          setAuthError(initError);

          // Clear invalid stored token
          await authService.logout();
          setTokenState({
            token: null,
            isValid: false,
            expiresAt: null,
            lastValidated: new Date(),
            validationError: validationResult.error || 'Invalid stored token',
          });

          authLogger.logAuthEvent('SESSION_INIT', false, {
            duration: Date.now() - initStartTime,
            errorMessage: `Invalid stored token: ${validationResult.error}`,
            metadata: {
              phase: 'token_validation',
              errorType: validationResult.errorType,
            },
          });
          return;
        }

        // Token format is valid, now verify with server
        const isValidToken = await authService.verifyToken();

        if (isValidToken) {
          try {
            // Get user profile
            const userProfile = await authService.getProfile();

            if (!userProfile || !userProfile.id) {
              throw new Error('Invalid user profile received from server');
            }

            const expirationTime = jwtValidator.getTokenExpirationTime(validationResult.payload);

            setToken(currentToken);
            setUser(userProfile);
            setTokenState({
              token: currentToken,
              isValid: true,
              expiresAt: expirationTime ? new Date(expirationTime) : null,
              lastValidated: new Date(),
              validationError: null,
            });

            // Schedule token check with refresh manager
            if (tokenRefreshManagerRef.current) {
              tokenRefreshManagerRef.current.scheduleTokenCheck(currentToken);
            }

            console.log('Authentication initialized successfully', {
              userId: userProfile.id,
              expiresAt: expirationTime ? new Date(expirationTime).toISOString() : 'no expiration',
              timestamp: new Date().toISOString(),
            });

            authLogger.logAuthEvent('SESSION_INIT', true, {
              duration: Date.now() - initStartTime,
              metadata: {
                phase: 'complete',
                userId: userProfile.id,
                tokenExpiresAt: expirationTime ? new Date(expirationTime).toISOString() : null,
              },
            }, {
              userId: userProfile.id,
            });
          } catch (profileError) {
            console.error('Failed to get user profile during initialization:', profileError);

            // Clear invalid session
            await authService.logout();
            setTokenState({
              token: null,
              isValid: false,
              expiresAt: null,
              lastValidated: new Date(),
              validationError: 'Failed to load user profile',
            });

            const initError = createAuthError(
              'PROFILE_LOAD_FAILED',
              'Failed to load user profile',
              false,
              'CLEAR_TOKEN'
            );
            setAuthError(initError);

            authLogger.logAuthEvent('SESSION_INIT', false, {
              duration: Date.now() - initStartTime,
              errorMessage: 'Failed to load user profile',
              metadata: {
                phase: 'profile_load',
                error: profileError instanceof Error ? profileError.message : 'Unknown error',
              },
            });
            return;
          }
        } else {
          console.warn('Token verification failed during initialization');
          const verificationError = createAuthError(
            'TOKEN_INVALID',
            'Token verification failed',
            true,
            'CLEAR_TOKEN'
          );
          setAuthError(verificationError);

          // Clear invalid state
          setToken(null);
          setUser(null);
          setTokenState({
            token: null,
            isValid: false,
            expiresAt: null,
            lastValidated: new Date(),
            validationError: 'Token verification failed',
          });

          authLogger.logAuthEvent('SESSION_INIT', false, {
            duration: Date.now() - initStartTime,
            errorMessage: 'Token verification failed',
            metadata: { phase: 'server_verification' },
          });
        }
      } else {
        // No token found, clear state
        setToken(null);
        setUser(null);
        setTokenState({
          token: null,
          isValid: false,
          expiresAt: null,
          lastValidated: null,
          validationError: null,
        });

        authLogger.logAuthEvent('SESSION_INIT', true, {
          duration: Date.now() - initStartTime,
          metadata: {
            phase: 'complete',
            noTokenFound: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      setError('Failed to initialize authentication');
      const networkError = createAuthError(
        'NETWORK_ERROR',
        `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
        'NONE'
      );
      setAuthError(networkError);

      setToken(null);
      setUser(null);
      setTokenState({
        token: null,
        isValid: false,
        expiresAt: null,
        lastValidated: new Date(),
        validationError: 'Initialization failed',
      });

      authLogger.logAuthEvent('SESSION_INIT', false, {
        duration: Date.now() - initStartTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          phase: 'error',
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      });
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
    setAuthError(null);
    const loginStartTime = Date.now();

    try {
      const authResponse = await authService.login(credentials);

      // Validate the received token before setting it
      const validationResult = jwtValidator.safeDecodeToken(authResponse.token);

      if (!validationResult.isValid) {
        const errorMessage = `Received invalid token from login: ${validationResult.error}`;
        console.error(errorMessage, {
          errorType: validationResult.errorType,
          timestamp: new Date().toISOString(),
        });

        const loginError = createAuthError(
          'TOKEN_INVALID',
          errorMessage,
          false,
          'NONE'
        );
        setAuthError(loginError);

        authLogger.logAuthEvent('LOGIN', false, {
          duration: Date.now() - loginStartTime,
          errorMessage,
          metadata: {
            errorType: validationResult.errorType,
            phase: 'token_validation',
          },
        });

        throw new Error('Invalid token received from server');
      }

      // Token is valid, set authentication state
      const expirationTime = jwtValidator.getTokenExpirationTime(validationResult.payload);

      setToken(authResponse.token);
      setUser(authResponse.user);
      setTokenState({
        token: authResponse.token,
        isValid: true,
        expiresAt: expirationTime ? new Date(expirationTime) : null,
        lastValidated: new Date(),
        validationError: null,
      });

      // Schedule token check with refresh manager
      if (tokenRefreshManagerRef.current) {
        tokenRefreshManagerRef.current.scheduleTokenCheck(authResponse.token);
      }

      console.log('Login successful with valid token', {
        userId: authResponse.user.id,
        expiresAt: expirationTime ? new Date(expirationTime).toISOString() : 'no expiration',
        timestamp: new Date().toISOString(),
      });

      authLogger.logAuthEvent('LOGIN', true, {
        duration: Date.now() - loginStartTime,
        metadata: {
          userId: authResponse.user.id,
          tokenExpiresAt: expirationTime ? new Date(expirationTime).toISOString() : null,
        },
      }, {
        userId: authResponse.user.id,
      });

    } catch (error: any) {
      console.error('Login failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error keys:', Object.keys(error));
      setError(error.message || 'Login failed');

      // Clear any partial state on login failure
      setToken(null);
      setUser(null);
      setTokenState({
        token: null,
        isValid: false,
        expiresAt: null,
        lastValidated: null,
        validationError: null,
      });

      authLogger.logAuthEvent('LOGIN', false, {
        duration: Date.now() - loginStartTime,
        errorMessage: error.message || 'Login failed',
        metadata: {
          phase: 'authentication',
          stackTrace: error.stack,
        },
      });

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
    const logoutStartTime = Date.now();
    const currentUserId = user?.id;

    console.log('Logout initiated', {
      reason: authError ? `Auth error: ${authError.type}` : 'User initiated',
      timestamp: new Date().toISOString(),
    });

    try {
      await authService.logout();

      authLogger.logAuthEvent('LOGOUT', true, {
        duration: Date.now() - logoutStartTime,
        metadata: {
          reason: authError ? `auth_error_${authError.type}` : 'user_initiated',
          consecutiveFailures,
        },
      }, {
        userId: currentUserId,
      });
    } catch (error) {
      console.error('Logout service call failed:', error);

      authLogger.logAuthEvent('LOGOUT', false, {
        duration: Date.now() - logoutStartTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown logout error',
        metadata: {
          reason: authError ? `auth_error_${authError.type}` : 'user_initiated',
          phase: 'service_call',
          stackTrace: error instanceof Error ? error.stack : undefined,
        },
      }, {
        userId: currentUserId,
      });
      // Don't throw error for logout - we still want to clear local state
    } finally {
      // Clear token refresh manager scheduled checks
      if (tokenRefreshManagerRef.current) {
        tokenRefreshManagerRef.current.clearScheduledChecks();
        tokenRefreshManagerRef.current.reset();
      }

      // Always clear local state
      setToken(null);
      setUser(null);
      setTokenState({
        token: null,
        isValid: false,
        expiresAt: null,
        lastValidated: null,
        validationError: null,
      });
      // Clear auth error and recovery state after logout
      setAuthError(null);
      setIsRecovering(false);
      setConsecutiveFailures(0);
      setLastRecoveryAttempt(null);
      setIsLoading(false);

      console.log('Logout completed - all state cleared', {
        timestamp: new Date().toISOString(),
      });
    }
  };

  /**
   * Refresh authentication token using managed refresh system
   */
  const refreshToken = async (): Promise<void> => {
    setError(null);
    setAuthError(null);

    if (!tokenRefreshManagerRef.current) {
      const error = new Error('Token refresh manager not initialized');
      console.error('Token refresh failed:', error);
      setError('Token refresh system not available');
      throw error;
    }

    try {
      await handleManagedTokenRefresh();
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      setError(error.message || 'Token refresh failed');
      throw error;
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData: Partial<UserProfile>): Promise<void> => {
    setError(null);
    const updateStartTime = Date.now();

    try {
      const updatedProfile = await authService.updateProfile(profileData);
      setUser(updatedProfile);

      authLogger.logAuthEvent('PROFILE_UPDATE', true, {
        duration: Date.now() - updateStartTime,
        metadata: {
          updatedFields: Object.keys(profileData),
        },
      }, {
        userId: updatedProfile.id,
      });
    } catch (error: any) {
      console.error('Profile update failed:', error);
      setError(error.message || 'Profile update failed');

      authLogger.logAuthEvent('PROFILE_UPDATE', false, {
        duration: Date.now() - updateStartTime,
        errorMessage: error.message || 'Profile update failed',
        metadata: {
          attemptedFields: Object.keys(profileData),
          stackTrace: error.stack,
        },
      }, {
        userId: user?.id,
      });

      throw error;
    }
  };

  /**
   * Change user password
   */
  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    setError(null);
    const changeStartTime = Date.now();

    try {
      await authService.changePassword({ oldPassword, newPassword });

      authLogger.logAuthEvent('PASSWORD_CHANGE', true, {
        duration: Date.now() - changeStartTime,
      }, {
        userId: user?.id,
      });
    } catch (error: any) {
      console.error('Password change failed:', error);
      setError(error.message || 'Password change failed');

      authLogger.logAuthEvent('PASSWORD_CHANGE', false, {
        duration: Date.now() - changeStartTime,
        errorMessage: error.message || 'Password change failed',
        metadata: {
          stackTrace: error.stack,
        },
      }, {
        userId: user?.id,
      });

      throw error;
    }
  };

  /**
   * Clear error state
   */
  const clearError = (): void => {
    setError(null);
    setAuthError(null);
    setConsecutiveFailures(0);
  };

  /**
   * Manually trigger error recovery
   */
  const recoverFromError = async (): Promise<void> => {
    if (!authError) {
      console.warn('No auth error to recover from');
      return;
    }

    console.log('Manual error recovery triggered', {
      errorType: authError.type,
      retryCount: authError.retryCount,
    });

    // Reset consecutive failures for manual recovery
    setConsecutiveFailures(0);

    // Create a new error with incremented retry count for manual recovery
    const recoveryError: AuthError = {
      ...authError,
      retryCount: authError.retryCount + 1,
      lastRetryAt: new Date(),
      shouldRetry: authError.retryCount + 1 <= MAX_RETRY_ATTEMPTS,
    };

    setAuthError(recoveryError);

    // Execute recovery action
    await executeRecoveryAction(recoveryError);
  };

  /**
   * Set up error boundary integration
   */
  useEffect(() => {
    // Handle error boundary clear authentication events
    const handleErrorBoundaryClear = async (event: CustomEvent) => {
      const { errorId, errorType, reason } = event.detail;

      console.log('Error boundary requested auth clear', {
        errorId,
        errorType,
        reason,
        timestamp: new Date().toISOString(),
      });

      try {
        // Clear authentication state
        await logout();
      } catch (error) {
        console.error('Failed to clear auth from error boundary:', error);
      }
    };

    // Handle error boundary reinitialize authentication events
    const handleErrorBoundaryReinit = async (event: CustomEvent) => {
      const { errorId, errorType, reason } = event.detail;

      console.log('Error boundary requested auth reinit', {
        errorId,
        errorType,
        reason,
        timestamp: new Date().toISOString(),
      });

      try {
        // Clear any existing errors and attempt recovery
        clearError();
        await recoverFromError();
      } catch (error) {
        console.error('Failed to reinit auth from error boundary:', error);
        // Fallback to logout if reinit fails
        await logout();
      }
    };

    // Add event listeners
    window.addEventListener('auth-error-boundary-clear', handleErrorBoundaryClear as EventListener);
    window.addEventListener('auth-error-boundary-reinit', handleErrorBoundaryReinit as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('auth-error-boundary-clear', handleErrorBoundaryClear as EventListener);
      window.removeEventListener('auth-error-boundary-reinit', handleErrorBoundaryReinit as EventListener);
    };
  }, [logout, clearError, recoverFromError]);

  // Context value
  const contextValue: AuthContextType = {
    // State
    user,
    token,
    tokenState,
    isAuthenticated,
    isLoading,
    error,
    authError,

    // Methods
    login,
    logout,
    refreshToken,
    clearError,
    recoverFromError,
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