/**
 * Token Refresh Manager Tests
 */

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { TokenRefreshManagerImpl, createTokenRefreshManager } from '../tokenRefreshManager';

// Mock the JWT validator
vi.mock('../jwtValidator', () => ({
    jwtValidator: {
        safeDecodeToken: vi.fn(),
        getTokenExpirationTime: vi.fn(),
    }
}));

import { jwtValidator } from '../jwtValidator';

describe('TokenRefreshManager', () => {
    let mockRefreshFunction: MockedFunction<() => Promise<string>>;
    let manager: TokenRefreshManagerImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockRefreshFunction = vi.fn<[], Promise<string>>();
        manager = new TokenRefreshManagerImpl(mockRefreshFunction, {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            debounceMs: 500
        });

        // Setup default JWT validator mocks
        vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
            isValid: true,
            payload: { exp: Math.floor(Date.now() / 1000) + 3600 } // 1 hour from now
        });

        vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(Date.now() + 3600000); // 1 hour from now
    });

    afterEach(() => {
        vi.useRealTimers();
        manager.reset();
    });

    describe('refreshToken', () => {
        it('should successfully refresh token', async () => {
            const newToken = 'new.jwt.token';
            mockRefreshFunction.mockResolvedValue(newToken);

            const result = await manager.refreshToken();

            expect(result.success).toBe(true);
            expect(result.token).toBe(newToken);
            expect(result.error).toBeUndefined();
            expect(mockRefreshFunction).toHaveBeenCalledOnce();
        });

        it('should prevent multiple simultaneous refresh attempts', async () => {
            const newToken = 'new.jwt.token';
            mockRefreshFunction.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve(newToken), 1000))
            );

            // Start multiple refresh attempts
            const promise1 = manager.refreshToken();
            const promise2 = manager.refreshToken();
            const promise3 = manager.refreshToken();

            expect(manager.isRefreshInProgress).toBe(true);

            // Advance timers to complete the refresh
            vi.advanceTimersByTime(1000);

            const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

            // All should return the same result
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            expect(result1.success).toBe(true);
            expect(result1.token).toBe(newToken);

            // Refresh function should only be called once
            expect(mockRefreshFunction).toHaveBeenCalledOnce();
            expect(manager.isRefreshInProgress).toBe(false);
        });

        it('should implement debouncing for frequent refresh attempts', async () => {
            mockRefreshFunction.mockResolvedValue('token1');

            // First refresh should succeed
            const result1 = await manager.refreshToken();
            expect(result1.success).toBe(true);

            // Immediate second refresh should be debounced
            const result2 = await manager.refreshToken();
            expect(result2.success).toBe(false);
            expect(result2.error).toContain('debounced');
            expect(result2.shouldRetry).toBe(false);

            // After debounce period, refresh should work again
            vi.advanceTimersByTime(600); // More than debounceMs (500)

            mockRefreshFunction.mockResolvedValue('token2');
            const result3 = await manager.refreshToken();
            expect(result3.success).toBe(true);
            expect(result3.token).toBe('token2');
        });

        it('should handle refresh function errors with retry logic', async () => {
            const error = new Error('Network error');
            mockRefreshFunction.mockRejectedValue(error);

            const result = await manager.refreshToken();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            expect(result.shouldRetry).toBe(true);
            expect(mockRefreshFunction).toHaveBeenCalledOnce();
        });

        it('should implement exponential backoff for retries', async () => {
            const error = new Error('Network error');
            mockRefreshFunction.mockRejectedValue(error);

            // First attempt
            const result1 = await manager.refreshToken();
            expect(result1.shouldRetry).toBe(true);

            // Advance time to allow retry
            vi.advanceTimersByTime(600);

            // Second attempt
            const result2 = await manager.refreshToken();
            expect(result2.shouldRetry).toBe(true);

            // Advance time to allow retry
            vi.advanceTimersByTime(600);

            // Third attempt
            const result3 = await manager.refreshToken();
            expect(result3.shouldRetry).toBe(true);

            // Advance time to allow retry
            vi.advanceTimersByTime(600);

            // Fourth attempt (should exceed max retries)
            const result4 = await manager.refreshToken();
            expect(result4.shouldRetry).toBe(false);

            expect(mockRefreshFunction).toHaveBeenCalledTimes(4);
        });

        it('should validate received token from refresh function', async () => {
            const invalidToken = 'invalid.token';
            mockRefreshFunction.mockResolvedValue(invalidToken);

            // Mock JWT validator to return invalid for this token
            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: false,
                error: 'Invalid token format',
                errorType: 'INVALID_FORMAT'
            });

            const result = await manager.refreshToken();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Received invalid token from refresh');
            expect(result.shouldRetry).toBe(true);
        });

        it('should reset retry count on successful refresh', async () => {
            const error = new Error('Network error');

            // First few attempts fail
            mockRefreshFunction
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValue('success.token');

            // First failure
            vi.advanceTimersByTime(600);
            await manager.refreshToken();

            // Second failure  
            vi.advanceTimersByTime(600);
            await manager.refreshToken();

            // Success - should reset retry count
            vi.advanceTimersByTime(600);
            const successResult = await manager.refreshToken();
            expect(successResult.success).toBe(true);

            // Next failure should start retry count from 0 again
            mockRefreshFunction.mockRejectedValue(error);
            vi.advanceTimersByTime(600);
            const nextResult = await manager.refreshToken();
            expect(nextResult.shouldRetry).toBe(true);
        });
    });

    describe('scheduleTokenCheck', () => {
        it('should schedule token check for valid token', () => {
            const token = 'valid.jwt.token';
            const expirationTime = Date.now() + 3600000; // 1 hour from now

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { exp: Math.floor(expirationTime / 1000) }
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(expirationTime);

            manager.scheduleTokenCheck(token);

            // Should have scheduled a timeout
            expect(vi.getTimerCount()).toBeGreaterThan(0);
        });

        it('should not schedule check for invalid token', () => {
            const token = 'invalid.token';

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: false,
                error: 'Invalid format',
                errorType: 'INVALID_FORMAT'
            });

            manager.scheduleTokenCheck(token);

            // Should not have scheduled any timeout
            expect(vi.getTimerCount()).toBe(0);
        });

        it('should not schedule check for token without expiration', () => {
            const token = 'valid.jwt.token';

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { sub: 'user123' } // No exp claim
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(null);

            manager.scheduleTokenCheck(token);

            // Should not have scheduled any timeout
            expect(vi.getTimerCount()).toBe(0);
        });

        it('should not schedule check for already expired token', () => {
            const token = 'expired.jwt.token';
            const pastTime = Date.now() - 3600000; // 1 hour ago

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { exp: Math.floor(pastTime / 1000) }
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(pastTime);

            manager.scheduleTokenCheck(token);

            // Should not have scheduled any timeout for past expiration
            expect(vi.getTimerCount()).toBe(0);
        });

        it('should clear previous scheduled check when scheduling new one', () => {
            const token1 = 'token1.jwt.token';
            const token2 = 'token2.jwt.token';
            const futureTime = Date.now() + 3600000;

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { exp: Math.floor(futureTime / 1000) }
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(futureTime);

            // Schedule first check
            manager.scheduleTokenCheck(token1);
            const firstTimerCount = vi.getTimerCount();

            // Schedule second check
            manager.scheduleTokenCheck(token2);
            const secondTimerCount = vi.getTimerCount();

            // Should still have only one timer (previous was cleared)
            expect(secondTimerCount).toBe(firstTimerCount);
        });
    });

    describe('clearScheduledChecks', () => {
        it('should clear all scheduled timeouts', () => {
            const token = 'valid.jwt.token';
            const futureTime = Date.now() + 3600000;

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { exp: Math.floor(futureTime / 1000) }
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(futureTime);

            // Schedule a check
            manager.scheduleTokenCheck(token);
            expect(vi.getTimerCount()).toBeGreaterThan(0);

            // Clear scheduled checks
            manager.clearScheduledChecks();
            expect(vi.getTimerCount()).toBe(0);
        });
    });

    describe('reset', () => {
        it('should reset all manager state', async () => {
            const token = 'valid.jwt.token';
            const futureTime = Date.now() + 3600000;

            vi.mocked(jwtValidator.safeDecodeToken).mockReturnValue({
                isValid: true,
                payload: { exp: Math.floor(futureTime / 1000) }
            });
            vi.mocked(jwtValidator.getTokenExpirationTime).mockReturnValue(futureTime);

            // Set up some state
            manager.scheduleTokenCheck(token);
            mockRefreshFunction.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('token'), 1000))
            );

            // Start a refresh (but don't wait for it)
            const refreshPromise = manager.refreshToken();
            expect(manager.isRefreshInProgress).toBe(true);

            // Reset should clear everything
            manager.reset();

            expect(manager.isRefreshInProgress).toBe(false);
            expect(vi.getTimerCount()).toBe(0);

            // The original refresh promise should still resolve
            vi.advanceTimersByTime(1000);
            await refreshPromise;
        });
    });

    describe('createTokenRefreshManager factory', () => {
        it('should create a new manager instance', () => {
            const refreshFn = vi.fn().mockResolvedValue('token');
            const manager = createTokenRefreshManager(refreshFn);

            expect(manager).toBeDefined();
            expect(manager.isRefreshInProgress).toBe(false);
        });

        it('should accept options', () => {
            const refreshFn = vi.fn().mockResolvedValue('token');
            const options = {
                maxRetries: 5,
                baseDelay: 2000,
                debounceMs: 1000
            };

            const manager = createTokenRefreshManager(refreshFn, options);
            expect(manager).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle refresh function that throws synchronously', async () => {
            mockRefreshFunction.mockImplementation(() => {
                throw new Error('Synchronous error');
            });

            const result = await manager.refreshToken();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Synchronous error');
            expect(result.shouldRetry).toBe(true);
        });

        it('should handle refresh function that returns non-string', async () => {
            mockRefreshFunction.mockResolvedValue(null as any);

            const result = await manager.refreshToken();

            expect(result.success).toBe(false);
            expect(result.error).toContain('Received invalid token from refresh');
        });

        it('should handle concurrent refresh and reset', async () => {
            mockRefreshFunction.mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve('token'), 1000))
            );

            // Start refresh
            const refreshPromise = manager.refreshToken();
            expect(manager.isRefreshInProgress).toBe(true);

            // Reset while refresh is in progress
            manager.reset();
            expect(manager.isRefreshInProgress).toBe(false);

            // Original refresh should still complete
            vi.advanceTimersByTime(1000);
            const result = await refreshPromise;
            expect(result.success).toBe(true);
        });
    });
});