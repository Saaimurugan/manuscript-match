/**
 * SearchStep Component
 * Step 4 of the ScholarFinder workflow - Database search configuration and execution
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, Search, CheckCircle, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import type { DatabaseSearchResponse, DatabaseSelection } from '../../types/api';

// Import sub-components
import { DatabaseSelector, SearchProgress, SearchResults } from './search';

interface SearchStepProps extends StepComponentProps {}

interface SearchStepData {
  selectedDatabases?: string[];
  searchResults?: DatabaseSearchResponse['data'];
  searchStatus?: 'idle' | 'searching' | 'completed' | 'failed' | 'partial';
  lastSearched?: Date;
  searchErrors?: Record<string, string>;
}

const AVAILABLE_DATABASES = [
  {
    id: 'pubmed',
    name: 'PubMed',
    description: 'MEDLINE database of life sciences and biomedical literature',
    isDefault: true,
    estimatedResults: 'High' as const
  },
  {
    id: 'tandf',
    name: 'Taylor & Francis Online',
    description: 'Academic journals across multiple disciplines',
    isDefault: true,
    estimatedResults: 'Medium' as const
  },
  {
    id: 'sciencedirect',
    name: 'ScienceDirect',
    description: 'Elsevier\'s platform for scientific and technical content',
    isDefault: true,
    estimatedResults: 'High' as const
  },
  {
    id: 'wiley',
    name: 'Wiley Online Library',
    description: 'Multidisciplinary academic content from Wiley',
    isDefault: false,
    estimatedResults: 'Medium' as const
  }
];

export const SearchStep: React.FC<SearchStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { toast } = useToast();
  const { searchDatabases } = useScholarFinderApi();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();

  // Local state
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(
    AVAILABLE_DATABASES.filter(db => db.isDefault).map(db => db.id)
  );
  const [searchResults, setSearchResults] = useState<DatabaseSearchResponse['data'] | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'completed' | 'failed' | 'partial'>('idle');
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSearched, setLastSearched] = useState<Date | null>(null);

  // Loading states
  const isSearching = searchDatabases.isPending;
  const isLoading = externalLoading || isSearching;

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, [process, stepData]);

  const loadExistingData = () => {
    try {
      // Load from process step data if available
      const existingData = process?.stepData?.search as SearchStepData;
      if (existingData) {
        if (existingData.selectedDatabases) {
          setSelectedDatabases(existingData.selectedDatabases);
        }
        if (existingData.searchResults) {
          setSearchResults(existingData.searchResults);
        }
        if (existingData.searchStatus) {
          setSearchStatus(existingData.searchStatus);
        }
        if (existingData.searchErrors) {
          setSearchErrors(existingData.searchErrors);
        }
        if (existingData.lastSearched) {
          setLastSearched(existingData.lastSearched);
        }
      }
    } catch (error) {
      console.error('Failed to load existing search data:', error);
    }
  };

  const handleDatabaseSelectionChange = (databases: string[]) => {
    setSelectedDatabases(databases);
    setHasUnsavedChanges(true);
  };

  const handleSearch = async () => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Job ID is required for database search',
        variant: 'destructive'
      });
      return;
    }

    if (selectedDatabases.length === 0) {
      toast({
        title: 'No Databases Selected',
        description: 'Please select at least one database to search.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSearchStatus('searching');
      setSearchErrors({});

      const databaseSelection: DatabaseSelection = {
        selected_websites: selectedDatabases
      };

      const response = await searchDatabases.mutateAsync({ jobId, databases: databaseSelection });
      
      setSearchResults(response.data);
      setLastSearched(new Date());
      
      // Determine final status based on search results
      const hasFailures = Object.values(response.data.search_status).some(status => status === 'failed');
      const hasSuccesses = Object.values(response.data.search_status).some(status => status === 'success');
      
      if (hasFailures && hasSuccesses) {
        setSearchStatus('partial');
        // Extract error information
        const errors: Record<string, string> = {};
        Object.entries(response.data.search_status).forEach(([db, status]) => {
          if (status === 'failed') {
            errors[db] = 'Database search failed';
          }
        });
        setSearchErrors(errors);
      } else if (hasFailures) {
        setSearchStatus('failed');
      } else {
        setSearchStatus('completed');
      }

      setHasUnsavedChanges(true);
      
      toast({
        title: 'Search Completed',
        description: `Found ${response.data.total_reviewers} potential reviewers across ${response.data.databases_searched.length} databases.`,
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Database search failed:', error);
      setSearchStatus('failed');
      setSearchErrors({ general: error.message || 'Search failed' });
      
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search databases. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRetrySearch = async () => {
    await handleSearch();
  };

  const handleRetryFailedDatabases = async () => {
    if (!searchResults) return;

    const failedDatabases = Object.entries(searchResults.search_status)
      .filter(([_, status]) => status === 'failed')
      .map(([db, _]) => db);

    if (failedDatabases.length === 0) return;

    try {
      setSearchStatus('searching');
      
      const databaseSelection: DatabaseSelection = {
        selected_websites: failedDatabases
      };

      const response = await searchDatabases.mutateAsync({ jobId, databases: databaseSelection });
      
      // Merge results with existing successful searches
      const updatedResults = {
        ...searchResults,
        total_reviewers: searchResults.total_reviewers + response.data.total_reviewers,
        databases_searched: [...new Set([...searchResults.databases_searched, ...response.data.databases_searched])],
        search_status: {
          ...searchResults.search_status,
          ...response.data.search_status
        },
        preview_reviewers: [
          ...(searchResults.preview_reviewers || []),
          ...(response.data.preview_reviewers || [])
        ]
      };

      setSearchResults(updatedResults);
      setLastSearched(new Date());
      
      // Update status
      const hasFailures = Object.values(updatedResults.search_status).some(status => status === 'failed');
      setSearchStatus(hasFailures ? 'partial' : 'completed');
      
      // Clear errors for successful retries
      const remainingErrors: Record<string, string> = {};
      Object.entries(updatedResults.search_status).forEach(([db, status]) => {
        if (status === 'failed') {
          remainingErrors[db] = 'Database search failed';
        }
      });
      setSearchErrors(remainingErrors);

      setHasUnsavedChanges(true);
      
      toast({
        title: 'Retry Completed',
        description: `Total reviewers found: ${updatedResults.total_reviewers}`,
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Retry search failed:', error);
      toast({
        title: 'Retry Failed',
        description: error.message || 'Failed to retry database search.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async (showToast = true) => {
    try {
      const stepData: SearchStepData = {
        selectedDatabases,
        searchResults: searchResults || undefined,
        searchStatus,
        searchErrors,
        lastSearched: lastSearched || undefined
      };

      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.SEARCH,
        stepData
      });

      setHasUnsavedChanges(false);

      if (showToast) {
        toast({
          title: 'Search Data Saved',
          description: 'Your database search configuration and results have been saved.',
          variant: 'default'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save search data:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save search data. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    // Validate that search has been completed successfully
    if (searchStatus !== 'completed' && searchStatus !== 'partial') {
      toast({
        title: 'Search Required',
        description: 'Please complete the database search before continuing.',
        variant: 'destructive'
      });
      return;
    }

    if (!searchResults || searchResults.total_reviewers === 0) {
      toast({
        title: 'No Results Found',
        description: 'No potential reviewers were found. Please try different databases or check your keywords.',
        variant: 'destructive'
      });
      return;
    }

    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext({
        selectedDatabases,
        searchResults,
        searchStatus,
        totalReviewers: searchResults.total_reviewers
      });
    }
  };

  const canProceed = searchStatus === 'completed' || searchStatus === 'partial';
  const hasResults = searchResults && searchResults.total_reviewers > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Search Academic Databases</CardTitle>
              <CardDescription>
                Select databases and search for potential reviewers using your enhanced keywords
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Save Status */}
      {(hasUnsavedChanges || lastSearched) && (
        <Alert className={hasUnsavedChanges ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          {hasUnsavedChanges ? (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'}>
            {hasUnsavedChanges 
              ? 'You have unsaved changes. Your search results will be saved automatically when you continue.'
              : `Last searched: ${lastSearched?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Database Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Databases</CardTitle>
          <CardDescription>
            Choose which academic databases to search for potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DatabaseSelector
            databases={AVAILABLE_DATABASES}
            selectedDatabases={selectedDatabases}
            onSelectionChange={handleDatabaseSelectionChange}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Database Search</span>
          </CardTitle>
          <CardDescription>
            Execute search across selected databases to find potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedDatabases.length} database{selectedDatabases.length !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedDatabases.map(id => 
                  AVAILABLE_DATABASES.find(db => db.id === id)?.name
                ).join(', ')}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {searchStatus === 'partial' && Object.keys(searchErrors).length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleRetryFailedDatabases}
                  disabled={isLoading}
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed
                </Button>
              )}
              
              <Button
                onClick={handleSearch}
                disabled={isLoading || selectedDatabases.length === 0}
                className="min-w-[120px]"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    {searchResults ? 'Search Again' : 'Start Search'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Progress */}
      {isSearching && (
        <SearchProgress
          selectedDatabases={selectedDatabases}
          databaseNames={AVAILABLE_DATABASES.reduce((acc, db) => {
            acc[db.id] = db.name;
            return acc;
          }, {} as Record<string, string>)}
        />
      )}

      {/* Search Results */}
      {searchResults && !isSearching && (
        <SearchResults
          results={searchResults}
          searchStatus={searchStatus}
          searchErrors={searchErrors}
          databaseNames={AVAILABLE_DATABASES.reduce((acc, db) => {
            acc[db.id] = db.name;
            return acc;
          }, {} as Record<string, string>)}
          onRetryFailed={handleRetryFailedDatabases}
        />
      )}

      {/* Search Error */}
      {searchDatabases.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {searchDatabases.error.message || 'Failed to search databases. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading}
        >
          Previous
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isLoading || !hasUnsavedChanges}
          >
            Save Progress
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || !hasResults || isLoading}
            className={cn(
              "min-w-[140px]",
              canProceed && hasResults && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : canProceed && hasResults ? (
              <>
                <Users className="h-4 w-4 mr-2" />
                Continue to Manual Addition
              </>
            ) : (
              'Complete Search to Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SearchStep;