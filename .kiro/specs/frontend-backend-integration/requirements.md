# Requirements Document

## Introduction

The frontend-backend integration feature connects the existing React frontend application with the comprehensive ScholarFinder backend API. This integration replaces mock data and simulated API calls with real backend communication, enabling full manuscript analysis workflows including authentication, file upload, metadata extraction, keyword enhancement, database searches, author validation, and reviewer recommendations.

## Requirements

### Requirement 1: Authentication Integration

**User Story:** As a researcher, I want to authenticate with the backend system so that I can securely access the manuscript analysis features.

#### Acceptance Criteria

1. WHEN a user submits login credentials THEN the system SHALL authenticate against the backend `/api/auth/login` endpoint
2. WHEN authentication succeeds THEN the system SHALL store the JWT token for subsequent API requests
3. WHEN authentication fails THEN the system SHALL display appropriate error messages from the backend
4. WHEN a user logs out THEN the system SHALL call the backend `/api/auth/logout` endpoint and clear stored tokens
5. WHEN a JWT token expires THEN the system SHALL redirect the user to the login screen
6. IF the backend is unavailable THEN the system SHALL display a connection error message

### Requirement 2: Process Management Integration

**User Story:** As a researcher, I want to create and manage manuscript analysis processes so that I can track my research workflow progress.

#### Acceptance Criteria

1. WHEN a user starts a new analysis THEN the system SHALL create a new process via `/api/processes` endpoint
2. WHEN displaying user processes THEN the system SHALL fetch data from `/api/processes` endpoint
3. WHEN updating process steps THEN the system SHALL call `/api/processes/:id/step` endpoint
4. WHEN process details are requested THEN the system SHALL retrieve data from `/api/processes/:id` endpoint
5. IF process creation fails THEN the system SHALL display backend error messages to the user

### Requirement 3: File Upload and Metadata Extraction Integration

**User Story:** As a researcher, I want to upload manuscript files and extract metadata so that the system can analyze my document content.

#### Acceptance Criteria

1. WHEN a user uploads a file THEN the system SHALL send it to `/api/processes/:id/upload` endpoint
2. WHEN file upload completes THEN the system SHALL fetch extracted metadata from `/api/processes/:id/metadata` endpoint
3. WHEN metadata is displayed THEN the system SHALL show title, authors, affiliations, abstract, and keywords from the backend
4. WHEN users edit metadata THEN the system SHALL update it via `/api/processes/:id/metadata` endpoint
5. IF file upload fails THEN the system SHALL display specific error messages from the backend response

### Requirement 4: Keyword Enhancement Integration

**User Story:** As a researcher, I want to enhance keywords and generate search strings so that I can find the most relevant potential reviewers.

#### Acceptance Criteria

1. WHEN keyword enhancement is requested THEN the system SHALL call `/api/processes/:id/keywords/enhance` endpoint
2. WHEN enhanced keywords are received THEN the system SHALL display original, enhanced, and MeSH terms from the backend
3. WHEN users modify keyword selections THEN the system SHALL update selections via `/api/processes/:id/keywords/selection` endpoint
4. WHEN search strings are generated THEN the system SHALL display database-specific Boolean queries from the backend
5. IF keyword enhancement fails THEN the system SHALL fall back to original keywords and display error information

### Requirement 5: Database Search Integration

**User Story:** As a researcher, I want to search multiple scholarly databases so that I can find potential reviewers from comprehensive sources.

#### Acceptance Criteria

1. WHEN database search is initiated THEN the system SHALL call `/api/processes/:id/search` endpoint with selected keywords and databases
2. WHEN search is in progress THEN the system SHALL poll `/api/processes/:id/search/status` endpoint for progress updates
3. WHEN search completes THEN the system SHALL display progress results showing authors found per database
4. WHEN manual reviewer search is needed THEN the system SHALL use `/api/processes/:id/search/manual/name` and `/api/processes/:id/search/manual/email` endpoints
5. IF database searches fail THEN the system SHALL display which databases failed and continue with successful results

### Requirement 6: Author Validation Integration

**User Story:** As a researcher, I want to validate potential reviewers against conflict of interest rules so that I get ethically appropriate recommendations.

#### Acceptance Criteria

1. WHEN author validation is requested THEN the system SHALL call `/api/processes/:id/validate` endpoint with validation rules
2. WHEN validation completes THEN the system SHALL fetch results from `/api/processes/:id/validation/results` endpoint
3. WHEN displaying validation results THEN the system SHALL show step-by-step validation with checkmarks and crosses from the backend
4. WHEN validation rules change THEN the system SHALL re-validate by calling the validation endpoint again
5. IF validation fails THEN the system SHALL display detailed error information and allow retry

### Requirement 7: Reviewer Recommendations Integration

**User Story:** As a researcher, I want to view and filter validated reviewers so that I can select the most appropriate candidates.

#### Acceptance Criteria

1. WHEN displaying recommendations THEN the system SHALL fetch data from `/api/processes/:id/recommendations` endpoint
2. WHEN applying filters THEN the system SHALL send filter parameters to the recommendations endpoint
3. WHEN sorting results THEN the system SHALL include sort parameters in the API request
4. WHEN pagination is needed THEN the system SHALL use page and limit parameters from the backend response
5. IF no reviewers meet criteria THEN the system SHALL display backend suggestions for relaxing filters

### Requirement 8: Shortlist Management Integration

**User Story:** As a researcher, I want to create and export reviewer shortlists so that I can submit them to journals or funding agencies.

#### Acceptance Criteria

1. WHEN creating a shortlist THEN the system SHALL call `/api/processes/:id/shortlist` endpoint with selected reviewers
2. WHEN displaying shortlists THEN the system SHALL fetch data from `/api/processes/:id/shortlists` endpoint
3. WHEN exporting shortlists THEN the system SHALL download files from `/api/processes/:id/export/:format` endpoint
4. WHEN export formats are requested THEN the system SHALL support CSV, XLSX, and Word formats from the backend
5. IF export fails THEN the system SHALL display error details and provide retry options

### Requirement 9: Activity Logging Integration

**User Story:** As a researcher, I want to view my activity timeline so that I can track what actions I've performed and when.

#### Acceptance Criteria

1. WHEN activity logs are requested THEN the system SHALL fetch data from backend user activity endpoints
2. WHEN displaying activity THEN the system SHALL show chronological timeline with timestamps from the backend
3. WHEN activity data is extensive THEN the system SHALL implement pagination using backend pagination parameters
4. WHEN sensitive actions occur THEN the system SHALL display appropriate detail levels from backend logs
5. IF activity logging fails THEN the system SHALL continue functioning but log the error

### Requirement 10: Admin Dashboard Integration

**User Story:** As an administrator, I want to view system-wide data so that I can monitor usage and provide support.

#### Acceptance Criteria

1. WHEN admin accesses dashboard THEN the system SHALL fetch data from `/api/admin/processes` and `/api/admin/stats` endpoints
2. WHEN viewing user processes THEN the system SHALL display all users' processes from `/api/admin/processes` endpoint
3. WHEN accessing user logs THEN the system SHALL fetch comprehensive logs from `/api/admin/logs` endpoint
4. WHEN admin authentication is required THEN the system SHALL verify admin permissions with the backend
5. IF admin queries fail THEN the system SHALL display appropriate error messages and fallback options

### Requirement 11: Error Handling and User Experience

**User Story:** As a researcher, I want clear error messages and graceful handling of backend issues so that I can understand and resolve problems.

#### Acceptance Criteria

1. WHEN backend returns error responses THEN the system SHALL display user-friendly error messages based on error types
2. WHEN network connectivity issues occur THEN the system SHALL show connection status and retry options
3. WHEN API rate limits are exceeded THEN the system SHALL display rate limit information and wait times
4. WHEN validation errors occur THEN the system SHALL highlight specific fields and show detailed validation messages
5. IF critical errors occur THEN the system SHALL provide clear guidance on resolution steps

### Requirement 12: Performance and Caching

**User Story:** As a researcher, I want responsive application performance so that I can work efficiently without delays.

#### Acceptance Criteria

1. WHEN making API requests THEN the system SHALL implement appropriate loading states and progress indicators
2. WHEN caching is beneficial THEN the system SHALL cache non-sensitive data like metadata and search results
3. WHEN large datasets are returned THEN the system SHALL implement efficient pagination and virtual scrolling
4. WHEN multiple requests are needed THEN the system SHALL optimize by batching or parallelizing where possible
5. IF performance degrades THEN the system SHALL provide feedback about processing times and expected completion

### Requirement 13: Configuration and Environment Management

**User Story:** As a developer, I want configurable backend endpoints so that the application can work in different environments.

#### Acceptance Criteria

1. WHEN deploying to different environments THEN the system SHALL use environment-specific API base URLs
2. WHEN API endpoints change THEN the system SHALL use centralized configuration for all endpoint definitions
3. WHEN debugging is needed THEN the system SHALL support development mode with detailed API logging
4. WHEN authentication tokens are managed THEN the system SHALL use secure storage appropriate for the environment
5. IF configuration is invalid THEN the system SHALL provide clear error messages about configuration issues