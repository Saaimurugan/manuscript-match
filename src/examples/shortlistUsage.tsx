/**
 * Shortlist Management Usage Examples
 * Demonstrates how to use shortlist components and hooks
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShortlistManager } from '../components/shortlist/ShortlistManager';
import { useShortlists, useCreateShortlist, useExportShortlist } from '../hooks/useShortlists';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Mock data for examples
const mockReviewers = [
  {
    id: '1',
    name: 'Dr. Jane Smith',
    email: 'jane.smith@university.edu'
  },
  {
    id: '2',
    name: 'Prof. John Doe',
    email: 'john.doe@research.org'
  },
  {
    id: '3',
    name: 'Dr. Alice Johnson',
    email: 'alice.johnson@institute.com'
  },
  {
    id: '4',
    name: 'Prof. Bob Wilson',
    email: 'bob.wilson@college.edu'
  }
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

/**
 * Example 1: Basic Shortlist Manager Usage
 */
export const BasicShortlistManagerExample: React.FC = () => {
  const processId = 'example-process-1';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Basic Shortlist Manager</h2>
        <ShortlistManager 
          processId={processId}
          availableReviewers={mockReviewers}
        />
      </div>
    </QueryClientProvider>
  );
};

/**
 * Example 2: Using Shortlist Hooks Directly
 */
const ShortlistHooksExample: React.FC = () => {
  const processId = 'example-process-2';
  const { data: shortlists, isLoading, error } = useShortlists(processId);
  const createShortlistMutation = useCreateShortlist();
  const exportShortlistMutation = useExportShortlist();

  const handleCreateShortlist = async () => {
    try {
      await createShortlistMutation.mutateAsync({
        processId,
        data: {
          name: 'Example Shortlist',
          selectedReviewers: ['1', '2']
        }
      });
      alert('Shortlist created successfully!');
    } catch (error) {
      alert('Failed to create shortlist');
    }
  };

  const handleExportShortlist = async (shortlistId: string) => {
    try {
      await exportShortlistMutation.mutateAsync({
        processId,
        shortlistId,
        format: 'xlsx'
      });
      alert('Export started!');
    } catch (error) {
      alert('Failed to export shortlist');
    }
  };

  if (isLoading) return <div>Loading shortlists...</div>;
  if (error) return <div>Error loading shortlists</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Shortlists ({shortlists?.length || 0})</h3>
        <Button 
          onClick={handleCreateShortlist}
          disabled={createShortlistMutation.isPending}
        >
          {createShortlistMutation.isPending ? 'Creating...' : 'Create Example Shortlist'}
        </Button>
      </div>

      <div className="grid gap-4">
        {shortlists?.map((shortlist) => (
          <Card key={shortlist.id}>
            <CardHeader>
              <CardTitle>{shortlist.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span>{shortlist.selectedReviewers.length} reviewers</span>
                <Button
                  variant="outline"
                  onClick={() => handleExportShortlist(shortlist.id)}
                  disabled={exportShortlistMutation.isPending}
                >
                  Export XLSX
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export const ShortlistHooksExampleWrapper: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Shortlist Hooks Example</h2>
      <ShortlistHooksExample />
    </div>
  </QueryClientProvider>
);

/**
 * Example 3: Custom Shortlist Component
 */
const CustomShortlistComponent: React.FC = () => {
  const [processId] = useState('example-process-3');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  
  const { data: shortlists } = useShortlists(processId);
  const createShortlistMutation = useCreateShortlist();

  const handleReviewerToggle = (reviewerId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    );
  };

  const handleCreateCustomShortlist = async () => {
    if (selectedReviewers.length === 0) {
      alert('Please select at least one reviewer');
      return;
    }

    try {
      await createShortlistMutation.mutateAsync({
        processId,
        data: {
          name: `Custom Shortlist ${Date.now()}`,
          selectedReviewers
        }
      });
      setSelectedReviewers([]);
      alert('Custom shortlist created!');
    } catch (error) {
      alert('Failed to create shortlist');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Reviewers</h3>
        <div className="grid grid-cols-2 gap-4">
          {mockReviewers.map((reviewer) => (
            <Card 
              key={reviewer.id}
              className={`cursor-pointer transition-colors ${
                selectedReviewers.includes(reviewer.id) 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleReviewerToggle(reviewer.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{reviewer.name}</p>
                    <p className="text-sm text-gray-600">{reviewer.email}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedReviewers.includes(reviewer.id)}
                    onChange={() => handleReviewerToggle(reviewer.id)}
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          {selectedReviewers.length} reviewers selected
        </span>
        <Button
          onClick={handleCreateCustomShortlist}
          disabled={createShortlistMutation.isPending || selectedReviewers.length === 0}
        >
          {createShortlistMutation.isPending ? 'Creating...' : 'Create Shortlist'}
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Existing Shortlists</h3>
        {shortlists?.length === 0 ? (
          <p className="text-gray-600">No shortlists created yet</p>
        ) : (
          <div className="space-y-2">
            {shortlists?.map((shortlist) => (
              <div key={shortlist.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-medium">{shortlist.name}</span>
                <span className="text-sm text-gray-600">
                  {shortlist.selectedReviewers.length} reviewers
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const CustomShortlistExample: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Custom Shortlist Component</h2>
      <CustomShortlistComponent />
    </div>
  </QueryClientProvider>
);

/**
 * Example 4: Export Functionality Demo
 */
const ExportFunctionalityDemo: React.FC = () => {
  const processId = 'example-process-4';
  const { data: shortlists } = useShortlists(processId);
  const exportShortlistMutation = useExportShortlist();

  const handleExport = async (shortlistId: string, format: 'csv' | 'xlsx' | 'docx') => {
    try {
      await exportShortlistMutation.mutateAsync({
        processId,
        shortlistId,
        format
      });
      alert(`Export as ${format.toUpperCase()} started!`);
    } catch (error) {
      alert(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Export Demo</h3>
      {shortlists?.map((shortlist) => (
        <Card key={shortlist.id}>
          <CardHeader>
            <CardTitle>{shortlist.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(shortlist.id, 'csv')}
                disabled={exportShortlistMutation.isPending}
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(shortlist.id, 'xlsx')}
                disabled={exportShortlistMutation.isPending}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport(shortlist.id, 'docx')}
                disabled={exportShortlistMutation.isPending}
              >
                Export Word
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const ExportFunctionalityExample: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Export Functionality</h2>
      <ExportFunctionalityDemo />
    </div>
  </QueryClientProvider>
);

// Export all examples
export const ShortlistExamples = {
  BasicShortlistManagerExample,
  ShortlistHooksExampleWrapper,
  CustomShortlistExample,
  ExportFunctionalityExample
};