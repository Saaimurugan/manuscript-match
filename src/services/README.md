# API Service Infrastructure

This directory contains the API service infrastructure for the ScholarFinder frontend application. It provides a centralized, type-safe way to communicate with the backend API.

## Overview

The API service infrastructure consists of:

- **Base API Service**: Centralized HTTP client with authentication and error handling
- **Configuration Management**: Environment-specific settings
- **TypeScript Interfaces**: Complete type definitions for all API requests/responses
- **Error Handling**: User-friendly error processing and classification
- **Token Management**: JWT token storage and validation

## Files Structure

```
src/services/
├── apiService.ts          # Base API service class
├── index.ts              # Main exports
├── examples/
│   └── apiServiceUsage.ts # Usage examples
└── README.md             # This file

src/types/
├── api.ts                # API type definitions
└── index.ts              # Type exports

src/lib/
└── config.ts             # Configuration management
```

## Configuration

### Environment Variables

The following environment variables can be configured:

```bash
# Backend API Configuration
VITE_API_BASE_URL="http://localhost:3001"    # API base URL
VITE_API_TIMEOUT="30000"                     # Request timeout in ms
VITE_MAX_FILE_SIZE="10485760"                # Max file size in bytes (10MB)
VITE_SUPPORTED_FILE_TYPES="pdf,docx,doc"    # Supported file types
```

### Environment Files

- `.env` - Development environment (default)
- `.env.production` - Production environment

## Usage

### Basic Usage

```typescript
import apiService from '@/services';
import type { LoginCredentials, AuthResponse } from '@/services';

// Login example
const credentials: LoginCredentials = {
  email: 'user@example.com',
  password: 'password123'
};

try {
  const response = await apiService.post<AuthResponse>('/api/auth/login', credentials);
  apiService.setAuthToken(response.data.token);
  console.log('Login successful');
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### File Upload

```typescript
const uploadFile = async (processId: string, file: File) => {
  try {
    const response = await apiService.uploadFile(
      `/api/processes/${processId}/upload`,
      file,
      (progress) => console.log(`Upload: ${progress}%`)
    );
    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

### Error Handling

```typescript
try {
  await apiService.get('/api/protected-endpoint');
} catch (error) {
  const userError = error as UserFriendlyError;
  
  switch (userError.type) {
    case 'AUTHENTICATION_ERROR':
      // Redirect to login
      break;
    case 'NETWORK_ERROR':
      // Show retry option
      break;
    case 'RATE_LIMIT_ERROR':
      // Show rate limit message
      break;
    // ... handle other error types
  }
}
```

## API Service Features

### Authentication Management

- Automatic JWT token attachment to requests
- Token expiration detection and handling
- Secure token storage in localStorage
- Automatic logout on token expiration

### Error Handling

- Network error detection and user-friendly messages
- HTTP status code classification
- Rate limiting detection with retry-after support
- Validation error details extraction
- Global error interceptors

### Request/Response Interceptors

- Automatic authentication header injection
- Request/response logging in development
- Cache-busting for GET requests
- Global error handling

### File Operations

- File upload with progress tracking
- File download with blob handling
- Multipart form data support

## Type Safety

All API interactions are fully typed using TypeScript interfaces:

```typescript
// All request/response types are defined
interface CreateProcessRequest {
  title: string;
  description: string;
}

interface Process {
  id: string;
  title: string;
  description: string;
  currentStep: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

// Usage with full type safety
const createProcess = async (data: CreateProcessRequest): Promise<Process> => {
  const response = await apiService.post<Process>('/api/processes', data);
  return response.data;
};
```

## Configuration Access

```typescript
import { config } from '@/services';

console.log('API Base URL:', config.apiBaseUrl);
console.log('Max file size:', config.maxFileSize);
console.log('Supported types:', config.supportedFileTypes);
```

## Token Management

```typescript
import { TokenManager } from '@/services';

// Check if user has valid token
const token = TokenManager.getToken();
if (token && !TokenManager.isTokenExpired(token)) {
  console.log('User is authenticated');
} else {
  console.log('User needs to login');
  TokenManager.clearToken();
}
```

## Error Types

The service provides user-friendly error classification:

- `NETWORK_ERROR`: Connection issues
- `AUTHENTICATION_ERROR`: Invalid/expired tokens
- `VALIDATION_ERROR`: Invalid request data
- `RATE_LIMIT_ERROR`: Too many requests
- `SERVER_ERROR`: Internal server errors
- `UNKNOWN_ERROR`: Unexpected errors

## Integration with React Query

The API service is designed to work seamlessly with React Query:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import apiService from '@/services';

// Query example
const useProcesses = () => {
  return useQuery({
    queryKey: ['processes'],
    queryFn: () => apiService.get('/api/processes'),
  });
};

// Mutation example
const useCreateProcess = () => {
  return useMutation({
    mutationFn: (data: CreateProcessRequest) => 
      apiService.post('/api/processes', data),
  });
};
```

## Development vs Production

The service automatically adapts to different environments:

- **Development**: Detailed logging, relaxed timeouts
- **Production**: Minimal logging, optimized performance

## Security Considerations

- JWT tokens are stored in localStorage (consider httpOnly cookies for production)
- Automatic token expiration handling
- Request/response interceptors for security headers
- HTTPS enforcement in production (via configuration)

## Next Steps

This infrastructure is ready for integration with:

1. Authentication service implementation
2. Process management service
3. File upload service
4. Search and recommendation services
5. React Query hooks for data fetching

See the `examples/apiServiceUsage.ts` file for detailed usage examples.