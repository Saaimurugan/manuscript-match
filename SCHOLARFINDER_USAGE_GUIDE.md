# ScholarFinder Usage Guide

## Important: Using the Correct Workflow

The application has **two different workflows**:

### 1. Regular Process Workflow (OLD)
- **Component**: `ProcessWorkflow` 
- **Upload Component**: `FileUpload` from `src/components/upload/FileUpload.tsx`
- **API Endpoint**: `http://localhost:3002/api/processes/{id}/upload` (Backend)
- **Use Case**: General document processing

### 2. ScholarFinder Workflow (NEW - External API)
- **Component**: ScholarFinder `StepWizard` with `UploadStep`
- **Upload Component**: `UploadStep` from `src/features/scholarfinder/components/steps/UploadStep.tsx`
- **API Endpoint**: `http://192.168.61.60:8000/upload_extract_metadata` (External API)
- **Use Case**: Peer reviewer recommendation system

## How to Use ScholarFinder Workflow

### Option 1: Use the StepWizard Component

```tsx
import { StepWizard } from '@/features/scholarfinder/components/wizard/StepWizard';

function ScholarFinderPage() {
  return (
    <StepWizard 
      processId="your-process-id"
      initialStep="upload"
    />
  );
}
```

### Option 2: Use Individual Steps

```tsx
import { UploadStep } from '@/features/scholarfinder/components/steps/UploadStep';

function CustomWorkflow() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  return (
    <UploadStep
      processId="your-process-id"
      jobId={jobId}
      onNext={(data) => {
        setJobId(data.jobId);
        // Move to next step
      }}
    />
  );
}
```

## ✅ SOLUTION IMPLEMENTED

The ScholarFinder workflow has been updated to use the external API!

### How to Access ScholarFinder

Navigate to the correct URL in your browser:

**✅ CORRECT URL (ScholarFinder with External API)**:
```
http://localhost:3002/scholarfinder/process/{processId}
```

**❌ WRONG URL (Regular Workflow with Backend API)**:
```
http://localhost:3002/processes/{processId}
```

### What Was Changed

The file `src/features/scholarfinder/pages/ScholarFinderWizard.tsx` has been updated to use the `StepWizard` component, which includes the `UploadStep` that calls the external API at `http://192.168.61.60:8000/upload_extract_metadata`.

### Testing Steps

1. **Navigate to ScholarFinder**:
   ```
   http://localhost:3002/scholarfinder/process/YOUR_PROCESS_ID
   ```

2. **Upload a manuscript file** (.doc or .docx)

3. **Check Network Tab** in browser DevTools:
   - You should see: `POST http://192.168.61.60:8000/upload_extract_metadata`
   - NOT: `POST http://localhost:3002/api/processes/{id}/upload`

4. **Verify Response**:
   - Should contain: `job_id`, `heading`, `authors`, `affiliations`, `abstract`, etc.
   - From external API, not backend

## Verification

After switching to the ScholarFinder workflow, you should see:

1. **Network Request**: `POST http://192.168.61.60:8000/upload_extract_metadata`
2. **File Upload**: Direct upload to external API (no backend proxy)
3. **Response**: Contains `job_id`, `heading`, `authors`, `affiliations`, etc.

## API Endpoints Comparison

| Feature | Regular Workflow | ScholarFinder Workflow |
|---------|-----------------|------------------------|
| Upload | `/api/processes/{id}/upload` | `http://192.168.61.60:8000/upload_extract_metadata` |
| Metadata | `/api/processes/{id}/metadata` | `http://192.168.61.60:8000/metadata_extraction?job_id={jobId}` |
| Keywords | N/A | `http://192.168.61.60:8000/keyword_enhancement` |
| Search | N/A | `http://192.168.61.60:8000/database_search` |

## Next Steps

1. Identify which page/component is rendering the workflow
2. Replace `ProcessWorkflow` with ScholarFinder `StepWizard`
3. Test the upload to verify it calls the external API
4. Check browser DevTools Network tab to confirm the correct endpoint

## Need Help?

If you're unsure which component to modify, search for:
```bash
# Find where ProcessWorkflow is used
grep -r "ProcessWorkflow" src/

# Find your current page component
grep -r "processes/" src/
```

Then update that component to use the ScholarFinder workflow instead.
