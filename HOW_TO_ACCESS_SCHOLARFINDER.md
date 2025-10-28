# How to Access ScholarFinder (External API)

## ⚠️ IMPORTANT: Two Different Workflows

Your application has **TWO SEPARATE WORKFLOWS**:

### 1. Regular Process Workflow (Backend API)
- **Tab**: "Processes"
- **API**: `http://localhost:3002/api/processes/{id}/upload`
- **Purpose**: General document processing
- **Upload Component**: Regular FileUpload

### 2. ScholarFinder Workflow (External API) ✅
- **Tab**: "ScholarFinder" (NEW!)
- **API**: `http://192.168.61.60:8000/upload_extract_metadata`
- **Purpose**: AI-powered peer reviewer identification
- **Upload Component**: ScholarFinder UploadStep

## How to Access ScholarFinder

### Option 1: Use the New Tab (Recommended)

1. **Go to the main page**: `http://localhost:3002/`
2. **Click the "ScholarFinder" tab** (next to "Processes")
3. **Click "Open ScholarFinder"** button
4. **Upload your manuscript** (.docx file)
5. **Verify** the Network tab shows: `http://192.168.61.60:8000/upload_extract_metadata`

### Option 2: Direct URL

Navigate directly to:
```
http://localhost:3002/scholarfinder/process/{YOUR_PROCESS_ID}
```

Example:
```
http://localhost:3002/scholarfinder/process/3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
```

## What I Changed

### File: `src/pages/Index.tsx`

Added a new "ScholarFinder" tab to the main navigation that:
- Explains what ScholarFinder is
- Provides a button to open ScholarFinder workflow
- Shows instructions on how to use it

## Step-by-Step Test

1. **Refresh your browser** (Ctrl+R or Cmd+R)

2. **You should now see 3 tabs** (or 4 if admin):
   - Processes
   - **ScholarFinder** ← NEW!
   - Reports
   - Admin (if admin)

3. **Click "ScholarFinder" tab**

4. **Click "Open ScholarFinder" button**
   - If you have a process selected, it will open ScholarFinder for that process
   - If not, it will ask you to create a process first

5. **Upload a .docx file**

6. **Check Network tab** - should show:
   ```
   POST http://192.168.61.60:8000/upload_extract_metadata
   ```

## Why This Was Confusing

The "Processes" tab uses the **regular workflow** which calls your backend API. This is for general document processing.

The "ScholarFinder" tab uses the **ScholarFinder workflow** which calls the external AI API at `192.168.61.60:8000`. This is specifically for peer reviewer identification.

They are two completely different features with different purposes!

## Quick Reference

| Feature | Tab | API Endpoint | Purpose |
|---------|-----|--------------|---------|
| Regular Processes | "Processes" | `localhost:3002/api/...` | General docs |
| ScholarFinder | "ScholarFinder" | `192.168.61.60:8000/...` | Reviewer AI |

## Still Seeing Old API?

If you're still seeing `localhost:3002/api/processes/{id}/upload`:

1. ✅ Make sure you clicked the **"ScholarFinder"** tab, NOT "Processes"
2. ✅ Make sure you clicked **"Open ScholarFinder"** button
3. ✅ Check the URL contains `/scholarfinder/process/`
4. ✅ Hard refresh (Ctrl+Shift+R)

## Success Checklist

- [ ] I can see the "ScholarFinder" tab
- [ ] I clicked the "ScholarFinder" tab (not "Processes")
- [ ] I clicked "Open ScholarFinder" button
- [ ] URL contains `/scholarfinder/process/`
- [ ] Upload calls `192.168.61.60:8000/upload_extract_metadata`
- [ ] Response contains `job_id` field

If all checkboxes are checked, you're using the correct workflow! ✅
