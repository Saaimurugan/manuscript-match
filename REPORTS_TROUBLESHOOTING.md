# Reports Page Troubleshooting Guide

## Issue: Reports Not Loading

### Root Cause
The backend doesn't have an `/api/admin/processes` endpoint yet. The Reports feature was trying to call a non-existent endpoint.

### Solution Applied
Updated `src/hooks/useReports.ts` to use the existing `/api/processes` endpoint for all users (including admins). The filtering by user is now done on the frontend.

### Changes Made

1. **Modified `useReports` hook** to use `processService.getProcesses()` for all users
2. **Added error handling** to gracefully handle API failures
3. **Added console logging** for debugging
4. **Frontend filtering** for admin user selection

### How to Verify It's Working

1. **Open Browser Console** (F12)
2. **Navigate to Reports tab**
3. **Check console logs** for:
   ```
   Processing report data: { processCount: X, isAdmin: true/false, ... }
   Calculated stats: { totalProcesses: X, ... }
   Status distribution: [...]
   ```

4. **If you see errors:**
   - Check if you're logged in
   - Verify you have processes created
   - Check network tab for failed API calls

### Expected Behavior

#### For Regular Users:
- See only their own processes
- Stats cards show their process counts
- Charts display their data
- No user filter dropdown

#### For Admin Users:
- See all processes in the system
- Can filter by specific user (frontend filtering)
- User Activity tab is visible
- Process table shows user email column

### Current Limitations

1. **No backend admin endpoint**: Admin users currently see the same data as regular users (their own processes only)
2. **Frontend filtering only**: User filtering works only on already-loaded data
3. **No cross-user data**: Until backend endpoint is added, admins can't see other users' processes

### Next Steps to Fully Enable Admin View

To enable full admin functionality, the backend needs:

1. **Create Admin Process Endpoint**:
   ```typescript
   // backend/src/controllers/AdminController.ts
   async getAllProcesses(req: Request, res: Response) {
     // Get all processes across all users
     // Support filtering by userId, dateRange, status
   }
   ```

2. **Add Route**:
   ```typescript
   // backend/src/routes/admin.ts
   router.get('/processes', 
     requirePermission('processes.read'),
     logActivity('ADMIN_VIEW_PROCESSES'),
     adminController.getAllProcesses
   );
   ```

3. **Update Frontend**:
   ```typescript
   // src/hooks/useReports.ts
   // Uncomment the admin service calls once backend is ready
   if (isAdmin && !userId) {
     const response = await adminService.getProcesses({
       limit: 1000,
       dateFrom: getDateFromRange(dateRange),
     });
     return response.data;
   }
   ```

### Testing Checklist

- [ ] Reports page loads without errors
- [ ] Stats cards display correct numbers
- [ ] Status distribution chart renders
- [ ] Timeline chart shows data
- [ ] Process table is searchable and sortable
- [ ] Date range filter works
- [ ] (Admin) User filter dropdown appears
- [ ] (Admin) User Activity tab is visible
- [ ] Export dropdown shows options (functionality is stubbed)
- [ ] Refresh button works

### Debug Commands

```javascript
// In browser console, check current user
console.log('Current user:', JSON.parse(localStorage.getItem('user')));

// Check if processes are loaded
console.log('Processes:', JSON.parse(localStorage.getItem('processes')));

// Force refetch
window.location.reload();
```

### Common Issues

1. **"Failed to load reports"**
   - Check if backend is running
   - Verify authentication token is valid
   - Check network tab for 401/403 errors

2. **Empty charts/tables**
   - Create some test processes first
   - Check date range filter (try "All time")
   - Verify processes exist in database

3. **Admin features not showing**
   - Confirm user role is 'ADMIN'
   - Check localStorage for user object
   - Verify authentication context

### Support

If issues persist:
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify backend logs
4. Ensure database has process data
