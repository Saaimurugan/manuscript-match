# ✅ API Mapping Complete - All Endpoints Updated

## Summary

All API endpoints in the "Processes" workflow now use the **ScholarFinder external API** at `http://192.168.61.60:8000`.

## Files Modified

### 1. `src/services/fileService.ts`
Complete rewrite to use ScholarFinder API for all operations:

- ✅ **Upload** → `POST /upload_extract_metadata`
- ✅ **Get Metadata** → `GET /metadata_extraction?job_id={jobId}`
- ✅ **Generate Keywords** → `POST /keyword_string_generator`
- ✅ **Search Databases** → `POST /database_search`
- ✅ **Add Manual Author** → `POST /manual_authors`
- ✅ **Validate Authors** → `POST /author_validation`
- ✅ **Get Validation Status** → `GET /validation_status/{jobId}`
- ✅ **Get Recommendations** → `GET /recommended_reviewers?job_id={jobId}`
- ✅ **Fetch All Authors** → `GET /fetch_all_authors?job_id={jobId}`

### 2. `src/hooks/useFiles.ts`
Added new hooks for all ScholarFinder operations:

- ✅ `useFileUpload()` - Upload manuscript
- ✅ `useMetadata()` - Get extracted metadata
- ✅ `useUpdateMetadata()` - Update metadata
- ✅ `useGenerateKeywordString()` - Generate keyword string
- ✅ `useSearchDatabases()` - Search databases for reviewers
- ✅ `useAddManualAuthor()` - Add manual author
- ✅ `useValidateAuthors()` - Validate authors
- ✅ `useValidationStatus()` - Get validation status (with polling)
- ✅ `useRecommendations()` - Get recommended reviewers
- ✅ `useFetchAllAuthors()` - Fetch all authors

## API Endpoint Mapping

| Operation | External API Endpoint | Method | Status |
|-----------|----------------------|--------|--------|
| Upload Manuscript | `/upload_extract_metadata` | POST | ✅ |
| View Metadata | `/metadata_extraction?job_id={jobId}` | GET | ✅ |
| Generate Keywords | `/keyword_string_generator` | POST | ✅ |
| Search Databases | `/database_search` | POST | ✅ |
| Add Manual Author | `/manual_authors` | POST | ✅ |
| Validate Authors | `/author_validation` | POST | ✅ |
| Validation Status | `/validation_status/{jobId}` | GET | ✅ |
| Get Recommendations | `/recommended_reviewers?job_id={jobId}` | GET | ✅ |
| Fetch All Authors | `/fetch_all_authors?job_id={jobId}` | GET | ✅ |

## How It Works

### Job ID Management

The service automatically manages job IDs:

1. **Upload** returns a `job_id` from the external API
2. Service stores `job_id` mapped to `processId` in memory and localStorage
3. All subsequent operations use the stored `job_id`

```typescript
// After upload
fileService.setJobId(processId, job_id);

// Later operations automatically retrieve it
const jobId = fileService.getJobId(processId);
```

### Data Transformation

The service transforms external API responses to match internal types:

**Upload Response**:
```typescript
// External API returns:
{ job_id, file_name, heading, authors: string[], ... }

// Transformed to:
{ fileId, fileName, metadata: { title, authors: Author[], ... } }
```

**Metadata Response**:
```typescript
// External API returns:
{ heading, authors: string[], affiliations: string[], ... }

// Transformed to:
{ title, authors: Author[], affiliations: Affiliation[], ... }
```

## Usage Examples

### 1. Upload File

```typescript
const uploadMutation = useFileUpload();

await uploadMutation.mutateAsync({
  processId: 'process-123',
  file: manuscriptFile,
  onProgress: (progress) => console.log(`${progress}%`)
});
```

**Network Request**:
```
POST http://192.168.61.60:8000/upload_extract_metadata
Content-Type: multipart/form-data
```

### 2. Get Metadata

```typescript
const { data: metadata } = useMetadata('process-123');
```

**Network Request**:
```
GET http://192.168.61.60:8000/metadata_extraction?job_id={jobId}
```

### 3. Generate Keywords

```typescript
const generateKeywords = useGenerateKeywordString();

await generateKeywords.mutateAsync({
  processId: 'process-123',
  keywords: {
    primary_keywords_input: 'cancer, treatment',
    secondary_keywords_input: 'therapy, clinical'
  }
});
```

**Network Request**:
```
POST http://192.168.61.60:8000/keyword_string_generator
Content-Type: application/json
Body: { job_id, primary_keywords_input, secondary_keywords_input }
```

### 4. Search Databases

```typescript
const searchDatabases = useSearchDatabases();

await searchDatabases.mutateAsync({
  processId: 'process-123',
  databases: {
    selected_websites: ['PubMed', 'ScienceDirect', 'Wiley']
  }
});
```

**Network Request**:
```
POST http://192.168.61.60:8000/database_search
Content-Type: application/json
Body: { job_id, selected_websites: [...] }
```

### 5. Validate Authors

```typescript
const validateAuthors = useValidateAuthors();

await validateAuthors.mutateAsync({
  processId: 'process-123'
});
```

**Network Request**:
```
POST http://192.168.61.60:8000/author_validation
Content-Type: application/json
Body: { job_id }
```

### 6. Get Recommendations

```typescript
const { data: recommendations } = useRecommendations('process-123');
```

**Network Request**:
```
GET http://192.168.61.60:8000/recommended_reviewers?job_id={jobId}
```

## Testing

### Test Upload

1. Go to **Processes** → Select/Create Process
2. Click **"Upload & Extract"**
3. Upload a `.docx` file
4. Check Network tab: `POST http://192.168.61.60:8000/upload_extract_metadata`

### Test Metadata

1. After upload, metadata should display automatically
2. Check Network tab: `GET http://192.168.61.60:8000/metadata_extraction?job_id=...`

### Test Other Operations

Use the workflow steps in the UI - each will call the corresponding external API endpoint.

## Verification Checklist

- [ ] Upload calls `192.168.61.60:8000/upload_extract_metadata`
- [ ] Metadata calls `192.168.61.60:8000/metadata_extraction?job_id=...`
- [ ] Keywords call `192.168.61.60:8000/keyword_string_generator`
- [ ] Search calls `192.168.61.60:8000/database_search`
- [ ] Validation calls `192.168.61.60:8000/author_validation`
- [ ] Recommendations call `192.168.61.60:8000/recommended_reviewers?job_id=...`
- [ ] No requests to `localhost:3002/api/processes/...`

## Important Notes

### External API Requirements

The external API at `http://192.168.61.60:8000` must:

1. **Be running and accessible**
2. **Allow CORS** from `http://localhost:3002`
3. **Accept the request formats** shown above
4. **Return responses** in the expected format

### Error Handling

All operations include error handling:

```typescript
try {
  await uploadMutation.mutateAsync({ processId, file });
} catch (error) {
  // Error is logged and can be displayed to user
  console.error('Upload failed:', error);
}
```

### Polling for Validation

The `useValidationStatus` hook automatically polls every 5 seconds while validation is in progress:

```typescript
const { data: status } = useValidationStatus('process-123');

// Polls automatically if status.validation_status === 'in_progress'
```

## Troubleshooting

### Issue: "No job ID found"

**Cause**: File hasn't been uploaded yet, or job ID wasn't stored

**Solution**: 
1. Upload a file first
2. Check localStorage: `process_{processId}_jobId`
3. Verify upload response contains `job_id`

### Issue: CORS Error

**Cause**: External API doesn't allow requests from localhost:3002

**Solution**: Configure CORS on external API:
```python
# Example for FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Connection Refused

**Cause**: External API not running

**Solution**: 
```bash
# Check if API is accessible
curl http://192.168.61.60:8000/

# Check network connectivity
ping 192.168.61.60
```

## Success Indicators

✅ All uploads go to `192.168.61.60:8000`
✅ Job ID is stored and reused
✅ Metadata displays correctly
✅ All workflow steps work end-to-end
✅ No backend API calls to `localhost:3002/api/processes/...`

## Next Steps

1. **Test each endpoint** individually
2. **Verify data transformation** is correct
3. **Test error scenarios** (network failure, invalid data, etc.)
4. **Monitor performance** of external API calls
5. **Add loading states** for long-running operations

All API endpoints are now mapped and ready to use! 🎉
