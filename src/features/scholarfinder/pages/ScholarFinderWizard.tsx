// ScholarFinder Wizard
// Step-by-step workflow for reviewer identification

import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessStep } from '../types';

const ScholarFinderWizard: React.FC = () => {
  const { processId } = useParams<{ processId: string }>();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {processId ? `Process: ${processId}` : 'New ScholarFinder Process'}
        </h1>
        <p className="text-gray-600 mt-2">
          Follow the steps below to identify potential peer reviewers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.values(ProcessStep).map((step, index) => (
              <div key={step} className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <span className="capitalize">{step.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              This wizard will be implemented in subsequent tasks. Each step will guide you through
              the complete reviewer identification process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScholarFinderWizard;