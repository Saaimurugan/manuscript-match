# ✅ Process ID Added to Upload API

## Changes Made

The upload API now sends the `process_id` along with the file upload request.

### Files Modified

1. **src/features/scholarfinder/services/ScholarFinderApiService.ts**
   - Updated `uploadManuscript()` method to accept optional `processId` parameter
   - Sends `process_id` as both query parameter and form data

2. **src/services/fileService.ts**
   - Updated to pass `processId` to `uploadManuscript()`

## API Request Format

### Before
```
POST http://192.168.61.60:8000/upload_extract_metadata
Content-Type: multipart/form-data

file: [binary data]
```

### After
```
POST http://192.168.61.60:8000/upload_extract_metadata?process_id={processId}
Content-Type: multipart/form-data

file: [binary data]
process_id: {processId}
```

## Implementation Details

### Query Parameter
The `process_id` is sent as a URL query parameter:
```
/upload_extract_metadata?process_id=3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
```

### Form Data
The `process_id` is also included in the form data:
```typescript
formData.append('file', file);
formData.append('process_id', processId);
```

This dual approach ensures the external API can receive the process_id in whichever format it expects.

## Code Changes

### ScholarFinderApiService.ts

```typescript
async uploadManuscript(file: File, processId?: string): Promise<UploadResponse> {
  // ... validation code ...
  
  const formData = new FormData();
  formData.append('file', file);
  
  // Add process_id if provided
  if (processId) {
    formData.append('process_id', processId);
  }

  // Build URL with query parameter
  let url = '/upload_extract_metadata';
  if (processId) {
    url += `?process_id=${encodeURIComponent(processId)}`;
  }

  const response = await this.apiService.uploadFile<UploadResponse>(url, file);
  return (response.data || response) as UploadResponse;
}
```

### fileService.ts

```typescript
async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  // Pass processId to ScholarFinder API
  const response = await scholarFinderApiService.uploadManuscript(file, processId);
  
  // Store the job_id for this process
  this.setJobId(processId, response.data.job_id);
  
  return transformedResponse;
}
```

## Testing

### Expected Network Request

When you upload a file, you should see:

**URL**:
```
POST http://192.168.61.60:8000/upload_extract_metadata?process_id=3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
```

**Headers**:
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

**Form Data**:
```
file: manuscript.docx
process_id: 3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
```

### How to Verify

1. **Open DevTools** → Network tab
2. **Go to Processes** → Upload & Extract
3. **Upload a file**
4. **Check the request**:
   - URL should include `?process_id=...`
   - Form data should include `process_id` field

### Example Request

```http
POST /upload_extract_metadata?process_id=3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919 HTTP/1.1
Host: 192.168.61.60:8000
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="manuscript.docx"
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document

[binary file data]
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="process_id"

3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

## Benefits

1. **Process Tracking**: External API can track which process the upload belongs to
2. **Data Association**: Links the job_id with the process_id on the external system
3. **Debugging**: Easier to trace requests in logs
4. **Flexibility**: Sent in both query param and form data for compatibility

## Backward Compatibility

The `processId` parameter is optional in `uploadManuscript()`, so:
- ✅ Works with processId (new behavior)
- ✅ Works without processId (backward compatible)

## External API Requirements

The external API should be updated to:

1. **Accept** `process_id` parameter (query or form data)
2. **Store** the association between `job_id` and `process_id`
3. **Return** the same response format as before

Example external API handler:
```python
@app.post("/upload_extract_metadata")
async def upload_extract_metadata(
    file: UploadFile,
    process_id: Optional[str] = None  # From query or form
):
    # Extract metadata
    job_id = generate_job_id()
    
    # Store process_id association if provided
    if process_id:
        store_process_mapping(job_id, process_id)
    
    # Return response
    return {
        "message": "Success",
        "data": {
            "job_id": job_id,
            "process_id": process_id,  # Optional: return it back
            # ... other fields
        }
    }
```

## Summary

✅ Process ID is now sent with every upload request
✅ Sent as both query parameter and form data
✅ Backward compatible (optional parameter)
✅ Ready for testing

The upload API now includes the process_id, allowing the external API to track and associate uploads with specific processes!
