/**
 * Tests for error handling utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createScholarFinderError,
  isRetryableError,
  getErrorMessage,
  logError,
  ScholarFinderErrorType
} from '../errorHandling';

describe('errorHandling utilities', () => {
  describe('createScholarFinderError', () => {
    it('should create error with correct properties', () => {
      const error = createScholarFinderError(
        ScholarFinderErrorType.FILE_FORMAT_ERROR,
        'Invalid file format',
        false,
        { fileType: 'txt' }
      );

      expect(error.type).toBe(ScholarFinderErrorType.FILE_FORMAT_ERROR);
      expect(error.message).toBe('Invalid file format');
      expect(error.retryable).toBe(false);
      expect(error.details).toEqual({ fileType: 'txt' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create retryable error with retry action', () => {
      const retryAction = vi.fn();
      const error = createScholarFinderError(
        ScholarFinderErrorType.NETWORK_ERROR,
        'Network timeout',
        true,
        undefined,
        retryAction
      );

      expect(error.retryable).toBe(true);
      expect(error.retryAction).toBe(retryAction);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors correctly', () => {
      const retryableError = createScholarFinderError(
        ScholarFinderErrorType.NETWORK_ERROR,
        'Network error',
        true
      );
      const nonRetryableError = createScholarFinderError(
        ScholarFinderErrorType.FILE_FORMAT_ERROR,
        'Invalid format',
        false
      );

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should handle non-ScholarFinder errors', () => {
      const standardError = new Error('Standard error');
      expect(isRetryableError(standardError)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message from ScholarFinder error', () => {
      const error = createScholarFinderError(
        ScholarFinderErrorType.API_ERROR,
        'API error message',
        false
      );

      expect(getErrorMessage(error)).toBe('API error message');
    });

    it('should return message from standard error', () => {
      const error = new Error('Standard error message');
      expect(getErrorMessage(error)).toBe('Standard error message');
    });

    it('should handle unknown error types', () => {
      expect(getErrorMessage('string error')).toBe('An unknown error occurred');
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = createScholarFinderError(
        ScholarFinderErrorType.VALIDATION_ERROR,
        'Validation failed',
        false
      );
      
      const context = { userId: '123', processId: 'abc' };
      
      logError(error, context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'ScholarFinder Error:',
        expect.objectContaining({
          type: ScholarFinderErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          context
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle errors without context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Standard error');
      logError(error);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error:', error);
      
      consoleSpy.mockRestore();
    });
  });
});