# ScholarFinder Quick Test Guide

## ✅ Final Fix Applied

The ScholarFinderWizard page has been updated to properly render the StepWizard with all step configurations.

## Test Steps

### 1. Navigate to ScholarFinder

Open your browser and go to:
```
http://localhost:3002/scholarfinder/process/3f7b9196-f4fd-42ea-b2b2-50aa7b8ce919
```

(Use your actual process ID)

### 2. Open Browser DevTools

- Press `F12` or right-click → "Inspect"
- Go to the **Network** tab
- Make sure "Preserve log" is checked

### 3. Upload a File

- Click on the upload area or drag a `.docx` file
- Watch the Network tab

### 4. Verify the Request

You should see:

**✅ CORRECT**:
```
POST http://192.168.61.60:8000/upload_extract_metadata
Status: 200 OK (or appropriate response)
```

**❌ WRONG** (if you still see this, you're on the wrong page):
```
POST http://localhost:3002/api/processes/{id}/upload
```

## What Changed

### Before (Broken)
- ScholarFinderWizard was a placeholder
- Didn't render actual StepWizard component
- No step configuration passed

### After (Fixed)
- ScholarFinderWizard now imports `workflowConfig`
- Renders StepWizard with proper `steps` prop
- Includes UploadStep that uses ScholarFinder API
- Manages jobId state from upload response

## Files Modified

1. **src/features/scholarfinder/services/ScholarFinderApiService.ts**
   - Base URL: `http://192.168.61.60:8000`
   - All endpoints updated

2. **src/features/scholarfinder/pages/ScholarFinderWizard.tsx**
   - Now properly renders StepWizard
   - Passes workflow configuration
   - Manages state correctly

## Troubleshooting

### Still seeing old endpoint?

**Check your URL bar**. You MUST be at:
```
/scholarfinder/process/{id}
```

NOT at:
```
/processes/{id}
```

These are two completely different workflows!

### Can't connect to external API?

1. **Check if API is running**:
   ```bash
   curl http://192.168.61.60:8000/
   ```

2. **Check network connectivity**:
   ```bash
   ping 192.168.61.60
   ```

3. **Check CORS settings** on the external API

### Page shows error?

- Check browser console for errors
- Verify the process ID exists
- Make sure you're logged in

## Expected Flow

1. **Navigate** → `/scholarfinder/process/{id}`
2. **See** → Upload step with file upload area
3. **Upload** → .docx file
4. **Request** → Goes to `http://192.168.61.60:8000/upload_extract_metadata`
5. **Response** → Contains `job_id`, `heading`, `authors`, etc.
6. **Next** → Automatically moves to metadata review step

## Success Indicators

✅ URL contains `/scholarfinder/process/`
✅ Network request goes to `192.168.61.60:8000`
✅ Response contains `job_id` field
✅ Upload step uses ScholarFinder styling
✅ Progress indicator shows 9 steps

## Need Help?

If you're still seeing the old endpoint after following these steps:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+Shift+R)
3. **Check the URL** one more time
4. **Verify you saved all files** and restarted dev server
