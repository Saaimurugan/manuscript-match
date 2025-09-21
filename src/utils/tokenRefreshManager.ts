/**
 * Token Refresh Management System
 * Provides debounced token refresh with exponential backoff and prevents multiple simultaneous attempts
 */

import { jwtValidator } from './jwtValidator';
import { authLogger } from './authLogger';

export interface TokenRefreshOptions {
  refreshEndpoint?: string;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  debounceMs?: number;
}

export interface RefreshResult {
  success: boolean;
  token?: string;
  error?: string;
  shouldRetry?: boolean;
}

export interface TokenRefreshManager {
  isRefreshInProgress: boolean;
  refreshToken(): Promise<RefreshResult>;
  scheduleTokenCheck(token: string): void;
  clearScheduledChecks(): void;
  reset(): void;
}

/**
 * Token Refresh Manager Implementation
 */
export class TokenRefreshManagerImpl implements TokenRefreshManager {
  private _isRefreshInProgress = false;
  private refreshPromise: Promise<RefreshResult> | null = null;
  private scheduledCheckTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private lastRefreshAttempt = 0;
  private debounceTimeout: NodeJS.Timeout | null = null;

  private readonly options: Required<TokenRefreshOptions>;

  constructor(
    private refreshFunction: () => Promise<string>,
    options: TokenRefreshOptions = {}
  ) {
    this.options = {
      refreshEndpoint: options.refreshEndpoint || '/api/auth/refresh',
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      maxDelay: options.maxDelay || 30000,
      debounceMs: options.debounceMs || 500,
    };
  }

  get isRefreshInProgress(): boolean {
    return this._isRefreshInProgress;
  }

  /**
   * Refreshes token with debouncing and exponential backoff
   */
  async refreshToken(): Promise<RefreshResult> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      authLogger.logTokenRefresh('MANUAL', 'IN_PROGRESS', {
        retryCount: this.retryCount,
        maxRetries: this.options.maxRetries,
      });
      return this.refreshPromise;
    }

    // Check debounce - prevent too frequent refresh attempts
    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.options.debounceMs) {
      const result = {
        success: false,
        error: 'Token refresh debounced - too frequent attempts',
        shouldRetry: false
      };

      authLogger.logTokenRefresh('MANUAL', 'DEBOUNCED', {
        retryCount: this.retryCount,
        maxRetries: this.options.maxRetries,
        errorMessage: result.error,
      });

      return result;
    }

    // Create new refresh promise
    this.refreshPromise = this.performRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // Clear the promise after completion
      this.refreshPromise = null;
    }
  }

  /**
   * Performs the actual token refresh with retry logic
   */
  private async performRefresh(): Promise<RefreshResult> {
    this._isRefreshInProgress = true;
    this.lastRefreshAttempt = Date.now();
    const refreshStartTime = Date.now();

    try {
      // Clear any existing debounce timeout
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = null;
      }

      const newToken = await this.refreshFunction();
      
      // Validate the new token
      const validation = jwtValidator.safeDecodeToken(newToken);
      if (!validation.isValid) {
        const errorMessage = `Received invalid token from refresh: ${validation.error}`;
        
        authLogger.logTokenRefresh('MANUAL', 'FAILED', {
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
          refreshStartTime,
          errorMessage,
        });

        throw new Error(errorMessage);
      }

      // Reset retry count on success
      this.retryCount = 0;
      
      const newTokenExpiresAt = validation.payload?.exp ? new Date(validation.payload.exp * 1000) : undefined;

      authLogger.logTokenRefresh('MANUAL', 'SUCCESS', {
        retryCount: 0,
        maxRetries: this.options.maxRetries,
        refreshStartTime,
        newTokenExpiresAt,
      });
      
      return {
        success: true,
        token: newToken
      };

    } catch (error) {
      this.retryCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown refresh error';
      
      // Determine if we should retry
      const shouldRetry = this.retryCount < this.options.maxRetries;
      
      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const delay = this.calculateBackoffDelay();
        this.scheduleRetry(delay);

        authLogger.logTokenRefresh('MANUAL', 'FAILED', {
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
          backoffDelay: delay,
          refreshStartTime,
          errorMessage,
        });
      } else {
        // Max retries reached, reset for future attempts
        this.retryCount = 0;

        authLogger.logTokenRefresh('MANUAL', 'FAILED', {
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
          refreshStartTime,
          errorMessage: `Max retries exceeded: ${errorMessage}`,
        });
      }

      return {
        success: false,
        error: errorMessage,
        shouldRetry
      };

    } finally {
      this._isRefreshInProgress = false;
    }
  }

  /**
   * Calculates exponential backoff delay
   */
  private calculateBackoffDelay(): number {
    const exponentialDelay = this.options.baseDelay * Math.pow(2, this.retryCount - 1);
    const jitteredDelay = exponentialDelay + Math.random() * 1000; // Add jitter
    return Math.min(jitteredDelay, this.options.maxDelay);
  }

  /**
   * Schedules a retry attempt
   */
  private scheduleRetry(delay: number): void {
    this.debounceTimeout = setTimeout(() => {
      this.debounceTimeout = null;
      // Don't automatically retry, let the caller decide
    }, delay);
  }

  /**
   * Schedules a token expiration check
   */
  scheduleTokenCheck(token: string): void {
    // Clear any existing scheduled check
    this.clearScheduledChecks();

    // Validate token first
    const validation = jwtValidator.safeDecodeToken(token);
    if (!validation.isValid || !validation.payload) {
      return; // Don't schedule check for invalid tokens
    }

    const expirationTime = jwtValidator.getTokenExpirationTime(validation.payload);
    if (!expirationTime) {
      return; // No expiration time available
    }

    // Schedule check 5 minutes before expiration
    const checkTime = expirationTime - (5 * 60 * 1000);
    const now = Date.now();
    const delay = checkTime - now;

    // Only schedule if the check time is in the future
    if (delay > 0) {
      this.scheduledCheckTimeout = setTimeout(() => {
        this.scheduledCheckTimeout = null;
        // Trigger refresh check (this would typically call a callback)
        this.handleScheduledTokenCheck(token);
      }, delay);
    }
  }

  /**
   * Handles scheduled token check
   */
  private handleScheduledTokenCheck(token: string): void {
    // Re-validate token at check time
    const validation = jwtValidator.safeDecodeToken(token);
    
    if (!validation.isValid) {
      // Token is now invalid, trigger refresh
      authLogger.logTokenRefresh('SCHEDULED', 'FAILED', {
        retryCount: 0,
        maxRetries: this.options.maxRetries,
        errorMessage: `Scheduled check found invalid token: ${validation.error}`,
      });

      this.refreshToken().catch(error => {
        console.error('Scheduled token refresh failed:', error);
        authLogger.logTokenRefresh('SCHEDULED', 'FAILED', {
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
          errorMessage: `Scheduled refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      });
    } else if (validation.errorType === 'EXPIRED') {
      // Token is expired, trigger refresh
      authLogger.logTokenRefresh('EXPIRED', 'FAILED', {
        retryCount: 0,
        maxRetries: this.options.maxRetries,
        errorMessage: 'Scheduled check found expired token',
      });

      this.refreshToken().catch(error => {
        console.error('Scheduled token refresh for expired token failed:', error);
        authLogger.logTokenRefresh('EXPIRED', 'FAILED', {
          retryCount: this.retryCount,
          maxRetries: this.options.maxRetries,
          errorMessage: `Expired token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      });
    }
    // If token is still valid, it will be checked again at next scheduled time
  }

  /**
   * Clears all scheduled token checks
   */
  clearScheduledChecks(): void {
    if (this.scheduledCheckTimeout) {
      clearTimeout(this.scheduledCheckTimeout);
      this.scheduledCheckTimeout = null;
    }
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Resets the refresh manager state
   */
  reset(): void {
    this.clearScheduledChecks();
    this.refreshPromise = null;
    this._isRefreshInProgress = false;
    this.retryCount = 0;
    this.lastRefreshAttempt = 0;
  }
}

/**
 * Creates a new token refresh manager instance
 */
export function createTokenRefreshManager(
  refreshFunction: () => Promise<string>,
  options?: TokenRefreshOptions
): TokenRefreshManager {
  return new TokenRefreshManagerImpl(refreshFunction, options);
}

// Export default factory function
export { createTokenRefreshManager as default };