/**
 * React Query usage examples
 * Demonstrates how to use the custom hooks and React Query setup
 */

import React, { useState } from 'react';
import { 
  useProcesses, 
  useCreateProcess, 
  useFileUpload, 
  useMetadata,
  useEnhanceKeywords,
  useSearchStatus,
  useRecommendations,
  useApiErrorHandler,
  useProcessWorkflowLoading 
} from '../hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/**
 * Example component showing process management
 */
export const ProcessManagementExample: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Fetch all processes
  const { data: processes, isLoading, error } = useProcesses();
  
  // Create process mutation
  const createProcessMutation = useCreateProcess();
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const handleCreateProcess = async () => {
    try {
      await createProcessMutation.mutateAsync({ title, description });
      handleSuccess('Process created successfully!');
      setTitle('');
      setDescription('');
    } catch (error) {
      handleError(error, 'Failed to create process');
    }
  };
  
  if (isLoading) return <div>Loading processes...</div>;
  if (error) return <div>Error loading processes</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Process title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Input
              placeholder="Process description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleCreateProcess}
            disabled={createProcessMutation.isPending || !title}
          >
            {createProcessMutation.isPending ? 'Creating...' : 'Create Process'}
          </Button>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Your Processes</h3>
            {processes?.map(process => (
              <div key={process.id} className="p-2 border rounded mb-2">
                <h4 className="font-medium">{process.title}</h4>
                <p className="text-sm text-gray-600">{process.description}</p>
                <p className="text-xs text-gray-500">Step: {process.currentStep}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example component showing file upload with progress
 */
export const FileUploadExample: React.FC<{ processId: string }> = ({ processId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileUploadMutation = useFileUpload();
  const { data: metadata, isLoading: metadataLoading } = useMetadata(processId);
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    try {
      await fileUploadMutation.mutateAsync({
        processId,
        file: selectedFile,
        onProgress: setUploadProgress,
      });
      handleSuccess('File uploaded successfully!');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      handleError(error, 'Failed to upload file');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>File Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>
          
          {fileUploadMutation.isPending && (
            <div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
          
          <Button 
            onClick={handleFileUpload}
            disabled={!selectedFile || fileUploadMutation.isPending}
          >
            {fileUploadMutation.isPending ? 'Uploading...' : 'Upload File'}
          </Button>
          
          {metadataLoading && <div>Loading metadata...</div>}
          
          {metadata && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Extracted Metadata</h3>
              <div className="space-y-2">
                <p><strong>Title:</strong> {metadata.title}</p>
                <p><strong>Abstract:</strong> {metadata.abstract}</p>
                <p><strong>Keywords:</strong> {metadata.keywords.join(', ')}</p>
                <p><strong>Authors:</strong> {metadata.authors.map(a => a.name).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example component showing keyword enhancement
 */
export const KeywordEnhancementExample: React.FC<{ processId: string }> = ({ processId }) => {
  const enhanceKeywordsMutation = useEnhanceKeywords();
  const { handleError, handleSuccess } = useApiErrorHandler();
  
  const handleEnhanceKeywords = async () => {
    try {
      await enhanceKeywordsMutation.mutateAsync({
        processId,
        request: {
          includeOriginal: true,
          generateMeshTerms: true,
          generateSearchStrings: true,
        },
      });
      handleSuccess('Keywords enhanced successfully!');
    } catch (error) {
      handleError(error, 'Failed to enhance keywords');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Enhancement</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleEnhanceKeywords}
          disabled={enhanceKeywordsMutation.isPending}
        >
          {enhanceKeywordsMutation.isPending ? 'Enhancing...' : 'Enhance Keywords'}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Example component showing search progress tracking
 */
export const SearchProgressExample: React.FC<{ processId: string }> = ({ processId }) => {
  const { 
    status, 
    progress, 
    totalFound, 
    progressPercentage, 
    isSearching, 
    isCompleted 
  } = useSearchStatus(processId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Search Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Total Found:</strong> {totalFound}</p>
          </div>
          
          {isSearching && (
            <div>
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-sm text-gray-600 mt-1">{progressPercentage.toFixed(1)}% complete</p>
            </div>
          )}
          
          {progress && (
            <div>
              <h4 className="font-medium mb-2">Database Progress</h4>
              {Object.entries(progress).map(([database, info]) => (
                <div key={database} className="flex justify-between items-center p-2 border rounded mb-1">
                  <span className="capitalize">{database}</span>
                  <span>{info.status} ({info.count} found)</span>
                </div>
              ))}
            </div>
          )}
          
          {isCompleted && (
            <div className="text-green-600 font-medium">
              Search completed! Found {totalFound} potential reviewers.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example component showing recommendations with pagination
 */
export const RecommendationsExample: React.FC<{ processId: string }> = ({ processId }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    minPublications: 5,
    countries: ['US', 'UK', 'CA'],
  });
  
  const { data, isLoading, error } = useRecommendations(processId, {
    page,
    limit: 10,
    filters,
    sort: { field: 'matchScore', direction: 'desc' },
  });
  
  if (isLoading) return <div>Loading recommendations...</div>;
  if (error) return <div>Error loading recommendations</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reviewer Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.data.map(reviewer => (
            <div key={reviewer.id} className="p-3 border rounded">
              <h4 className="font-medium">{reviewer.name}</h4>
              <p className="text-sm text-gray-600">{reviewer.affiliation}</p>
              <p className="text-sm">
                Match Score: {reviewer.matchScore}% | 
                Publications: {reviewer.publicationCount} | 
                Country: {reviewer.country}
              </p>
            </div>
          ))}
          
          {data?.pagination && (
            <div className="flex justify-between items-center mt-4">
              <Button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!data.pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <Button 
                onClick={() => setPage(p => p + 1)}
                disabled={!data.pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Example component showing workflow loading states
 */
export const WorkflowLoadingExample: React.FC<{ processId: string }> = ({ processId }) => {
  const { data: process, isLoading: processLoading } = useProcesses();
  const { data: metadata, isLoading: metadataLoading } = useMetadata(processId);
  const { isSearching } = useSearchStatus(processId);
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations(processId);
  
  const {
    isAnyLoading,
    loadingSteps,
    progressPercentage,
  } = useProcessWorkflowLoading(
    processLoading,
    metadataLoading,
    false, // keywords loading
    isSearching,
    false, // validation loading
    recommendationsLoading
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progressPercentage} className="w-full" />
          <p className="text-sm text-gray-600">{progressPercentage.toFixed(1)}% complete</p>
          
          <div className="space-y-2">
            {Object.entries(loadingSteps).map(([step, loading]) => (
              <div key={step} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span className="capitalize">{step}: {loading ? 'Loading...' : 'Complete'}</span>
              </div>
            ))}
          </div>
          
          {isAnyLoading && (
            <p className="text-blue-600">Workflow in progress...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};