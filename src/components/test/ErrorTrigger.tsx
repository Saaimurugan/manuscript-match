import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ErrorTrigger: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will trigger the ErrorBoundary
    throw new Error('Test error for debugging the Report Bug button');
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Error Boundary Test</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-gray-600">
          Click the button below to trigger an error and test the Report Bug functionality.
        </p>
        <Button 
          onClick={() => setShouldError(true)}
          variant="destructive"
          className="w-full"
        >
          Trigger Error
        </Button>
      </CardContent>
    </Card>
  );
};

export default ErrorTrigger;