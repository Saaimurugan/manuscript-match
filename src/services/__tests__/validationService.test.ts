/**
 * Tests for validation service
 */

import { validationService } from '../validationService';
import { apiService } from '../apiService';
import type { ValidationRequest, ValidationResults } from '@/types/api';

// Mock the API service
jest.mock('../apiService');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockValidationResults: ValidationResults = {
  totalCandidates: 100,
  validatedReviewers: 75,
  excludedReviewers: 25,
  validationSteps: {
    manuscriptAuthors: { excluded: 5, passed: 95 },
    coAuthors: { excluded: 10, passed: 90 },
    publications: { excluded: 8, passed: 92 },
    retractions: { excluded: 2, passed: 98 },
    institutions: { excluded: 0, passed: 100 },
  },
};

const mockValidationRequest: ValidationRequest = {
  rules: {
    excludeManuscriptAuthors: true,
    excludeCoAuthors: true,
    minimumPublications: 5,
    maxRetractions: 2,
    excludeInstitutionalConflicts: true,
  },
};

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAuthors', () => {
    it('should validate authors successfully', async () => {
      mockApiService.post.mockResolvedValue({
        data: mockValidationResults,
        message: 'Validation completed',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const result = await validationService.validateAuthors('process-1', mockValidationRequest);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/processes/process-1/validate',
        mockValidationRequest
      );
      expect(result).toEqual(mockValidationResults);
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      mockApiService.post.mockRejectedValue(error);

      await expect(
        validationService.validateAuthors('process-1', mockValidationRequest)
      ).rejects.toThrow('Validation failed');

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/processes/process-1/validate',
        mockValidationRequest
      );
    });

    it('should validate with different rule configurations', async () => {
      const customRequest: ValidationRequest = {
        rules: {
          excludeManuscriptAuthors: false,
          excludeCoAuthors: true,
          minimumPublications: 10,
          maxRetractions: 0,
          excludeInstitutionalConflicts: false,
        },
      };

      mockApiService.post.mockResolvedValue({
        data: mockValidationResults,
        message: 'Validation completed',
        timestamp: '2024-01-01T00:00:00Z',
      });

      await validationService.validateAuthors('process-2', customRequest);

      expect(mockApiService.post).toHaveBeenCalledWith(
        '/api/processes/process-2/validate',
        customRequest
      );
    });
  });

  describe('getValidationResults', () => {
    it('should fetch validation results successfully', async () => {
      mockApiService.get.mockResolvedValue({
        data: mockValidationResults,
        message: 'Results retrieved',
        timestamp: '2024-01-01T00:00:00Z',
      });

      const result = await validationService.getValidationResults('process-1');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/processes/process-1/validation/results'
      );
      expect(result).toEqual(mockValidationResults);
    });

    it('should handle missing validation results', async () => {
      const error = new Error('Validation results not found');
      mockApiService.get.mockRejectedValue(error);

      await expect(
        validationService.getValidationResults('process-1')
      ).rejects.toThrow('Validation results not found');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/processes/process-1/validation/results'
      );
    });

    it('should fetch results for different processes', async () => {
      mockApiService.get.mockResolvedValue({
        data: mockValidationResults,
        message: 'Results retrieved',
        timestamp: '2024-01-01T00:00:00Z',
      });

      await validationService.getValidationResults('process-123');

      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/processes/process-123/validation/results'
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockApiService.post.mockRejectedValue(networkError);

      await expect(
        validationService.validateAuthors('process-1', mockValidationRequest)
      ).rejects.toThrow('Network error');
    });

    it('should handle API errors with status codes', async () => {
      const apiError = {
        response: {
          status: 400,
          data: { message: 'Invalid validation rules' },
        },
      };
      mockApiService.post.mockRejectedValue(apiError);

      await expect(
        validationService.validateAuthors('process-1', mockValidationRequest)
      ).rejects.toEqual(apiError);
    });
  });
});