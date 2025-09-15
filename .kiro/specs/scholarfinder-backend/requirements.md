# Requirements Document
 
## Introduction
 
ScholarFinder is a comprehensive tool for analyzing manuscripts and recommending suitable peer reviewers by extracting metadata, generating keywords/search strings, querying multiple scholarly databases, validating authors, and providing a shortlist for export. The backend system provides REST APIs that integrate with an existing React frontend to deliver a step-by-step workflow for manuscript analysis and reviewer recommendation.
 
## Requirements
 
### Requirement 1: Manuscript Processing and Metadata Extraction
 
**User Story:** As a researcher, I want to upload a manuscript file so that the system can extract relevant metadata for reviewer recommendation.
 
#### Acceptance Criteria
 
1. WHEN a user uploads a Word/PDF/Docx file THEN the system SHALL extract title, authors, affiliations, abstract, and keywords
2. WHEN metadata extraction is complete THEN the system SHALL return structured data including title, authors with affiliations, abstract, original keywords, and primary/secondary focus areas
3. IF file upload fails THEN the system SHALL return appropriate error messages with file format requirements
4. WHEN processing large files THEN the system SHALL complete extraction within 30 seconds
 
### Requirement 2: Author and Affiliation Management
 
**User Story:** As a researcher, I want to view and edit extracted author information so that I can ensure accuracy before proceeding with reviewer search.
 
#### Acceptance Criteria
 
1. WHEN authors are extracted THEN the system SHALL provide separate endpoints for authors and affiliations
2. WHEN author data is requested THEN the system SHALL return structured author information with names, emails, and affiliation mappings
3. WHEN affiliation data is requested THEN the system SHALL return institution names, addresses, and country information
4. IF author extraction encounters ambiguous data THEN the system SHALL flag uncertain entries for user review
5. WHEN user edits author information THEN the system SHALL validate and store the updated data
 
### Requirement 3: Keyword Enhancement and Search String Generation
 
**User Story:** As a researcher, I want the system to generate enhanced keywords and database-specific search strings so that I can find the most relevant potential reviewers.
 
#### Acceptance Criteria
 
1. WHEN keyword generation is requested THEN the system SHALL provide additional relevant keywords beyond those in the original manuscript
2. WHEN MeSH terms are requested THEN the system SHALL return medical subject headings related to the manuscript content
3. WHEN search strings are generated THEN the system SHALL create Boolean search queries optimized for PubMed, Elsevier, Wiley, and Taylor & Francis databases
4. WHEN keywords are presented THEN the system SHALL allow users to select and deselect individual keywords
5. IF keyword generation fails THEN the system SHALL fall back to using original manuscript keywords
 
### Requirement 4: Multi-Database Author Extraction
 
**User Story:** As a researcher, I want the system to search multiple scholarly databases simultaneously so that I can get a comprehensive pool of potential reviewers.
 
#### Acceptance Criteria
 
1. WHEN database search is initiated THEN the system SHALL query PubMed, Elsevier, Wiley, and Taylor & Francis databases in parallel
2. WHEN each database search completes THEN the system SHALL report progress and author count found per database
3. WHEN all searches complete THEN the system SHALL aggregate candidate authors from all databases into a unified pool
4. IF a database is unavailable THEN the system SHALL continue with available databases and report the issue
 
### Requirement 5: Manual Reviewer Search and Management
 
**User Story:** As a researcher, I want to manually add or remove potential reviewers by name or email so that I can include specific experts I know.
 
#### Acceptance Criteria
 
1. WHEN a user searches for reviewers by name THEN the system SHALL return matching author profiles from the databases
2. WHEN a user searches by email THEN the system SHALL find corresponding author records
3. WHEN a user adds a manual reviewer THEN the system SHALL include them in the candidate pool for validation
4. WHEN a user removes a reviewer THEN the system SHALL exclude them from further processing
5. IF manual search returns no results THEN the system SHALL suggest alternative search terms
 
### Requirement 6: Author Validation and Filtering
 
**User Story:** As a researcher, I want the system to validate potential reviewers against conflict of interest rules so that I get ethically appropriate reviewer recommendations.
 
#### Acceptance Criteria
 
1. WHEN author validation runs THEN the system SHALL exclude manuscript authors and their co-authors
2. WHEN checking retractions THEN the system SHALL flag authors with retracted publications
3. WHEN applying publication thresholds THEN the system SHALL filter authors based on minimum publication counts
4. WHEN checking affiliations THEN the system SHALL identify potential institutional conflicts
5. WHEN validation completes THEN the system SHALL provide step-by-step validation results with checkmarks and crosses
6. IF validation rules are updated THEN the system SHALL re-validate the entire candidate pool
 
### Requirement 7: Reviewer Recommendation and Filtering
 
**User Story:** As a researcher, I want to view validated reviewers in a sortable table with filtering options so that I can select the most appropriate reviewers.
 
#### Acceptance Criteria
 
1. WHEN displaying recommendations THEN the system SHALL show name, affiliation, country, email, publication count, clinical trials, retractions, and relevant publications
2. WHEN filters are applied THEN the system SHALL update the recommendation table in real-time
3. WHEN sorting is requested THEN the system SHALL order results by the selected column
4. WHEN threshold filters change THEN the system SHALL re-filter the results accordingly
5. IF no reviewers meet the criteria THEN the system SHALL suggest relaxing filter parameters
 
### Requirement 8: Reviewer Profile and Network Analysis
 
**User Story:** As a researcher, I want to view detailed reviewer profiles so that I can assess their expertise and research network.
 
#### Acceptance Criteria
 
1. WHEN a reviewer profile is requested THEN the system SHALL return research areas, MeSH terms, and publication history
2. WHEN research network is requested THEN the system SHALL provide co-author relationships and collaboration patterns
3. WHEN profile data is displayed THEN the system SHALL include publication titles, journals, and citation metrics
4. IF profile data is incomplete THEN the system SHALL indicate missing information clearly
5. WHEN network analysis completes THEN the system SHALL highlight potential conflicts through shared collaborations
 
### Requirement 9: Shortlist Management and Export
 
**User Story:** As a researcher, I want to create a shortlist of selected reviewers and export it in multiple formats so that I can submit it to journals or funding agencies.
 
#### Acceptance Criteria
 
1. WHEN users select reviewers THEN the system SHALL maintain a shortlist with selected reviewer details
2. WHEN export is requested THEN the system SHALL generate files in CSV, XLSX, and Word formats
3. WHEN exporting to CSV THEN the system SHALL include all relevant reviewer data in structured columns
4. WHEN exporting to XLSX THEN the system SHALL format data with headers and proper cell formatting
5. WHEN exporting to Word THEN the system SHALL create a formatted document with reviewer profiles
6. IF export fails THEN the system SHALL provide error details and retry options
 
### Requirement 10: User Process Management
 
**User Story:** As a researcher, I want to view all my manuscript analysis processes so that I can track progress and return to previous work.
 
#### Acceptance Criteria
 
1. WHEN user dashboard is accessed THEN the system SHALL display all processes started by the user
2. WHEN process details are requested THEN the system SHALL show current step, completion status, and metadata
3. WHEN processes are listed THEN the system SHALL include creation date, manuscript title, and current status
4. IF a process is incomplete THEN the system SHALL allow users to resume from the last completed step
5. WHEN process data is requested THEN the system SHALL return results within 2 seconds
 
### Requirement 11: User Activity Logging
 
**User Story:** As a researcher, I want to see a timeline of my actions so that I can track what I've done and when.
 
#### Acceptance Criteria
 
1. WHEN user logs are requested THEN the system SHALL return chronological activity with timestamps
2. WHEN actions are logged THEN the system SHALL record action type, timestamp, and relevant details
3. WHEN displaying logs THEN the system SHALL format timestamps in user-friendly format
4. IF log data is extensive THEN the system SHALL implement pagination for performance
5. WHEN sensitive actions occur THEN the system SHALL log them with appropriate detail level
 
### Requirement 12: Administrative Oversight
 
**User Story:** As an administrator, I want to view all user processes and logs so that I can monitor system usage and provide support.
 
#### Acceptance Criteria
 
1. WHEN admin accesses user processes THEN the system SHALL display all users' manuscript analysis processes
2. WHEN admin requests user logs THEN the system SHALL provide comprehensive activity logs for all users
3. WHEN admin views are accessed THEN the system SHALL require appropriate authentication and authorization
4. IF admin queries large datasets THEN the system SHALL implement efficient pagination and filtering
5. WHEN admin data is displayed THEN the system SHALL protect sensitive user information appropriately
 