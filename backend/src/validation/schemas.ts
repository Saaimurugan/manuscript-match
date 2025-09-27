import Joi from 'joi';
import { ProcessStatus, ProcessStep, AuthorRole, DatabaseType, UserRole, UserStatus } from '../types';

// Base validation schemas
export const uuidSchema = Joi.string().uuid().required();
export const emailSchema = Joi.string().email().required();
export const optionalEmailSchema = Joi.string().email().optional();

// User validation schemas
export const createUserSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().min(8).required(),
});

export const updateUserSchema = Joi.object({
  email: emailSchema.optional(),
  password: Joi.string().min(8).optional(),
}).min(1);

export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

export const registerSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().min(8).required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

// Process validation schemas
export const createProcessSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  description: Joi.string().min(1).max(1000).optional(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  currentStep: Joi.string().valid(...Object.values(ProcessStep)).optional(),
  metadata: Joi.string().optional(),
});

export const updateProcessSchema = Joi.object({
  title: Joi.string().min(1).max(500).optional(),
  description: Joi.string().min(1).max(1000).optional(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  currentStep: Joi.string().valid(...Object.values(ProcessStep)).optional(),
  metadata: Joi.string().optional(),
}).min(1);

export const updateProcessStepSchema = Joi.object({
  step: Joi.string().valid(...Object.values(ProcessStep)).required(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
});

// Affiliation validation schemas (defined before author schemas to avoid circular dependency)
export const createAffiliationSchema = Joi.object({
  institutionName: Joi.string().min(1).max(300).required(),
  department: Joi.string().max(200).optional(),
  address: Joi.string().min(1).max(500).required(),
  country: Joi.string().min(1).max(100).required(),
});

// Author validation schemas
export const createAuthorSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  email: optionalEmailSchema,
  publicationCount: Joi.number().integer().min(0).optional(),
  clinicalTrials: Joi.number().integer().min(0).optional(),
  retractions: Joi.number().integer().min(0).optional(),
  researchAreas: Joi.array().items(Joi.string()).optional(),
  meshTerms: Joi.array().items(Joi.string()).optional(),
});

export const createAuthorWithAffiliationsSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  email: optionalEmailSchema,
  publicationCount: Joi.number().integer().min(0).optional(),
  clinicalTrials: Joi.number().integer().min(0).optional(),
  retractions: Joi.number().integer().min(0).optional(),
  researchAreas: Joi.array().items(Joi.string()).optional(),
  meshTerms: Joi.array().items(Joi.string()).optional(),
  affiliations: Joi.array().items(createAffiliationSchema).optional(),
});

export const updateAuthorSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  email: optionalEmailSchema,
  publicationCount: Joi.number().integer().min(0).optional(),
  clinicalTrials: Joi.number().integer().min(0).optional(),
  retractions: Joi.number().integer().min(0).optional(),
  researchAreas: Joi.array().items(Joi.string()).optional(),
  meshTerms: Joi.array().items(Joi.string()).optional(),
}).min(1);

export const authorSearchSchema = Joi.object({
  name: Joi.string().min(1).optional(),
  email: Joi.string().email().optional(),
  minPublications: Joi.number().integer().min(0).optional(),
  maxRetractions: Joi.number().integer().min(0).optional(),
  researchArea: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const updateAffiliationSchema = Joi.object({
  institutionName: Joi.string().min(1).max(300).optional(),
  department: Joi.string().max(200).optional(),
  address: Joi.string().min(1).max(500).optional(),
  country: Joi.string().min(1).max(100).optional(),
}).min(1);

export const affiliationSearchSchema = Joi.object({
  institutionName: Joi.string().min(1).optional(),
  country: Joi.string().min(1).optional(),
  department: Joi.string().min(1).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// ProcessAuthor validation schemas
export const createProcessAuthorSchema = Joi.object({
  processId: uuidSchema,
  authorId: uuidSchema,
  role: Joi.string().valid(...Object.values(AuthorRole)).required(),
  validationStatus: Joi.string().optional(),
});

export const updateProcessAuthorSchema = Joi.object({
  role: Joi.string().valid(...Object.values(AuthorRole)).optional(),
  validationStatus: Joi.string().optional(),
}).min(1);

// Manuscript metadata validation schemas
export const manuscriptMetadataSchema = Joi.object({
  title: Joi.string().min(1).max(1000).required(),
  authors: Joi.array().items(createAuthorSchema).min(1).required(),
  affiliations: Joi.array().items(createAffiliationSchema).required(),
  abstract: Joi.string().min(1).max(5000).required(),
  keywords: Joi.array().items(Joi.string().min(1)).required(),
  primaryFocusAreas: Joi.array().items(Joi.string().min(1)).required(),
  secondaryFocusAreas: Joi.array().items(Joi.string().min(1)).optional(),
});

// Search terms validation schemas
export const searchTermsSchema = Joi.object({
  keywords: Joi.array().items(Joi.string().min(1)).min(1).required(),
  meshTerms: Joi.array().items(Joi.string().min(1)).optional(),
  booleanQueries: Joi.object().pattern(
    Joi.string().valid(...Object.values(DatabaseType)),
    Joi.string().min(1)
  ).optional(),
});

// File upload validation schemas
export const fileUploadSchema = Joi.object({
  filename: Joi.string().required(),
  mimetype: Joi.string().valid(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ).required(),
  size: Joi.number().max(50 * 1024 * 1024).required(), // 50MB max
});

// Pagination validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Query parameter validation schemas
export const processQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  step: Joi.string().valid(...Object.values(ProcessStep)).optional(),
  _t: Joi.string().optional(), // Allow cache-busting timestamp parameter
}).concat(paginationSchema).unknown(true); // Allow other unknown parameters

// Export validation schemas
export const exportFormatSchema = Joi.object({
  format: Joi.string().valid('csv', 'xlsx', 'docx').required(),
});

// Validation result schemas
export const validationResultSchema = Joi.object({
  passed: Joi.boolean().required(),
  conflicts: Joi.array().items(Joi.string()).required(),
  retractionFlags: Joi.array().items(Joi.object({
    publicationTitle: Joi.string().required(),
    journal: Joi.string().required(),
    retractionDate: Joi.date().required(),
    reason: Joi.string().required(),
  })).required(),
  publicationMetrics: Joi.object({
    totalPublications: Joi.number().integer().min(0).required(),
    recentPublications: Joi.number().integer().min(0).required(),
    hIndex: Joi.number().integer().min(0).optional(),
    citationCount: Joi.number().integer().min(0).optional(),
  }).required(),
});

// Author validation configuration schema
export const validationConfigSchema = Joi.object({
  minPublications: Joi.number().integer().min(0).default(5),
  maxRetractions: Joi.number().integer().min(0).default(0),
  minRecentPublications: Joi.number().integer().min(0).default(2),
  recentYears: Joi.number().integer().min(1).max(20).default(5),
  checkInstitutionalConflicts: Joi.boolean().default(true),
  checkCoAuthorConflicts: Joi.boolean().default(true),
  collaborationYears: Joi.number().integer().min(1).max(10).default(3),
});

// Validation step result schema
export const validationStepResultSchema = Joi.object({
  stepName: Joi.string().required(),
  passed: Joi.boolean().required(),
  message: Joi.string().required(),
  details: Joi.any().optional(),
});

// Author validation result schema
export const authorValidationResultSchema = Joi.object({
  author: createAuthorSchema.required(),
  passed: Joi.boolean().required(),
  conflicts: Joi.array().items(Joi.string().valid('manuscript_author', 'co_author', 'institutional', 'recent_collaboration')).required(),
  retractionFlags: Joi.array().items(Joi.object({
    publicationTitle: Joi.string().required(),
    journal: Joi.string().required(),
    retractionDate: Joi.date().required(),
    reason: Joi.string().required(),
  })).required(),
  publicationMetrics: Joi.object({
    totalPublications: Joi.number().integer().min(0).required(),
    recentPublications: Joi.number().integer().min(0).required(),
    hIndex: Joi.number().integer().min(0).optional(),
    citationCount: Joi.number().integer().min(0).optional(),
  }).required(),
  validationSteps: Joi.array().items(validationStepResultSchema).required(),
});

// Process validation result schema
export const processValidationResultSchema = Joi.object({
  processId: uuidSchema,
  totalCandidates: Joi.number().integer().min(0).required(),
  validatedCandidates: Joi.number().integer().min(0).required(),
  validationResults: Joi.array().items(authorValidationResultSchema).required(),
  validationConfig: validationConfigSchema.required(),
  completedAt: Joi.date().required(),
});

// Database search result validation schemas
export const databaseSearchResultSchema = Joi.object({
  database: Joi.string().valid(...Object.values(DatabaseType)).required(),
  authors: Joi.array().items(createAuthorSchema).required(),
  totalFound: Joi.number().integer().min(0).required(),
  searchTime: Joi.number().min(0).required(),
});

// Shortlist validation schemas
export const createShortlistSchema = Joi.object({
  processId: uuidSchema,
  name: Joi.string().min(1).max(200).required(),
});

export const updateShortlistSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
}).min(1);

// Activity log validation schemas
export const createActivityLogSchema = Joi.object({
  userId: uuidSchema,
  processId: uuidSchema.optional(),
  action: Joi.string().min(1).max(100).required(),
  details: Joi.string().max(1000).optional(),
});

export const activityLogSearchSchema = Joi.object({
  userId: uuidSchema.optional(),
  processId: uuidSchema.optional(),
  action: Joi.string().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

// Admin activity log filtering schema
export const adminActivityLogFiltersSchema = Joi.object({
  userId: uuidSchema.optional(),
  processId: uuidSchema.optional(),
  action: Joi.string().min(1).optional(),
  resourceType: Joi.string().valid('user', 'process', 'permission', 'system').optional(),
  resourceId: uuidSchema.optional(),
  ipAddress: Joi.string().ip().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().min(1).max(100).optional(),
  sortBy: Joi.string().valid('timestamp', 'action', 'userId', 'resourceType').default('timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

// Activity log export schema
export const activityLogExportSchema = Joi.object({
  format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
  userId: uuidSchema.optional(),
  processId: uuidSchema.optional(),
  action: Joi.string().min(1).optional(),
  resourceType: Joi.string().valid('user', 'process', 'permission', 'system').optional(),
  resourceId: uuidSchema.optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().min(1).max(100).optional(),
});

// Recommendation filtering schemas
export const recommendationFiltersSchema = Joi.object({
  minPublications: Joi.number().integer().min(0).optional(),
  maxRetractions: Joi.number().integer().min(0).optional(),
  minClinicalTrials: Joi.number().integer().min(0).optional(),
  countries: Joi.array().items(Joi.string().min(1)).optional(),
  institutions: Joi.array().items(Joi.string().min(1)).optional(),
  researchAreas: Joi.array().items(Joi.string().min(1)).optional(),
  excludeConflicts: Joi.array().items(
    Joi.string().valid('manuscript_author', 'co_author', 'institutional', 'recent_collaboration')
  ).optional(),
  onlyValidated: Joi.boolean().optional(),
});

export const sortOptionsSchema = Joi.object({
  field: Joi.string().valid('name', 'publicationCount', 'clinicalTrials', 'retractions', 'country', 'institution').required(),
  order: Joi.string().valid('asc', 'desc').required(),
});

export const recommendationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'publicationCount', 'clinicalTrials', 'retractions', 'country', 'institution').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  minPublications: Joi.number().integer().min(0).optional(),
  maxRetractions: Joi.number().integer().min(0).optional(),
  minClinicalTrials: Joi.number().integer().min(0).optional(),
  countries: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.array().items(Joi.string().min(1))
  ).optional(),
  institutions: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.array().items(Joi.string().min(1))
  ).optional(),
  researchAreas: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.array().items(Joi.string().min(1))
  ).optional(),
  excludeConflicts: Joi.alternatives().try(
    Joi.string().valid('manuscript_author', 'co_author', 'institutional', 'recent_collaboration'),
    Joi.array().items(Joi.string().valid('manuscript_author', 'co_author', 'institutional', 'recent_collaboration'))
  ).optional(),
  onlyValidated: Joi.boolean().optional(),
  _t: Joi.string().optional(), // Allow cache-busting timestamp parameter
}).unknown(true); // Allow other unknown parameters

// Common validation helpers
export const validateId = (id: string): void => {
  const { error } = uuidSchema.validate(id);
  if (error) {
    throw new Error(`Invalid ID: ${error.message}`);
  }
};

export const validateEmail = (email: string): void => {
  // Use a more comprehensive RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error('Email cannot be empty');
  }
  
  if (trimmedEmail.length > 254) {
    throw new Error('Email is too long (maximum 254 characters)');
  }
  
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('Invalid email format');
  }
  
  // Additional checks for common edge cases
  const [localPart, domain] = trimmedEmail.split('@');
  
  if (localPart && localPart.length > 64) {
    throw new Error('Email local part is too long (maximum 64 characters)');
  }
  
  if (domain && domain.length > 253) {
    throw new Error('Email domain is too long (maximum 253 characters)');
  }
  
  // Check for consecutive dots
  if (trimmedEmail.includes('..')) {
    throw new Error('Email cannot contain consecutive dots');
  }
  
  // Check for dots at the beginning or end of local part
  if (localPart && (localPart.startsWith('.') || localPart.endsWith('.'))) {
    throw new Error('Email local part cannot start or end with a dot');
  }
};

export const validatePagination = (page?: number, limit?: number) => {
  const { error, value } = paginationSchema.validate({ page, limit });
  if (error) {
    throw new Error(`Invalid pagination parameters: ${error.message}`);
  }
  return value;
};

// Admin validation schemas
export const adminPaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  userId: uuidSchema.optional(),
  role: Joi.string().valid('USER', 'QC', 'MANAGER', 'ADMIN').optional(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().min(1).optional(),
});

export const adminLogFiltersSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  userId: uuidSchema.optional(),
  processId: uuidSchema.optional(),
  action: Joi.string().min(1).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().min(1).optional(),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
}).custom((value, helpers) => {
  if (value.startDate && value.endDate && value.startDate > value.endDate) {
    return helpers.error('date.range', { message: 'Start date must be before end date' });
  }
  return value;
});

export const exportTypeSchema = Joi.object({
  type: Joi.string().valid('processes', 'logs', 'users').required(),
  format: Joi.string().valid('csv', 'xlsx').default('csv'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

// Admin validation helper functions
export const validatePaginationParams = (query: any) => {
  const { error, value } = adminPaginationSchema.validate(query);
  if (error) {
    throw new Error(`Invalid pagination parameters: ${error.message}`);
  }
  return value;
};

export const validateDateRange = (dateRange: { startDate?: string; endDate?: string }) => {
  const { error, value } = dateRangeSchema.validate({
    startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  });
  if (error) {
    throw new Error(`Invalid date range: ${error.message}`);
  }
  return value;
};

// Admin user management validation schemas
export const inviteUserSchema = Joi.object({
  email: emailSchema,
  role: Joi.string().valid(...Object.values(UserRole)).required(),
});

export const adminUpdateUserSchema = Joi.object({
  email: emailSchema.optional(),
  role: Joi.string().valid(...Object.values(UserRole)).optional(),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
}).min(1);

export const blockUserSchema = Joi.object({
  reason: Joi.string().max(500).optional(),
});

export const assignPermissionsSchema = Joi.object({
  permissions: Joi.array().items(uuidSchema).min(1).required(),
});

export const updateRolePermissionsSchema = Joi.object({
  permissions: Joi.array().items(uuidSchema).min(1).required(),
});

