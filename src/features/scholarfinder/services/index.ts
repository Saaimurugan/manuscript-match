// ScholarFinder Services
// Service layer for external API integration and business logic

export { 
  ScholarFinderApiService, 
  scholarFinderApiService,
  ScholarFinderErrorType,
  type ScholarFinderError 
} from './ScholarFinderApiService';

export { 
  ProcessManagementService, 
  processManagementService,
  type CreateProcessRequest,
  type UpdateProcessRequest,
  type ProcessListFilters 
} from './ProcessManagementService';