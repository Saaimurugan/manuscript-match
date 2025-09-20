# Authentication System

This directory contains the complete authentication system for the ScholarFinder application, including JWT token management, React context for global state, and authentication interceptors.

## Components

### AuthService (`authService.ts`)
The main authentication service class that handles:
- User login and logout
- JWT token verification and refresh
- User profile management
- Password change functionality
- Password reset functionality

### AuthContext (`../contexts/AuthContext.tsx`)
React context provider that manages global authentication state:
- User authentication status
- Current user profile
- Loading states and error handling
- Authentication methods accessible throughout the app

### TokenManager (in `../services/apiService.ts`)
Utility class for JWT token management:
- Secure token storage in localStorage
- Token expiration checking
- Automatic token refresh
- Token payload extraction

### Authentication Components (`../components/auth/`)
- `LoginForm`: Complete login form with validation
- `ProtectedRoute`: Higher-order component for route protection
- `AdminRoute`: Admin-specific route protection
- `UserProfile`: User profile management component

## Usage

### 1. Wrap your app with AuthProvider

```tsx
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Use authentication in components

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  return (
    <div>
      <h1>Welcome, {user?.email}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. Protect routes

```tsx
import { ProtectedRoute, AdminRoute } from './components/auth';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
    </Routes>
  );
}
```

### 4. Make authenticated API calls

The authentication system automatically handles:
- Adding JWT tokens to API requests
- Refreshing expired tokens
- Redirecting to login on authentication failures

```tsx
import { apiService } from './services/apiService';

// API calls will automatically include authentication headers
const data = await apiService.get('/api/protected-endpoint');
```

## Features

### Automatic Token Refresh
- Tokens are automatically refreshed when they're about to expire
- Failed requests due to expired tokens are automatically retried with new tokens
- Refresh failures redirect users to the login page

### Secure Token Storage
- JWT tokens are stored in localStorage
- Token expiration is checked before each request
- Tokens are automatically cleared on logout or expiration

### Error Handling
- Comprehensive error handling for authentication failures
- User-friendly error messages
- Automatic retry mechanisms for network issues

### Role-Based Access Control
- Support for user roles (USER, ADMIN)
- Role-specific route protection
- Easy role checking with custom hooks

## API Endpoints

The authentication system expects the following backend endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

## Security Considerations

- JWT tokens are validated on both client and server
- Automatic token refresh prevents session timeouts
- Sensitive operations require re-authentication
- HTTPS should be used in production
- Tokens are cleared on logout and browser close

## Testing

The authentication system includes comprehensive error handling and can be tested with:
- Valid and invalid login credentials
- Expired tokens
- Network failures
- Server errors
- Role-based access scenarios

## Environment Variables

Configure the following environment variables:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=30000
```

## Migration from Mock Authentication

To migrate from mock authentication:

1. Replace mock login components with `LoginForm`
2. Wrap your app with `AuthProvider`
3. Replace manual authentication checks with `useAuth` hook
4. Update protected routes to use `ProtectedRoute` component
5. Remove mock user data and use real API calls

The authentication system is designed to be a drop-in replacement for mock authentication while providing production-ready security features.