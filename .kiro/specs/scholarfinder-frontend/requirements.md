# Requirements Document

## Introduction

ScholarFinder Frontend is a React-based web application that provides a user-friendly interface for the 9-step academic peer reviewer identification workflow. The application consumes external REST APIs hosted on AWS Lambda to guide researchers through manuscript upload, metadata extraction, keyword enhancement, database searching, author validation, and reviewer recommendation processes. The frontend integrates with existing backend user management and process tracking systems while providing an intuitive step-by-step interface for the complete reviewer discovery workflow.

## Requirements

### Requirement 1: Manuscript Upload and Processing Interface

**User Story:** As a researcher, I want to upload my manuscript file through a drag-and-drop interface so that I can begin the reviewer identification process.

#### Acceptance Criteria

1. WHEN a user accesses the upload page THEN the system SHALL display a drag-and-drop file upload area supporting .doc and .docx formats
2. WHEN a file is uploaded THEN the system SHALL call the external /upload_extract_metadata API and display upload progress
3. WHEN metadata extraction completes THEN the system SHALL display extracted title, authors, affiliations, keywords, and abstract in an editable format
4. IF file upload fails THEN the system SHALL display clear error messages with supported file format requirements
5. WHEN large files are processed THEN the system SHALL show a loading indicator with estimated completion time

### Requirement 2: Metadata Review and Editing Interface

**User Story:** As a researcher, I want to review and edit the extracted manuscript metadata so that I can ensure accuracy before proceeding with the search.

#### Acceptance Criteria

1. WHEN metadata is displayed THEN the system SHALL show title, authors, affiliations, keywords, and abstract in clearly labeled, editable fields
2. WHEN a user edits metadata THEN the system SHALL validate input and provide real-time feedback
3. WHEN author information is edited THEN the system SHALL maintain proper author-affiliation mappings
4. WHEN metadata changes are saved THEN the system SHALL update the job data and confirm successful save
5. IF metadata validation fails THEN the system SHALL highlight problematic fields with specific error messages

### Requirement 3: Keyword Enhancement and Selection Interface

**User Story:** As a researcher, I want to enhance my manuscript keywords and generate search terms so that I can find the most relevant potential reviewers.

#### Acceptance Criteria

1. WHEN keyword enhancement is initiated THEN the system SHALL call /keyword_enhancement API and display enhanced keywords, MeSH terms, and focus areas
2. WHEN keywords are displayed THEN the system SHALL show primary and secondary keywords in selectable lists with checkboxes
3. WHEN users select/deselect keywords THEN the system SHALL update the selection in real-time and show keyword count
4. WHEN search string generation is requested THEN the system SHALL call /keyword_string_generator API with selected keywords
5. WHEN search string is generated THEN the system SHALL display the formatted Boolean search query for user review

### Requirement 4: Database Search Configuration and Execution

**User Story:** As a researcher, I want to select academic databases and initiate searches so that I can gather potential reviewers from multiple sources.

#### Acceptance Criteria

1. WHEN database selection is displayed THEN the system SHALL show checkboxes for PubMed, TandFonline, ScienceDirect, and WileyLibrary with default selections
2. WHEN search is initiated THEN the system SHALL call /database_search API with selected databases and display search progress
3. WHEN search is in progress THEN the system SHALL show a progress indicator with database-specific status updates
4. WHEN search completes THEN the system SHALL display total reviewer count and preview of found reviewers
5. IF database search fails THEN the system SHALL show which databases failed and allow retry with available databases

### Requirement 5: Manual Reviewer Addition Interface

**User Story:** As a researcher, I want to manually add specific reviewers by name so that I can include experts I know in my field.

#### Acceptance Criteria

1. WHEN manual addition is accessed THEN the system SHALL provide a search input field for author names
2. WHEN an author name is entered THEN the system SHALL call /manual_authors API and display search results
3. WHEN search results are displayed THEN the system SHALL show author details including affiliation and email if available
4. WHEN an author is selected THEN the system SHALL add them to the candidate pool and confirm addition
5. IF manual search returns no results THEN the system SHALL suggest alternative search terms or partial name matching

### Requirement 6: Author Validation and Progress Tracking

**User Story:** As a researcher, I want to validate potential reviewers against conflict rules so that I get ethically appropriate recommendations.

#### Acceptance Criteria

1. WHEN validation is initiated THEN the system SHALL call /validate_authors API and display validation progress with estimated completion time
2. WHEN validation is in progress THEN the system SHALL show a progress bar and current validation status
3. WHEN validation completes THEN the system SHALL display validation summary with total authors processed and conditions met
4. WHEN validation results are shown THEN the system SHALL indicate which validation criteria were applied
5. IF validation takes longer than expected THEN the system SHALL provide status updates and allow users to continue with other tasks

### Requirement 7: Reviewer Recommendations and Filtering Interface

**User Story:** As a researcher, I want to view and filter validated reviewers in a sortable table so that I can identify the most suitable candidates.

#### Acceptance Criteria

1. WHEN recommendations are displayed THEN the system SHALL show a sortable table with reviewer name, affiliation, country, email, publications, and validation score
2. WHEN filters are applied THEN the system SHALL update the table in real-time showing matching reviewers
3. WHEN sorting is requested THEN the system SHALL order results by the selected column (ascending/descending)
4. WHEN validation scores are displayed THEN the system SHALL show conditions met (e.g., "8 of 8") with color-coded indicators
5. IF no reviewers meet filter criteria THEN the system SHALL suggest relaxing specific filter parameters

### Requirement 8: Reviewer Shortlist Management

**User Story:** As a researcher, I want to select reviewers for my shortlist and manage my selections so that I can create a final recommendation list.

#### Acceptance Criteria

1. WHEN reviewers are displayed THEN the system SHALL provide checkboxes for selecting individual reviewers
2. WHEN reviewers are selected THEN the system SHALL maintain a shortlist counter and allow bulk selection operations
3. WHEN shortlist is viewed THEN the system SHALL display selected reviewers with options to remove or reorder
4. WHEN shortlist changes are made THEN the system SHALL save selections and provide undo functionality
5. WHEN shortlist is complete THEN the system SHALL validate minimum/maximum reviewer requirements before export

### Requirement 9: Export and Download Functionality

**User Story:** As a researcher, I want to export my reviewer shortlist in multiple formats so that I can submit it to journals or share with colleagues.

#### Acceptance Criteria

1. WHEN export is requested THEN the system SHALL provide options for CSV, Excel, and formatted report downloads
2. WHEN CSV export is selected THEN the system SHALL generate a structured file with all reviewer data columns
3. WHEN Excel export is chosen THEN the system SHALL create a formatted spreadsheet with headers and proper formatting
4. WHEN formatted report is requested THEN the system SHALL generate a professional document with reviewer profiles
5. IF export fails THEN the system SHALL provide error details and retry options with alternative formats

### Requirement 10: Process Management and Navigation

**User Story:** As a researcher, I want to navigate between workflow steps and track my progress so that I can manage multiple manuscripts efficiently.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a step indicator showing current progress through the 9-step workflow
2. WHEN users navigate between steps THEN the system SHALL validate required data completion and prevent skipping mandatory steps
3. WHEN process data is loaded THEN the system SHALL restore the user's previous state and allow continuation from any completed step
4. WHEN multiple processes exist THEN the system SHALL provide a dashboard to switch between different manuscript analyses
5. IF process data is corrupted THEN the system SHALL provide recovery options and clear error messaging

### Requirement 11: Error Handling and User Feedback

**User Story:** As a researcher, I want clear error messages and recovery options so that I can resolve issues and continue my work.

#### Acceptance Criteria

1. WHEN API calls fail THEN the system SHALL display user-friendly error messages with suggested actions
2. WHEN network connectivity issues occur THEN the system SHALL provide offline indicators and retry mechanisms
3. WHEN validation errors happen THEN the system SHALL highlight problematic fields with specific correction guidance
4. WHEN external services are unavailable THEN the system SHALL inform users and suggest alternative approaches
5. WHEN errors are resolved THEN the system SHALL automatically retry failed operations and confirm success

### Requirement 12: Responsive Design and Accessibility

**User Story:** As a researcher using various devices, I want the application to work well on desktop, tablet, and mobile so that I can access it from anywhere.

#### Acceptance Criteria

1. WHEN accessed on desktop THEN the system SHALL display full functionality with optimal layout for large screens
2. WHEN accessed on tablet THEN the system SHALL adapt the interface for touch interaction while maintaining usability
3. WHEN accessed on mobile THEN the system SHALL provide a mobile-optimized interface with essential functionality
4. WHEN using assistive technologies THEN the system SHALL provide proper ARIA labels and keyboard navigation
5. WHEN visual accessibility is needed THEN the system SHALL support high contrast modes and screen reader compatibility