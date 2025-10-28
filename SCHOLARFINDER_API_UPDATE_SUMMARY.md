# ScholarFinder API Update Summary

## Changes Made

### 1. API Service Configuration ✅
**File**: `src/features/scholarfinder/services/ScholarFinderApiService.ts`

- Updated base URL from `config.apiBaseUrl` to `http://192.168.61.60:8000`
- Removed `/scholarfinder` prefix from all endpoint paths
- All 10 API methods now call the external API directly

**Endpoints Updated**:
- `uploadManuscript()` → `POST /upload_extract_metadata`
- `getMetadata()` → `GET /metadata_extraction?job_id={jobId}`
- `enhanceKeywords()` → `POST /keyword_enhancement`
- `generateKeywordString()` → `POST /keyword_string_generator`
- `searchDatabases()` → `POST /database_search`
- `addManualAuthor()` → `POST /manual_authors`
- `validateAuthors()` → `POST /validate_authors`
- `getValidationStatus()` → `GET /validation_status/{jobId}`
- `getRecommendations()` → `GET /recommendations/{jobId}`
- `checkJobStatus()` → `GET /job_status/{jobId}`

### 2. Wizard Page Implementation ✅
**File**: `src/features/scholarfinder/pages/ScholarFinderWizard.tsx`

- Replaced placeholder content with actual `StepWizard` component
- Added `AccessibilityProvider` wrapper
- Configured to start at "upload" step
- Integrated with routing

## ✅ FINAL SOLUTION IMPLEMENTED

### Changes Made to Fix the Issue

**File**: `src/features/scholarfinder/pages/ScholarFinderWizard.tsx`

The wizard page was a placeholder and wasn't actually rendering the StepWizard component with the proper configuration. It has now been updated to:

1. Import and use the `workflowConfig` with all step definitions
2. Pass the required `steps` prop to `StepWizard`
3. Manage `jobId` state from upload response
4. Configure all workflow settings (allowSkipping, autoSave, etc.)

### How to Use

Navigate to:
```
http://localhost:3002/scholarfinder/process/{YOUR_PROCESS_ID}
```

Replace `{YOUR_PROCESS_ID}` with an actual process ID from your system (e.g., `3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919`).

### Upload Flow

1. **Select File**: Choose a .doc or .docx manuscript file
2. **Upload**: File is sent directly to `http://192.168.61.60:8000/upload_extract_metadata`
3. **Response**: Receive `job_id` and extracted metadata
4. **Next Steps**: Continue through the workflow (metadata review, keywords, etc.)

## Verification

### Check Network Requests

Open browser DevTools → Network tab and verify:

**✅ CORRECT**:
```
POST http://192.168.61.60:8000/upload_extract_metadata
Content-Type: multipart/form-data
```

**❌ INCORRECT** (if you see this, you're on the wrong page):
```
POST http://localhost:3002/api/processes/{id}/upload
```

### Expected Response

```json
{
  "message": "File uploaded and metadata extracted successfully",
  "data": {
    "job_id": "abc123...",
    "file_name": "manuscript.docx",
    "timestamp": "2024-...",
    "heading": "Research Title",
    "authors": ["Author 1", "Author 2"],
    "affiliations": ["University A", "Institute B"],
    "keywords": "keyword1, keyword2",
    "abstract": "Abstract text...",
    "author_aff_map": {
      "Author 1": "University A",
      "Author 2": "Institute B"
    }
  }
}
```

## Important Notes

### Two Different Workflows

The application has two separate workflows:

1. **Regular Process Workflow** (`/processes/{id}`)
   - Uses backend API at `http://localhost:3002`
   - For general document processing

2. **ScholarFinder Workflow** (`/scholarfinder/process/{id}`)
   - Uses external API at `http://192.168.61.60:8000`
   - For peer reviewer recommendations

Make sure you're accessing the **ScholarFinder** route!

### No Backend Proxy Needed

The ScholarFinder service connects directly to the external API. No backend proxy or environment variables are required.

### CORS Considerations

If you encounter CORS errors, the external API at `http://192.168.61.60:8000` needs to:
- Allow requests from your frontend origin (`http://localhost:3002`)
- Accept `multipart/form-data` content type
- Allow necessary HTTP methods (GET, POST)

## Troubleshooting

### Issue: Still seeing old API endpoint

**Problem**: Network tab shows `http://localhost:3002/api/processes/{id}/upload`

**Solution**: You're on the wrong page. Navigate to:
```
http://localhost:3002/scholarfinder/process/{YOUR_PROCESS_ID}
```

### Issue: Cannot connect to external API

**Problem**: Network error or timeout

**Check**:
1. Is the external API running at `http://192.168.61.60:8000`?
2. Can you ping `192.168.61.60`?
3. Is there a firewall blocking the connection?
4. Are you on the same network?

**Test**:
```bash
curl http://192.168.61.60:8000/
```

### Issue: File upload fails

**Check**:
1. File format: Must be .doc or .docx
2. File size: Must be under 100MB
3. API response: Check for error messages in response

## Files Modified

1. `src/features/scholarfinder/services/ScholarFinderApiService.ts` - API configuration
2. `src/features/scholarfinder/pages/ScholarFinderWizard.tsx` - Wizard page implementation
3. `SCHOLARFINDER_API_CONFIGURATION.md` - Documentation updated
4. `SCHOLARFINDER_USAGE_GUIDE.md` - Usage guide created
5. `SCHOLARFINDER_API_UPDATE_SUMMARY.md` - This summary

## Next Steps

1. Navigate to `/scholarfinder/process/{processId}` in your browser
2. Upload a test manuscript file
3. Verify the external API is called correctly
4. Continue through the workflow steps
5. Report any issues or errors
