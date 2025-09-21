/**
 * Example usage of ErrorReportService
 * Demonstrates how to integrate error reporting with components
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { errorReportService } from '@/services/errorReportService';
import { AlertTriangle, Bug, CheckCircle } from 'lucide-react';

export const ErrorReportServiceUsage: React.FC = () => {
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [reportId, setReportId] = useState<string>('');

  const simulateError = () => {
    try {
      // Simulate an error
      throw new Error('This is a simulated error for testing');
    } catch (error) {
      handleError(error as Error);
    }
  };

  const handleError = async (error: Error) => {
    // Generate error report
    const report = errorReportService.generateReport(error, undefined, {
      component: 'ErrorReportServiceUsage',
      userAction: 'clicked simulate error button',
      additionalInfo: 'This is a test error report',
    });

    // Save locally as backup
    errorReportService.saveReportLocally(report);

    // Submit report
    setReportStatus('sending');
    
    try {
      const result = await errorReportService.submitReport(
        report,
        'User clicked the simulate error button to test error reporting'
      );

      if (result.success) {
        setReportStatus('sent');
        setReportId(result.reportId || report.errorId);
      } else {
        setReportStatus('failed');
        console.error('Failed to submit error report:', result.error);
      }
    } catch (submitError) {
      setReportStatus('failed');
      console.error('Error submitting report:', submitError);
    }
  };

  const resetStatus = () => {
    setReportStatus('idle');
    setReportId('');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Error Report Service Demo
          </CardTitle>
          <CardDescription>
            Test the error reporting functionality by simulating an error
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={simulateError}
              disabled={reportStatus === 'sending'}
              variant="destructive"
            >
              {reportStatus === 'sending' ? 'Reporting...' : 'Simulate Error'}
            </Button>
            
            {reportStatus !== 'idle' && (
              <Button onClick={resetStatus} variant="outline">
                Reset
              </Button>
            )}
          </div>

          {reportStatus === 'sending' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Generating and submitting error report...
              </AlertDescription>
            </Alert>
          )}

          {reportStatus === 'sent' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Error report submitted successfully!
                <br />
                Report ID: <code className="bg-green-100 px-1 rounded">{reportId}</code>
              </AlertDescription>
            </Alert>
          )}

          {reportStatus === 'failed' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Failed to submit error report. The report has been saved locally and will be retried automatically.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Report Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Data Collection</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Error message and stack trace</li>
                <li>• Component stack information</li>
                <li>• User actions leading to error</li>
                <li>• Browser and environment details</li>
                <li>• Timestamp and session tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Privacy & Security</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Automatic data sanitization</li>
                <li>• Email and sensitive data redaction</li>
                <li>• No personal information stored</li>
                <li>• Secure report transmission</li>
                <li>• Local backup for reliability</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Reliability</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Automatic retry mechanism</li>
                <li>• Local storage backup</li>
                <li>• Offline support</li>
                <li>• Graceful error handling</li>
                <li>• Development vs production modes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Integration</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Works with ErrorBoundary</li>
                <li>• Manual error reporting</li>
                <li>• Custom context support</li>
                <li>• Multiple submission channels</li>
                <li>• Easy to integrate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Import the service
import { errorReportService } from '@/services/errorReportService';

// Generate and submit error report
try {
  // Your code that might throw an error
  throw new Error('Something went wrong');
} catch (error) {
  // Generate comprehensive error report
  const report = errorReportService.generateReport(
    error,
    errorInfo, // React ErrorInfo (optional)
    { 
      component: 'MyComponent',
      userAction: 'clicked submit button',
      customData: 'additional context'
    }
  );

  // Submit the report
  const result = await errorReportService.submitReport(
    report,
    'User description of what happened'
  );

  if (result.success) {
    console.log('Report submitted:', result.reportId);
  } else {
    console.error('Report failed:', result.error);
  }
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorReportServiceUsage;