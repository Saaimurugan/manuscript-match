// Enums (SQLite doesn't support enums, so we define them here)
export enum ProcessStatus {
  CREATED = 'CREATED',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  SEARCHING = 'SEARCHING',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum ProcessStep {
  UPLOAD = 'UPLOAD',
  METADATA_EXTRACTION = 'METADATA_EXTRACTION',
  KEYWORD_ENHANCEMENT = 'KEYWORD_ENHANCEMENT',
  DATABASE_SEARCH = 'DATABASE_SEARCH',
  MANUAL_SEARCH = 'MANUAL_SEARCH',
  VALIDATION = 'VALIDATION',
  RECOMMENDATIONS = 'RECOMMENDATIONS',
  SHORTLIST = 'SHORTLIST',
  EXPORT = 'EXPORT',
}

export enum AuthorRole {
  MANUSCRIPT_AUTHOR = 'MANUSCRIPT_AUTHOR',
  CANDIDATE = 'CANDIDATE',
  SHORTLISTED = 'SHORTLISTED',
}

// Core domain types
export interface ManuscriptMetadata {
  title: string;
  authors: Author[];
  affiliations: Affiliation[];
  abstract: string;
  keywords: string[];
  primaryFocusAreas: string[];
  secondaryFocusAreas: string[];
}

export interface Author {
  id: string;
  name: string;
  email?: string;
  affiliations: Affiliation[];
  publicationCount: number;
  clinicalTrials: number;
  retractions: number;
  researchAreas: string[];
  meshTerms: string[];
}

export interface Affiliation {
  id: string;
  institutionName: string;
  department?: string;
  address: string;
  country: string;
}

export interface SearchTerms {
  keywords: string[];
  meshTerms: string[];
  booleanQueries: Record<DatabaseType, string>;
}

export interface KeywordEnhancementResult {
  originalKeywords: string[];
  enhancedKeywords: string[];
  meshTerms: string[];
  selectedKeywords: string[];
  searchStrings: Record<DatabaseType, string>;
}

export interface KeywordSelectionUpdate {
  keyword: string;
  selected: boolean;
}

export enum DatabaseType {
  PUBMED = 'pubmed',
  ELSEVIER = 'elsevier',
  WILEY = 'wiley',
  TAYLOR_FRANCIS = 'taylor_francis',
}

export interface DatabaseSearchResult {
  database: DatabaseType;
  authors: Author[];
  totalFound: number;
  searchTime: number;
}

export interface ValidationResult {
  author: Author;
  passed: boolean;
  conflicts: ConflictType[];
  retractionFlags: RetractionFlag[];
  publicationMetrics: PublicationMetrics;
}

export enum ConflictType {
  MANUSCRIPT_AUTHOR = 'manuscript_author',
  CO_AUTHOR = 'co_author',
  INSTITUTIONAL = 'institutional',
  RECENT_COLLABORATION = 'recent_collaboration',
}

export interface RetractionFlag {
  publicationTitle: string;
  journal: string;
  retractionDate: Date;
  reason: string;
}

export interface PublicationMetrics {
  totalPublications: number;
  recentPublications: number;
  hIndex?: number;
  citationCount?: number;
}

export interface ProcessMetadata {
  manuscriptTitle?: string;
  uploadedFileName?: string;
  extractedAt?: Date;
  searchCompletedAt?: Date;
  validationCompletedAt?: Date;
  totalCandidates?: number;
  validatedCandidates?: number;
  keywordEnhancement?: KeywordEnhancementResult;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  role?: UserRole;
  name?: string | null;
  phone?: string | null;
  department?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  USER = 'USER',
  QC = 'QC',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PENDING = 'PENDING',
  INVITED = 'INVITED',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    type: string;
    message: string;
    details?: any;
    requestId: string;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// File processing types
export interface FileProcessingResult {
  success: boolean;
  metadata?: ManuscriptMetadata;
  error?: string;
  processingTime: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Admin Management System Types
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string; // users, processes, system
  action: string; // create, read, update, delete, manage
  createdAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  grantedBy: string;
  grantedAt: Date;
  user?: AuthUser;
  permission?: Permission;
  granter?: AuthUser;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permissionId: string;
  permission?: Permission;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date | null;
  status: InvitationStatus;
  inviter?: AuthUser;
}

export interface ExtendedUser extends AuthUser {
  status: UserStatus;
  blockedAt?: Date;
  blockedBy?: string;
  invitedBy?: string;
  invitationToken?: string;
  createdAt: Date;
  updatedAt: Date;
  customPermissions?: UserPermission[];
  invitedUsers?: ExtendedUser[];
  inviter?: ExtendedUser;
  blockedByUser?: ExtendedUser;
  blockedUsers?: ExtendedUser[];
  sentInvitations?: UserInvitation[];
  grantedPermissions?: UserPermission[];
}

export interface ExtendedActivityLog {
  id: string;
  userId: string;
  processId?: string;
  action: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  timestamp: Date;
  user?: AuthUser;
  process?: any;
}



export interface UserSession {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  user?: AuthUser;
}