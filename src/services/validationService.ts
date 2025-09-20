/**
 * Author validation service
 * Handles author validation with configurable rules
 */

import { apiService } from './apiService';
import type { 
  ValidationRequest, 
  ValidationResults,
  ApiResponse 
} from '../types/api';

/**
 * Validation service class for author validation
 */
class ValidationService {
  /**
   * Validate authors for a process
   */
  async validateAuthors(processId: string, request: ValidationRequest): Promise<ValidationResults> {
    const response = await apiService.post<ValidationResults>(
      `/api/processes/${processId}/validate`,
      request
    );
    return response.data;
  }

  /**
   * Get validation results for a process
   */
  async getValidationResults(processId: string): Promise<ValidationResults> {
    const response = await apiService.get<ValidationResults>(`/api/processes/${processId}/validation/results`);
    return response.data;
  }
}

// Create and export service instance
export const validationService = new ValidationService();
export default validationService;