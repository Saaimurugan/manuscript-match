# Authentication Error Fix Guide

## Problem
You're seeing "MEDIUM - AUTHENTICATION ERROR" when trying to upload a manuscript file.

Error ID: `auth_error_1761316263052_k86viqsou`

## Root Cause
The authentication token is either:
1. Not being sent with the request
2. Expired or invalid
3. Not properly set in the API service after login

## Quick Fixes

### Fix 1: Check if You're Logged In

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('scholarfinder_token')`
4. If it returns `null`, you need to log in again

### Fix 2: Verify Token is Set in API Service

1. Add the Auth Debug Panel to your app temporarily
2. Check if "Token in API Service" shows "Present"
3. If not, the token isn't being set after login

### Fix 3: Clear and Re-login

1. Open browser DevTools (F12)
2. Go to Application tab → Local Storage
3. Clear all `scholarfinder_*` keys
4. Refresh the page
5. Log in again

### Fix 4: Check Token Expiration

```javascript
// Run in browser console
const token = localStorage.getItem('scholarfinder_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiresAt = new Date(payload.exp * 1000);
  console.log('Token expires at:', expiresAt);
  console.log('Is expired:', expiresAt < new Date());
}
```

## Debugging Steps

### Step 1: Add Debug Panel

Add the AuthDebugPanel component to your page:

```tsx
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';

// In your component
<AuthDebugPanel />
```

### Step 2: Check Network Requests

1. Open DevTools → Network tab
2. Try to upload a file
3. Find the upload request
4. Check the "Headers" section
5. Look for `Authorization: Bearer <token>`
6. If missing, the token isn't being sent

### Step 3: Check Console for Errors

Look for these error messages:
- "Authorization header is required"
- "Token is required"
- "Token expired"
- "Invalid token"

## Common Issues and Solutions

### Issue 1: Token Not Set After Login

**Symptom:** You can log in, but API calls fail with 401

**Solution:**
```typescript
// In AuthContext.tsx, after successful login:
const login = async (credentials: LoginCredentials) => {
  const authResponse = await authService.login(credentials);
  
  // Make sure this is called:
  setToken(authResponse.token);
  
  // And this is called in authService.login():
  apiService.setAuthToken(authResponse.token);
};
```

### Issue 2: Token Expired

**Symptom:** Was working, now getting 401 errors

**Solution:**
- Log out and log in again
- Or implement automatic token refresh

### Issue 3: Token Not Sent with Requests

**Symptom:** Token exists but not in request headers

**Solution:**
Check that apiService is properly initialized:
```typescript
// In apiService.ts constructor:
const storedToken = TokenManager.getToken();
if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
  this.setAuthToken(storedToken);
}
```

### Issue 4: CORS Issues

**Symptom:** Network error, no response

**Solution:**
1. Check backend CORS configuration
2. Ensure frontend URL is in allowed origins
3. Check that credentials are included in requests

## Code Fixes

### Fix: Ensure Token is Set on App Load

In `src/services/apiService.ts`:

```typescript
constructor(apiConfig?: Partial<ApiConfig>) {
  // ... existing code ...
  
  // Initialize with stored token if available
  const storedToken = TokenManager.getToken();
  if (storedToken && !TokenManager.isTokenExpired(storedToken)) {
    this.setAuthToken(storedToken);
  }
}
```

### Fix: Ensure Token is Set After Login

In `src/services/authService.ts`:

```typescript
async login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await apiService.post('/api/auth/login', credentials);
  const authResponse = response.data.data || response.data;
  
  // IMPORTANT: Set token in API service
  if (authResponse.token) {
    apiService.setAuthToken(authResponse.token);
    
    if (authResponse.refreshToken) {
      TokenManager.setRefreshToken(authResponse.refreshToken);
    }
  }
  
  return authResponse;
}
```

### Fix: Ensure Token is Set in Context

In `src/contexts/AuthContext.tsx`:

```typescript
const login = async (credentials: LoginCredentials): Promise<void> => {
  const authResponse = await authService.login(credentials);
  
  // Set in context state
  setToken(authResponse.token);
  setUser(authResponse.user);
  
  // Token should already be set in apiService by authService.login()
  // But you can double-check:
  if (!apiService.getAuthToken()) {
    apiService.setAuthToken(authResponse.token);
  }
};
```

## Testing the Fix

### Test 1: Check Token After Login

```javascript
// In browser console after login:
console.log('LocalStorage token:', localStorage.getItem('scholarfinder_token'));
console.log('API Service token:', apiService.getAuthToken());
// Both should show the same token
```

### Test 2: Check Request Headers

1. Open DevTools → Network tab
2. Make any API request
3. Check request headers
4. Should see: `Authorization: Bearer eyJhbGc...`

### Test 3: Try Upload Again

1. Log out
2. Clear browser cache
3. Log in again
4. Try uploading a file
5. Should work now

## Prevention

### 1. Add Token Validation on App Load

```typescript
useEffect(() => {
  const token = TokenManager.getToken();
  if (token) {
    if (TokenManager.isTokenExpired(token)) {
      // Clear expired token
      TokenManager.clearToken();
      apiService.clearAuthToken();
    } else {
      // Ensure token is set in API service
      apiService.setAuthToken(token);
    }
  }
}, []);
```

### 2. Add Automatic Token Refresh

```typescript
// In apiService.ts response interceptor:
if (error.response?.status === 401) {
  try {
    const newToken = await this.refreshAuthToken();
    // Retry original request with new token
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return this.axiosInstance.request(originalRequest);
  } catch (refreshError) {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

### 3. Add Token Expiration Warning

```typescript
// Check if token expires soon (e.g., within 5 minutes)
if (TokenManager.isTokenExpiringSoon(token, 5)) {
  // Show warning or auto-refresh
  await refreshToken();
}
```

## Backend Verification

### Check Backend Logs

Look for these in backend console:
```
CORS Debug - Origin: http://localhost:5173, Method: POST, Path: /api/processes/xxx/upload
Authorization header is required
Token is required
Invalid token
Token expired
```

### Verify Authentication Middleware

In `backend/src/routes/processes.ts`:
```typescript
// Should have this at the top:
router.use(authenticate);

// Then the upload route:
router.post('/:id/upload', uploadSingle, handleUploadError, processController.uploadManuscript);
```

### Test Backend Directly

```bash
# Get your token from localStorage
# Then test the endpoint:
curl -X POST http://localhost:3001/api/processes/YOUR_PROCESS_ID/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.pdf"
```

## Still Not Working?

1. **Check browser console** for any JavaScript errors
2. **Check network tab** for the actual request/response
3. **Check backend logs** for authentication errors
4. **Try incognito mode** to rule out cache issues
5. **Check if other API calls work** (e.g., getting processes)
6. **Verify backend is running** on the correct port
7. **Check CORS configuration** in backend

## Contact Support

If none of these fixes work, provide:
1. Browser console logs
2. Network tab screenshot showing the failed request
3. Backend console logs
4. Steps to reproduce the issue
5. Error ID from the error message

## Quick Checklist

- [ ] Logged in successfully
- [ ] Token exists in localStorage
- [ ] Token is not expired
- [ ] Token is set in API service
- [ ] Authorization header is sent with requests
- [ ] Backend authentication middleware is applied
- [ ] CORS is properly configured
- [ ] No JavaScript errors in console
- [ ] Backend is running and accessible

If all checkboxes are checked and it still doesn't work, there may be a deeper issue that requires investigation.
