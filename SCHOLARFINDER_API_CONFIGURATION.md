# ScholarFinder API Configuration Status

## Current Configuration

### Base URL Configuration
**Location**: `src/features/scholarfinder/services/ScholarFinderApiService.ts`

**✅ CONFIGURED**:
- External API Base URL: `http://192.168.61.60:8000` (hardcoded in service)

**Note**: The ScholarFinder API service now directly connects to the external API at `http://192.168.61.60:8000` without requiring environment variables or backend proxy.

## API Endpoints Mapping

### ✅ Currently Configured Endpoints

All endpoints now call the external API directly at `http://192.168.61.60:8000`:

| Step | Service Method | External API Endpoint | Status |
|------|---------------|----------------------|--------|
| 1. Upload & Extract | `uploadManuscript()` | `POST /upload_extract_metadata` | ✅ Configured |
| 2. View Metadata | `getMetadata()` | `GET /metadata_extraction?job_id={jobId}` | ✅ Configured |
| 3. Enhance Keywords | `enhanceKeywords()` | `POST /keyword_enhancement` | ✅ Configured |
| 3b. Generate Keyword String | `generateKeywordString()` | `POST /keyword_string_generator` | ✅ Configured |
| 4. Database Search | `searchDatabases()` | `POST /database_search` | ✅ Configured |
| 5. Add Manual Author | `addManualAuthor()` | `POST /manual_authors` | ✅ Configured |
| 6. Validate Authors | `validateAuthors()` | `POST /validate_authors` | ✅ Configured |
| 6b. Get Validation Status | `getValidationStatus()` | `GET /validation_status/{jobId}` | ✅ Configured |
| 7. Get Recommendations | `getRecommendations()` | `GET /recommendations/{jobId}` | ✅ Configured |
| Utility | `checkJobStatus()` | `GET /job_status/{jobId}` | ✅ Configured |

## ✅ Configuration Complete

All API endpoints have been configured to call the external ScholarFinder API directly at `http://192.168.61.60:8000`.

### What Was Changed

**File**: `src/features/scholarfinder/services/ScholarFinderApiService.ts`

1. **Base URL**: Updated from `config.apiBaseUrl` to `http://192.168.61.60:8000`
2. **All Endpoints**: Removed `/scholarfinder` prefix to call external API directly:
   - `uploadManuscript()`: Calls `POST /upload_extract_metadata`
   - `getMetadata()`: Calls `GET /metadata_extraction?job_id={jobId}`
   - `enhanceKeywords()`: Calls `POST /keyword_enhancement`
   - `generateKeywordString()`: Calls `POST /keyword_string_generator`
   - `searchDatabases()`: Calls `POST /database_search`
   - `addManualAuthor()`: Calls `POST /manual_authors`
   - `validateAuthors()`: Calls `POST /validate_authors`
   - `getValidationStatus()`: Calls `GET /validation_status/{jobId}`
   - `getRecommendations()`: Calls `GET /recommendations/{jobId}`
   - `checkJobStatus()`: Calls `GET /job_status/{jobId}`

### No Additional Configuration Needed

- ❌ No environment variables required
- ❌ No backend proxy needed
- ❌ No additional configuration files
- ✅ Service connects directly to external API

## API Request/Response Examples

### 1. Upload & Extract Metadata

**Request**:
```http
POST http://192.168.61.60:8000/upload_extract_metadata
Content-Type: multipart/form-data

file: [manuscript.docx]
```

**Response**:
```json
{
  "message": "File uploaded and metadata extracted successfully",
  "data": {
    "job_id": "abc123",
    "file_name": "manuscript.docx",
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

### 2. View Extracted Metadata

**Request**:
```http
GET http://192.168.61.60:8000/metadata_extraction?job_id=abc123
```

**Response**:
```json
{
  "message": "Metadata retrieved successfully",
  "job_id": "abc123",
  "data": {
    "heading": "Research Title",
    "authors": ["Author 1", "Author 2"],
    "affiliations": ["University A"],
    "keywords": "keyword1, keyword2",
    "abstract": "Abstract text..."
  }
}
```

### 3. Generate Keyword String

**Request**:
```http
POST http://192.168.61.60:8000/keyword_string_generator
Content-Type: application/json

{
  "job_id": "abc123",
  "primary_keywords": ["keyword1", "keyword2"],
  "secondary_keywords": ["keyword3"]
}
```

**Response**:
```json
{
  "message": "Keyword string generated",
  "job_id": "abc123",
  "data": {
    "search_string": "(keyword1 OR keyword2) AND (keyword3)"
  }
}
```

### 4. Database Search

**Request**:
```http
POST http://192.168.61.60:8000/database_search
Content-Type: application/json

{
  "job_id": "abc123",
  "databases": ["PubMed", "ScienceDirect"],
  "search_string": "(keyword1 OR keyword2)"
}
```

**Response**:
```json
{
  "message": "Database search completed",
  "job_id": "abc123",
  "data": {
    "total_authors": 150,
    "databases_searched": ["PubMed", "ScienceDirect"]
  }
}
```

### 5. Add Manual Author

**Request**:
```http
POST http://192.168.61.60:8000/manual_authors
Content-Type: application/json

{
  "job_id": "abc123",
  "author_name": "John Doe",
  "email": "john@example.com",
  "affiliation": "University X"
}
```

**Response**:
```json
{
  "message": "Author added successfully",
  "job_id": "abc123",
  "data": {
    "author_id": "author_456"
  }
}
```

### 6. Validate and Rank Authors

**Request**:
```http
POST http://192.168.61.60:8000/author_validation
Content-Type: application/json

{
  "job_id": "abc123",
  "min_publications": 5,
  "exclude_coauthors": true,
  "same_affiliation": false
}
```

**Response**:
```json
{
  "message": "Validation completed",
  "job_id": "abc123",
  "data": {
    "validated_count": 75,
    "filtered_count": 75
  }
}
```

### 7. Recommended Reviewers

**Request**:
```http
GET http://192.168.61.60:8000/recommended_reviewers?job_id=abc123
```

**Response**:
```json
{
  "message": "Recommendations retrieved",
  "job_id": "abc123",
  "data": {
    "reviewers": [
      {
        "name": "Dr. Smith",
        "email": "smith@university.edu",
        "affiliation": "University Y",
        "score": 95,
        "publications": 50
      }
    ]
  }
}
```

### 8. Fetch All Authors

**Request**:
```http
GET http://192.168.61.60:8000/fetch_all_authors?job_id=abc123
```

**Response**:
```json
{
  "message": "All authors retrieved",
  "job_id": "abc123",
  "data": {
    "authors": [
      {
        "name": "Dr. Smith",
        "email": "smith@university.edu",
        "publications": 50,
        "validation_score": 95
      }
    ],
    "total": 75
  }
}
```

## Testing the Configuration

### 1. Test Connection

```bash
curl http://192.168.61.60:8000/
```

### 2. Test Upload Endpoint

```bash
curl -X POST http://192.168.61.60:8000/upload_extract_metadata \
  -F "file=@manuscript.docx"
```

### 3. Test Metadata Retrieval

```bash
curl "http://192.168.61.60:8000/metadata_extraction?job_id=YOUR_JOB_ID"
```

## Troubleshooting

### Issue: Cannot connect to API

**Check**:
1. Is the API server running at `192.168.61.60:8000`?
2. Is there a firewall blocking the connection?
3. Are you on the same network?

**Solution**:
```bash
# Test connectivity
ping 192.168.61.60

# Test port
telnet 192.168.61.60 8000
```

### Issue: CORS errors

**Solution**: Backend proxy should handle CORS. If direct connection needed, API must enable CORS.

### Issue: Timeout errors

**Check**: File size and network speed. Large files may need longer timeouts.

**Solution**: Increase timeout in `apiConfig.ts`:
```typescript
timeout: 600000, // 10 minutes
```

## Summary

### ✅ Configuration Status
- ✅ API service structure exists
- ✅ All endpoints configured
- ✅ Base URL updated to `http://192.168.61.60:8000`
- ✅ All endpoint paths updated to match external API
- ✅ Direct connection to external API (no proxy needed)

### Completed Actions
1. ✅ Updated base URL in `ScholarFinderApiService.ts` constructor
2. ✅ Updated all endpoint paths to remove `/scholarfinder` prefix
3. ✅ Updated `getMetadata()` to use query parameter format
4. ✅ All 10 service methods now call correct external endpoints
5. ✅ No environment variables or backend proxy required

### Next Steps
1. **Test**: Verify connection to `http://192.168.61.60:8000`
2. **Test**: Upload a manuscript file and verify response
3. **Monitor**: Check for any CORS or network issues
4. **Optional**: Add additional error handling if needed
