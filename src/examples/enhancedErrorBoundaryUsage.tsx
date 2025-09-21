/**
 * Enhanced ErrorBoundary Usage Examples
 * Demonstrates the new bug reporting features implemented in task 5
 */

import React from 'react';
import { ErrorBoundary } from '../components/error/ErrorBoundary';

// Example component that can throw errors for testing
const ProblematicComponent = ({ shouldError = false, errorType = 'runtime' }) => {
  if (shouldError) {
    if (errorType === 'network') {
      throw new Error('Failed to fetch data from API');
    } else if (errorType === 'validation') {
      throw new Error('Invalid user input provided');
    } else {
      throw new Error('Something went wrong in the component');
    }
  }
  
  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded">
      <h3 className="text-green-800 font-semibold">Component Working Correctly</h3>
      <p className="text-green-600">No errors detected!</p>
    </div>
  );
};

// Example 1: Basic Enhanced Error Boundary with Bug Reporting
export const BasicEnhancedErrorBoundary = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Enhanced Error Boundary with Bug Reporting</h2>
      <p className="text-gray-600">
        This example shows the enhanced bug reporting features:
      </p>
      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
        <li>Enhanced "Report Bug" button with loading states</li>
        <li>Bug report dialog with user description field</li>
        <li>Status indicators (sending, sent, failed)</li>
        <li>Integration with ErrorReportService</li>
        <li>User confirmation and error messages</li>
      </ul>
      
      <ErrorBoundary 
        enableReporting={true}
        showErrorDetails={true}
        onError={(error, errorInfo) => {
          console.log('Custom error handler called:', error.message);
        }}
      >
        <ProblematicComponent shouldError={true} errorType="runtime" />
      </ErrorBoundary>
    </div>
  );
};

// Example 2: Network Error with Enhanced Reporting
export const NetworkErrorExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Network Error with Enhanced Reporting</h2>
      <p className="text-gray-600">
        This example demonstrates enhanced reporting for network errors:
      </p>
      
      <ErrorBoundary 
        enableReporting={true}
        showErrorDetails={true}
      >
        <ProblematicComponent shouldError={true} errorType="network" />
      </ErrorBoundary>
    </div>
  );
};

// Example 3: Working Component (No Error)
export const WorkingComponentExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Working Component (No Error)</h2>
      <p className="text-gray-600">
        This example shows normal operation when no errors occur:
      </p>
      
      <ErrorBoundary 
        enableReporting={true}
        showErrorDetails={true}
      >
        <ProblematicComponent shouldError={false} />
      </ErrorBoundary>
    </div>
  );
};

// Example 4: Disabled Reporting
export const DisabledReportingExample = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Error Boundary with Disabled Reporting</h2>
      <p className="text-gray-600">
        This example shows error handling without the bug reporting feature:
      </p>
      
      <ErrorBoundary 
        enableReporting={false}
        showErrorDetails={true}
      >
        <ProblematicComponent shouldError={true} errorType="validation" />
      </ErrorBoundary>
    </div>
  );
};

// Main demo component
export const EnhancedErrorBoundaryDemo = () => {
  const [selectedExample, setSelectedExample] = React.useState<string>('basic');

  const examples = {
    basic: <BasicEnhancedErrorBoundary />,
    network: <NetworkErrorExample />,
    working: <WorkingComponentExample />,
    disabled: <DisabledReportingExample />,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced ErrorBoundary Demo
        </h1>
        <p className="text-gray-600">
          Demonstrating the enhanced bug reporting features implemented in Task 5
        </p>
      </div>

      {/* Example Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {Object.keys(examples).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedExample(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedExample === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)} Example
          </button>
        ))}
      </div>

      {/* Selected Example */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        {examples[selectedExample as keyof typeof examples]}
      </div>

      {/* Feature Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          ✨ Enhanced Features Implemented
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">UI Enhancements:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Enhanced "Report Bug" button with status icons</li>
              <li>• Loading states with spinner animation</li>
              <li>• Success/failure status indicators</li>
              <li>• Interactive bug report dialog</li>
              <li>• User description input field</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Functionality:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Integration with ErrorReportService</li>
              <li>• Comprehensive error data collection</li>
              <li>• User confirmation messages</li>
              <li>• Error handling for report submission</li>
              <li>• Local backup of error reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedErrorBoundaryDemo;