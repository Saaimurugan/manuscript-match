// Process List
// List view of all ScholarFinder processes

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ProcessList: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Processes</h1>
          <p className="text-gray-600 mt-2">
            Manage your ScholarFinder manuscript analyses
          </p>
        </div>
        <Link to="/scholarfinder/new">
          <Button>
            New Process
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Process History</CardTitle>
          <CardDescription>
            Your manuscript analysis processes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No processes found</p>
            <p className="text-sm text-gray-400 mb-6">
              Start your first manuscript analysis to see processes here
            </p>
            <Link to="/scholarfinder/new">
              <Button>
                Upload Your First Manuscript
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessList;