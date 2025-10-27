# Process Details Stage Column Update

## Changes Made

Added a "Stage" column to the Process Details table in the Reports page to show the current step of each process.

## What Was Updated

### File: `src/components/reports/ProcessTable.tsx`

1. **Added Stage Labels Mapping**:
   ```typescript
   const stepLabels: Record<string, string> = {
     UPLOAD: 'Upload & Extract',
     METADATA_EXTRACTION: 'Metadata Extraction',
     KEYWORD_ENHANCEMENT: 'Keyword Enhancement',
     DATABASE_SEARCH: 'Database Search',
     MANUAL_SEARCH: 'Manual Search',
     VALIDATION: 'Validation',
     RECOMMENDATIONS: 'Recommendations',
     SHORTLIST: 'Shortlist',
     EXPORT: 'Export',
   };
   ```

2. **Added Stage Column to Table Header**:
   - New sortable column between "Title" and "Status"
   - Click to sort by current stage

3. **Added Stage Cell to Table Rows**:
   - Displays human-readable stage name
   - Shows between title and status columns

4. **Updated Search Functionality**:
   - Search now includes stage/step names
   - Can search by "Upload", "Metadata", "Validation", etc.

5. **Updated Sort Functionality**:
   - Added 'currentStep' to sortable fields
   - Can sort processes by their current stage

6. **Updated Column Span**:
   - Adjusted empty state colspan to account for new column
   - Regular users: 5 columns
   - Admin users: 6 columns (includes User email)

## Table Structure

### For Regular Users:
| Title | Stage | Status | Created | Updated |
|-------|-------|--------|---------|---------|

### For Admin Users:
| Title | Stage | Status | User | Created | Updated |
|-------|-------|--------|------|---------|---------|

## Stage Values Displayed

- **Upload & Extract** - Initial file upload
- **Metadata Extraction** - Extracting document metadata
- **Keyword Enhancement** - Enhancing search keywords
- **Database Search** - Searching databases
- **Manual Search** - Manual search phase
- **Validation** - Validating results
- **Recommendations** - Generating recommendations
- **Shortlist** - Creating shortlist
- **Export** - Exporting results

## Features

✅ **Sortable** - Click column header to sort by stage
✅ **Searchable** - Search includes stage names
✅ **Human-Readable** - Shows friendly names instead of codes
✅ **Responsive** - Works on all screen sizes

## Testing

To verify the changes:

1. Navigate to Reports → Processes tab
2. Check that "Stage" column appears between "Title" and "Status"
3. Verify stage names are displayed (e.g., "Upload & Extract")
4. Click "Stage" header to sort by stage
5. Search for a stage name (e.g., "Metadata") to filter
6. Confirm all processes show their current stage

## Example

Before:
```
Title: "Research Project" | Status: Processing | Created: Jan 1
```

After:
```
Title: "Research Project" | Stage: Metadata Extraction | Status: Processing | Created: Jan 1
```

This makes it much easier to see at a glance what stage each process is currently in!
