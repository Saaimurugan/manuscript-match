/**
 * API Service Usage Examples
 * Demonstrates how to use the API service infrastructure
 */

import apiService, { TokenManager, ErrorHandler } from '../apiService';
import type { 
  LoginCredentials, 
  AuthResponse, 
  Process, 
  CreateProcessRequest,
  UserFriendlyError 
} from '../../types/api';

/**
 * Example: Authentication
 */
export const authenticationExample = async () => {
  try {
    // Login
    const credentials: LoginCredentials = {
      email: 'user@example.com',
      password: 'password123'
    };

    const authResponse = await apiService.post<AuthResponse>('/api/auth/login', credentials);
    
    // Set the token for future requests
    apiService.setAuthToken(authResponse.data.token);
    
    console.log('Login successful:', authResponse.data.user);
    
    // Check if authenticated
    if (apiService.isAuthenticated()) {
      console.log('User is authenticated');
    }
    
  } catch (error) {
    const userError = error as UserFriendlyError;
    console.error('Login failed:', userError.message);
    
    if (userError.action === 'REDIRECT_TO_LOGIN') {
      // Handle redirect to login
      window.location.href = '/login';
    }
  }
};

/**
 * Example: Process Management
 */
export const processManagementExample = async () => {
  try {
    // Create a new process
    const createRequest: CreateProcessRequest = {
      title: 'My Research Analysis',
      description: 'Analyzing manuscript for potential reviewers'
    };

    const newProcess = await apiService.post<Process>('/api/processes', createRequest);
    console.log('Process created:', newProcess.data);

    // Get all processes
    const processes = await apiService.get<Process[]>('/api/processes');
    console.log('All processes:', processes.data);

    // Get specific process
    const processId = newProcess.data.id;
    const process = await apiService.get<Process>(`/api/processes/${processId}`);
    console.log('Process details:', process.data);

    // Update process
    const updateData = { currentStep: 2 };
    const updatedProcess = await apiService.patch<Process>(`/api/processes/${processId}`, updateData);
    console.log('Process updated:', updatedProcess.data);

  } catch (error) {
    const userError = error as UserFriendlyError;
    console.error('Process management failed:', userError.message);
  }
};

/**
 * Example: File Upload
 */
export const fileUploadExample = async (processId: string, file: File) => {
  try {
    const uploadResponse = await apiService.uploadFile(
      `/api/processes/${processId}/upload`,
      file,
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
      }
    );

    console.log('File uploaded successfully:', uploadResponse.data);
    
  } catch (error) {
    const userError = error as UserFriendlyError;
    console.error('File upload failed:', userError.message);
  }
};

/**
 * Example: Error Handling
 */
export const errorHandlingExample = async () => {
  try {
    // This will likely fail if not authenticated
    await apiService.get('/api/admin/stats');
    
  } catch (error) {
    const userError = error as UserFriendlyError;
    
    switch (userError.type) {
      case 'AUTHENTICATION_ERROR':
        console.log('Redirecting to login...');
        // Handle authentication error
        break;
        
      case 'NETWORK_ERROR':
        console.log('Network error, showing retry option...');
        // Show retry button
        break;
        
      case 'RATE_LIMIT_ERROR':
        console.log(`Rate limited, retry after ${userError.retryAfter} seconds`);
        // Show countdown timer
        break;
        
      case 'VALIDATION_ERROR':
        console.log('Validation error:', userError.details);
        // Show field-specific errors
        break;
        
      case 'SERVER_ERROR':
        console.log('Server error, contact support');
        // Show support contact info
        break;
        
      default:
        console.log('Unknown error:', userError.message);
    }
  }
};

/**
 * Example: Configuration Usage
 */
export const configurationExample = () => {
  // Access configuration values
  console.log('API Base URL:', apiService.getAuthToken());
  console.log('Max file size:', '10MB'); // From config
  console.log('Supported file types:', ['pdf', 'docx', 'doc']); // From config
  
  // Check if in development mode
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    console.log('Running in development mode');
  }
};

/**
 * Example: Token Management
 */
export const tokenManagementExample = () => {
  // Check if token exists
  const token = TokenManager.getToken();
  if (token) {
    console.log('Token found');
    
    // Check if token is expired
    if (TokenManager.isTokenExpired(token)) {
      console.log('Token is expired, clearing...');
      TokenManager.clearToken();
      // Redirect to login
    } else {
      console.log('Token is valid');
    }
  } else {
    console.log('No token found');
  }
};