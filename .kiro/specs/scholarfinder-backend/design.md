# ScholarFinder Backend Design Document

## Overview

The ScholarFinder backend is a REST API service that provides manuscript analysis and peer reviewer recommendation capabilities. The system integrates with multiple scholarly databases to extract potential reviewers, validates them against conflict of interest rules, and provides a comprehensive workflow for researchers to find suitable peer reviewers.

The backend serves a React frontend through RESTful endpoints, managing the complete lifecycle from manuscript upload to reviewer shortlist export. The system is designed to handle concurrent database queries, large file processing, and complex validation workflows while maintaining performance and reliability.

## Architecture

### System Architecture

The backend follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API Layer                           │
│  (Express.js routes, middleware, request/response handling) │
├─────────────────────────────────────────────────────────────┤
│                   Service Layer                             │
│     (Business logic, workflow orchestration)               │
├─────────────────────────────────────────────────────────────┤
│                Integration Layer                            │
│  (Database adapters, external API clients, file processors)│
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                │
│        (Database models, repositories, caching)            │
└─────────────────────────────────────────────────────────────┘
```

**Design Rationale**: The layered architecture ensures maintainability and testability by separating API concerns from business logic and data access. This allows for easier testing of individual components and flexibility in changing underlying implementations.

### Technology Stack

- **Runtime**: Node.js with TypeScript for type safety and developer experience
- **Web Framework**: Express.js for REST API implementation
- **Database**: SQLite for lightweight, file-based relational data storage
- **ORM**: Prisma or TypeORM for database operations and migrations
- **File Processing**: Libraries for PDF/Word document parsing (pdf-parse, mammoth)
- **External APIs**: HTTP clients for scholarly database integration
- **Validation**: Joi or Zod for request validation
- **Authentication**: JWT tokens with local user management

**Design Rationale**: TypeScript provides compile-time type checking reducing runtime errors. SQLite offers ACID compliance and relational capabilities while being lightweight and requiring no external database server. Express.js provides a mature, well-documented framework for REST APIs.

## Components and Interfaces

### Core Services

#### 1. Manuscript Processing Service
```typescript
interface ManuscriptProcessingService {
  extractMetadata(file: Buffer, mimeType: string): Promise<ManuscriptMetadata>
  validateFile(file: Buffer, mimeType: string): Promise<ValidationResult>
}

interface ManuscriptMetadata {
  title: string
  authors: Author[]
  affiliations: Affiliation[]
  abstract: string
  keywords: string[]
  primaryFocusAreas: string[]
  secondaryFocusAreas: string[]
}
```

**Design Rationale**: Separates file processing concerns from business logic. Uses Buffer for efficient binary data handling and supports multiple file formats through mime type detection.

#### 2. Database Integration Service
```typescript
interface DatabaseIntegrationService {
  searchAuthors(searchTerms: SearchTerms): Promise<DatabaseSearchResult[]>
  searchByName(name: string): Promise<Author[]>
  searchByEmail(email: string): Promise<Author[]>
}

interface SearchTerms {
  keywords: string[]
  meshTerms: string[]
  booleanQueries: Record<DatabaseType, string>
}

enum DatabaseType {
  PUBMED = 'pubmed',
  ELSEVIER = 'elsevier',
  WILEY = 'wiley',
  TAYLOR_FRANCIS = 'taylor_francis'
}
```

**Design Rationale**: Abstracts database-specific implementations behind a common interface. Supports parallel querying and database-specific search optimization while maintaining a unified result format.

#### 3. Author Validation Service
```typescript
interface AuthorValidationService {
  validateAuthors(candidates: Author[], manuscript: ManuscriptMetadata): Promise<ValidationResult[]>
  checkConflictsOfInterest(candidate: Author, manuscriptAuthors: Author[]): Promise<ConflictCheck>
  checkRetractions(author: Author): Promise<RetractionCheck>
  applyPublicationThresholds(authors: Author[], thresholds: PublicationThresholds): Promise<Author[]>
}

interface ValidationResult {
  author: Author
  passed: boolean
  conflicts: ConflictType[]
  retractionFlags: RetractionFlag[]
  publicationMetrics: PublicationMetrics
}
```

**Design Rationale**: Centralizes all validation logic in a single service. Provides detailed validation results for transparency and allows for configurable validation rules.

#### 4. Keyword Enhancement Service
```typescript
interface KeywordEnhancementService {
  generateEnhancedKeywords(manuscript: ManuscriptMetadata): Promise<string[]>
  extractMeshTerms(content: string): Promise<string[]>
  generateSearchStrings(keywords: string[], database: DatabaseType): Promise<string>
}
```

**Design Rationale**: Separates keyword processing from manuscript analysis. Supports database-specific search string optimization and allows for future integration with AI-based keyword enhancement.

### Data Models

#### Core Entities
```typescript
interface Process {
  id: string
  userId: string
  title: string
  status: ProcessStatus
  currentStep: ProcessStep
  createdAt: Date
  updatedAt: Date
  metadata: ProcessMetadata
}

interface Author {
  id: string
  name: string
  email?: string
  affiliations: Affiliation[]
  publicationCount: number
  clinicalTrials: number
  retractions: number
  researchAreas: string[]
  meshTerms: string[]
}

interface Affiliation {
  id: string
  institutionName: string
  department?: string
  address: string
  country: string
}

interface Shortlist {
  id: string
  processId: string
  selectedAuthors: Author[]
  createdAt: Date
  exportFormats: ExportFormat[]
}
```

**Design Rationale**: Uses UUIDs for global uniqueness across distributed systems. Separates authors and affiliations to handle many-to-many relationships. Includes audit fields for tracking and debugging.

### API Endpoints

#### Process Management
```
POST   /api/processes                    # Create new process
GET    /api/processes                    # List user processes
GET    /api/processes/:id                # Get process details
PUT    /api/processes/:id/step           # Update process step
DELETE /api/processes/:id                # Delete process
```

#### Manuscript Processing
```
POST   /api/processes/:id/upload         # Upload manuscript
GET    /api/processes/:id/metadata       # Get extracted metadata
PUT    /api/processes/:id/metadata       # Update metadata
```

#### Author Management
```
GET    /api/processes/:id/authors        # Get extracted authors
PUT    /api/processes/:id/authors        # Update authors
GET    /api/processes/:id/affiliations   # Get affiliations
PUT    /api/processes/:id/affiliations   # Update affiliations
```

#### Search and Validation
```
POST   /api/processes/:id/search         # Initiate database search
GET    /api/processes/:id/search/status  # Get search progress
POST   /api/processes/:id/validate       # Run author validation
GET    /api/processes/:id/candidates     # Get validated candidates
```

#### Recommendations and Export
```
GET    /api/processes/:id/recommendations # Get filtered recommendations
POST   /api/processes/:id/shortlist      # Create shortlist
GET    /api/processes/:id/export/:format # Export shortlist
```

**Design Rationale**: RESTful design with resource-based URLs. Process-scoped endpoints ensure data isolation. Separate endpoints for different concerns allow for granular permissions and caching strategies.

## Data Models

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Processes Table
```sql
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step TEXT NOT NULL,
  metadata TEXT, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Authors Table
```sql
CREATE TABLE authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  publication_count INTEGER DEFAULT 0,
  clinical_trials INTEGER DEFAULT 0,
  retractions INTEGER DEFAULT 0,
  research_areas TEXT, -- JSON array as string
  mesh_terms TEXT, -- JSON array as string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Process Authors Junction Table
```sql
CREATE TABLE process_authors (
  id TEXT PRIMARY KEY,
  process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES authors(id),
  role TEXT NOT NULL, -- 'manuscript_author', 'candidate', 'shortlisted'
  validation_status TEXT, -- JSON string
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Design Rationale**: Uses TEXT for IDs (UUIDs as strings) and JSON strings for complex data while maintaining relational integrity. Junction tables support many-to-many relationships with additional context. Timestamps enable audit trails and temporal queries.

## Error Handling

### Error Classification
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

interface ApiError {
  type: ErrorType
  message: string
  details?: any
  timestamp: Date
  requestId: string
}
```

### Error Handling Strategy

1. **Input Validation**: Use schema validation middleware to catch malformed requests early
2. **Database Errors**: Implement connection pooling and retry logic for transient failures
3. **External API Failures**: Circuit breaker pattern for external database APIs with fallback strategies
4. **File Processing Errors**: Detailed error messages for unsupported formats or corrupted files
5. **Rate Limiting**: Implement exponential backoff for external API calls

**Design Rationale**: Structured error handling provides consistent API responses and enables better debugging. Circuit breakers prevent cascade failures when external services are unavailable.

## Testing Strategy

### Unit Testing
- **Services**: Mock external dependencies and test business logic in isolation
- **Utilities**: Test file processing, validation, and data transformation functions
- **Models**: Test data validation and serialization logic

### Integration Testing
- **API Endpoints**: Test complete request/response cycles with test database
- **Database Operations**: Test complex queries and transaction handling
- **External APIs**: Use mock servers to simulate database responses

### End-to-End Testing
- **Complete Workflows**: Test full manuscript processing pipeline
- **Error Scenarios**: Test system behavior under various failure conditions
- **Performance**: Load testing for concurrent users and large file processing

### Testing Tools
- **Jest**: Unit and integration testing framework
- **Supertest**: HTTP assertion library for API testing
- **Docker**: Containerized test environments for consistency
- **Mock Service Worker**: API mocking for external dependencies

**Design Rationale**: Comprehensive testing strategy ensures reliability across all system layers. Mocking external dependencies allows for predictable testing while Docker ensures consistent test environments across development and CI/CD.

### Performance Considerations

1. **File Processing**: Stream-based processing for large documents to minimize memory usage
2. **Database Queries**: Implement connection pooling and query optimization
3. **External API Calls**: Parallel processing with rate limiting and caching
4. **Response Caching**: Cache frequently accessed data like author profiles
5. **Pagination**: Implement cursor-based pagination for large result sets

**Design Rationale**: Performance optimizations focus on the most resource-intensive operations: file processing and external API calls. Streaming and parallel processing maximize throughput while respecting external service limits.