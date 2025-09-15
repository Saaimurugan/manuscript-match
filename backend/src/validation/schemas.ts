import Joi from 'joi';
import { ProcessStatus, ProcessStep, AuthorRole, DatabaseType } from '../types';

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
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  currentStep: Joi.string().valid(...Object.values(ProcessStep)).optional(),
  metadata: Joi.string().optional(),
});

export const updateProcessSchema = Joi.object({
  title: Joi.string().min(1).max(500).optional(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
  currentStep: Joi.string().valid(...Object.values(ProcessStep)).optional(),
  metadata: Joi.string().optional(),
}).min(1);

export const updateProcessStepSchema = Joi.object({
  step: Joi.string().valid(...Object.values(ProcessStep)).required(),
  status: Joi.string().valid(...Object.values(ProcessStatus)).optional(),
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

// Affiliation validation schemas
export const createAffiliationSchema = Joi.object({
  institutionName: Joi.string().min(1).max(300).required(),
  department: Joi.string().max(200).optional(),
  address: Joi.string().min(1).max(500).required(),
  country: Joi.string().min(1).max(100).required(),
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
}).concat(paginationSchema);

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

// Common validation helpers
export const validateId = (id: string): void => {
  const { error } = uuidSchema.validate(id);
  if (error) {
    throw new Error(`Invalid ID: ${error.message}`);
  }
};

export const validateEmail = (email: string): void => {
  const { error } = emailSchema.validate(email);
  if (error) {
    throw new Error(`Invalid email: ${error.message}`);
  }
};

export const validatePagination = (page?: number, limit?: number) => {
  const { error, value } = paginationSchema.validate({ page, limit });
  if (error) {
    throw new Error(`Invalid pagination parameters: ${error.message}`);
  }
  return value;
};