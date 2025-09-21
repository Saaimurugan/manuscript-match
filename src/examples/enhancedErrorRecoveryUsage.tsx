/**
 * Example usage of enhanced ErrorBoundary error recovery mechanisms
 * Demonstrates the improvements implemented in task 6
 */

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Component that can simulate different types of errors
const ErrorSimulator = ({ errorType }: { errorType: string | null }) => {
  if (errorType === 'network') {
    throw new Error('Network request failed - connection timeout');
  } else if (errorType === 'syntax') {
    throw new Error('Unexpected token in JSON at position 0');
  } else if (errorType === 'user') {
    throw new Error('Validation failed - required field missing');
  } else if (errorType === 'system') {
    throw new Error('Memory quota exceeded - insufficient resources');
  } else if (errorType === 'runtime') {
    throw new Error('Cannot read properties of undefined (reading \'length\')');
  }
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-green-800 font-semibold">✅ No Error</h3>
      <p className="text-green-600">Component is working normally.</p>
    </div>
  );
};

// Component to demonstrate error boundary isolation
const IsolatedComponent = ({ shouldError }: { shouldError: boolean }) => {
  if (shouldError) {
    throw new Error('Critical error in isolated component');
  }
  
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-blue-800 font-semibold">🔒 Isolated Component</h3>
      <p className="text-blue-600">This component is protected by error isolation.</p>
    </div>
  );
};

/**
 * Enhanced Error Recovery Demo Component
 */
export const EnhancedErrorRecoveryDemo: React.FC = () => {
  const [errorType, setErrorType] = useState<string | null>(null);
  const [isolatedError, setIsolatedError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const triggerError = (type: string) => {
    setErrorType(type);
  };

  const clearError = () => {
    setErrorType(null);
    setIsolatedError(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced ErrorBoundary Recovery Mechanisms Demo</CardTitle>
          <CardDescription>
            Demonstrates the enhanced error recovery features implemented in task 6:
            improved retry functionality, enhanced navigation, error isolation, and graceful degradation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button 
              onClick={() => triggerError('network')} 
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Network Error
            </Button>
            <Button 
              onClick={() => triggerError('user')} 
              variant="outline"
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
            >
              User Error
            </Button>
            <Button 
              onClick={() => triggerError('system')} 
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              System Error
            </Button>
            <Button 
              onClick={() => triggerError('syntax')} 
              variant="outline"
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              Syntax Error
            </Button>
            <Button 
              onClick={() => triggerError('runtime')} 
              variant="outline"
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              Runtime Error
            </Button>
            <Button 
              onClick={clearError} 
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              Clear Errors
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setShowDetails(!showDetails)} 
              variant="ghost"
              size="sm"
            >
              {showDetails ? 'Hide' : 'Show'} Implementation Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ Enhanced Try Again</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Comprehensive state reset</li>
                  <li>• Component cache clearing</li>
                  <li>• Session data cleanup</li>
                  <li>• Retry count tracking</li>
                  <li>• Enhanced error logging</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">🏠 Enhanced Go Home</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Multiple navigation strategies</li>
                  <li>• React Router integration</li>
                  <li>• History API fallback</li>
                  <li>• Comprehensive cleanup</li>
                  <li>• Force reload as last resort</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-purple-600 mb-2">🔒 Error Isolation</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Prevents cascading failures</li>
                  <li>• Isolation barriers</li>
                  <li>• Error propagation prevention</li>
                  <li>• Component state isolation</li>
                  <li>• Automatic cleanup</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-orange-600 mb-2">🎯 Graceful Degradation</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Error type-specific UI</li>
                  <li>• Network error handling</li>
                  <li>• User error guidance</li>
                  <li>• System error reporting</li>
                  <li>• Syntax error recovery</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Standard Error Boundary Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Error Boundary with Graceful Degradation</CardTitle>
          <CardDescription>
            This component demonstrates graceful degradation based on error type.
            Different error types will show different UI layouts and recovery options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorBoundary 
            enableReporting={true}
            showErrorDetails={true}
          >
            <ErrorSimulator errorType={errorType} />
          </ErrorBoundary>
        </CardContent>
      </Card>

      {/* Isolated Error Boundary Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Isolated Error Boundary Demo</CardTitle>
          <CardDescription>
            This component demonstrates error isolation to prevent cascading failures.
            Errors in this boundary won't affect other parts of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsolatedError(true)} 
              variant="destructive"
              size="sm"
            >
              Trigger Isolated Error
            </Button>
            <Button 
              onClick={() => setIsolatedError(false)} 
              variant="outline"
              size="sm"
            >
              Clear Isolated Error
            </Button>
          </div>
          
          <ErrorBoundary 
            isolateErrors={true}
            enableReporting={true}
          >
            <IsolatedComponent shouldError={isolatedError} />
          </ErrorBoundary>
        </CardContent>
      </Card>

      {/* Recovery Mechanisms Info */}
      <Card>
        <CardHeader>
          <CardTitle>Recovery Mechanisms Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">🔄 Automatic Recovery</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Network Errors:</span>
                  <span className="text-blue-600">3 second delay</span>
                </div>
                <div className="flex justify-between">
                  <span>User Errors:</span>
                  <span className="text-yellow-600">1 second delay</span>
                </div>
                <div className="flex justify-between">
                  <span>System Errors:</span>
                  <span className="text-red-600">5 second delay</span>
                </div>
                <div className="flex justify-between">
                  <span>Default:</span>
                  <span className="text-gray-600">2 second delay</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">🎯 Error Categorization</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="text-blue-600">Connection issues</span>
                </div>
                <div className="flex justify-between">
                  <span>User:</span>
                  <span className="text-yellow-600">Input validation</span>
                </div>
                <div className="flex justify-between">
                  <span>System:</span>
                  <span className="text-red-600">Resource limits</span>
                </div>
                <div className="flex justify-between">
                  <span>Syntax:</span>
                  <span className="text-purple-600">Code errors</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedErrorRecoveryDemo;