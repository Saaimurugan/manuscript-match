/**
 * Demonstration of AuthErrorBoundary functionality
 * Shows how the error boundary handles different types of authentication errors
 */

import React, { useState } from 'react';
import { AuthErrorBoundary } from './AuthErrorBoundary';

// Component that can simulate different authentication errors
const AuthErrorSimulator: React.FC = () => {
  const [errorType, setErrorType] = useState<string | null>(null);

  const simulateError = (type: string) => {
    setErrorType(type);
  };

  // Throw error based on selected type
  if (errorType) {
    switch (errorType) {
      case 'token-invalid':
        throw new Error('Invalid token format - JWT must have 3 parts');
      case 'token-expired':
        throw new Error('Token has expired at 2023-01-01T00:00:00Z');
      case 'decode-error':
        throw new Error('InvalidCharacterError: Failed to execute \'atob\' on \'Window\'');
      case 'malformed-token':
        throw new Error('Malformed JWT token structure');
      case 'refresh-failed':
        throw new Error('Token refresh failed with 401 Unauthorized');
      case 'network-error':
        throw new Error('Network connection failed - timeout after 30s');
      default:
        throw new Error('Unknown authentication error');
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Authentication Error Boundary Demo</h2>
      <p className="text-gray-600">
        Click any button below to simulate different authentication errors and see how the AuthErrorBoundary handles them.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => simulateError('token-invalid')}
          className="p-3 bg-red-100 hover:bg-red-200 rounded border text-left"
        >
          <strong>Invalid Token Format</strong>
          <br />
          <small>Simulates malformed JWT structure</small>
        </button>
        
        <button
          onClick={() => simulateError('token-expired')}
          className="p-3 bg-orange-100 hover:bg-orange-200 rounded border text-left"
        >
          <strong>Expired Token</strong>
          <br />
          <small>Simulates token expiration</small>
        </button>
        
        <button
          onClick={() => simulateError('decode-error')}
          className="p-3 bg-red-100 hover:bg-red-200 rounded border text-left"
        >
          <strong>Decode Error</strong>
          <br />
          <small>Simulates base64 decoding failure</small>
        </button>
        
        <button
          onClick={() => simulateError('malformed-token')}
          className="p-3 bg-red-100 hover:bg-red-200 rounded border text-left"
        >
          <strong>Malformed Token</strong>
          <br />
          <small>Simulates corrupted token data</small>
        </button>
        
        <button
          onClick={() => simulateError('refresh-failed')}
          className="p-3 bg-purple-100 hover:bg-purple-200 rounded border text-left"
        >
          <strong>Refresh Failed</strong>
          <br />
          <small>Simulates token refresh failure</small>
        </button>
        
        <button
          onClick={() => simulateError('network-error')}
          className="p-3 bg-yellow-100 hover:bg-yellow-200 rounded border text-left"
        >
          <strong>Network Error</strong>
          <br />
          <small>Simulates connection problems</small>
        </button>
      </div>
      
      <div className="mt-6 p-4 bg-green-100 rounded border">
        <h3 className="font-semibold text-green-800">Normal Operation</h3>
        <p className="text-green-700">
          This component is working normally. The AuthErrorBoundary is protecting it from authentication errors.
        </p>
      </div>
    </div>
  );
};

// Demo component with AuthErrorBoundary
export const AuthErrorBoundaryDemo: React.FC = () => {
  const handleAuthError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.log('Demo: Authentication error caught:', error.message);
    console.log('Demo: Component stack:', errorInfo.componentStack);
  };

  const handleRecovery = () => {
    console.log('Demo: Authentication error recovery successful');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">AuthErrorBoundary Demonstration</h1>
        
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">How it works:</h2>
          <ul className="space-y-2 text-blue-700">
            <li>• <strong>Error Detection:</strong> Catches authentication-related JavaScript errors</li>
            <li>• <strong>Error Categorization:</strong> Identifies the type of authentication error</li>
            <li>• <strong>Automatic Recovery:</strong> Attempts appropriate recovery actions</li>
            <li>• <strong>Fallback UI:</strong> Shows user-friendly error messages</li>
            <li>• <strong>Logging:</strong> Records errors for monitoring and debugging</li>
          </ul>
        </div>

        <AuthErrorBoundary
          onAuthError={handleAuthError}
          onRecovery={handleRecovery}
          enableAutoRecovery={true}
          maxRecoveryAttempts={3}
        >
          <AuthErrorSimulator />
        </AuthErrorBoundary>
        
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Error Types Handled:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-red-600">High Severity:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Invalid token format</li>
                <li>Malformed JWT structure</li>
                <li>Base64 decode errors</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-orange-600">Medium Severity:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Token expiration</li>
                <li>Network connection issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-600">Critical Severity:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Token refresh failures</li>
                <li>Authentication service errors</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-600">Recovery Actions:</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Automatic token refresh</li>
                <li>Token cleanup</li>
                <li>Graceful logout</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthErrorBoundaryDemo;