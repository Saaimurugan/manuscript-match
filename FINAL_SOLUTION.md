# ✅ FINAL SOLUTION - Upload API Changed

## What Was Changed

The regular "Processes" workflow now uses the **ScholarFinder external API** instead of the backend API.

### File Modified: `src/hooks/useFiles.ts`

The `useFileUpload` hook now:
1. ✅ Calls `scholarFinderApiService.uploadManuscript(file)` 
2. ✅ Sends request to `http://192.168.61.60:8000/upload_extract_metadata`
3. ✅ Transforms the response to match the expected format
4. ✅ Returns job_id, metadata, etc. from external API

### File Reverted: `src/pages/Index.tsx`

Removed the ScholarFinder tab - back to original navigation.

## How to Test

1. **Go to**: `http://localhost:3002/`
2. **Click**: "Processes" tab
3. **Select or create a process**
4. **Click**: "Upload & Extract"
5. **Click**: "Choose File" and select a .docx file
6. **Check Network tab**: Should show `POST http://192.168.61.60:8000/upload_extract_metadata` ✅

## What Happens Now

When you upload a file in **Processes → Upload & Extract**:

```
User clicks "Choose File"
        ↓
useFileUpload hook is called
        ↓
scholarFinderApiService.uploadManuscript(file)
        ↓
POST http://192.168.61.60:8000/upload_extract_metadata
        ↓
Response with job_id, heading, authors, etc.
        ↓
Transformed to UploadResponse format
        ↓
Displayed in UI
```

## Expected Network Request

**Method**: POST
**URL**: `http://192.168.61.60:8000/upload_extract_metadata`
**Content-Type**: `multipart/form-data`
**Body**: File data

## Expected Response

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

## Files Changed Summary

1. **src/hooks/useFiles.ts** - Changed to use ScholarFinder API
2. **src/pages/Index.tsx** - Reverted (removed ScholarFinder tab)
3. **src/features/scholarfinder/services/ScholarFinderApiService.ts** - Already configured with external API

## Verification Checklist

- [ ] Navigate to Processes tab
- [ ] Click "Upload & Extract"
- [ ] Choose a .docx file
- [ ] Open DevTools Network tab
- [ ] See request to `192.168.61.60:8000/upload_extract_metadata`
- [ ] NOT seeing `localhost:3002/api/processes/{id}/upload`

If all checks pass, the integration is working! ✅

## Important Notes

- The external API must be running at `http://192.168.61.60:8000`
- File must be .doc or .docx format
- File size must be under 100MB
- CORS must be configured on the external API to allow requests from `localhost:3002`

## Troubleshooting

### Still seeing old endpoint?

1. **Hard refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache**: DevTools → Network → Disable cache
3. **Restart dev server**: Stop and restart `npm run dev`

### Connection refused?

Check if external API is running:
```bash
curl http://192.168.61.60:8000/
```

### CORS error?

The external API needs to allow:
- Origin: `http://localhost:3002`
- Methods: POST, GET
- Headers: Content-Type, Authorization

## Success!

You should now see the external API being called when you upload files in the Processes workflow! 🎉
