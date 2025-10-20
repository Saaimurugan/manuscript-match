/**
 * ManualStep Component
 * Step 5 of the ScholarFinder workflow - Manual reviewer addition
 */

import React, { useEffect, useState } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, CheckCircle, AlertCircle, Users, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import type { ManualAuthorResponse, ManualAuthor } from '../../types/api';

// Import sub-components
import { AuthorSearch, SearchResults } from './manual';

interface ManualStepProps extends StepComponentProps {}

interface ManualStepData {
  searchHistory?: Array<{
    searchTerm: string;
    results: ManualAuthor[];
    timestamp: Date;
  }>;
  addedAuthors?: ManualAuthor[];
  lastSearched?: Date;
}

export const ManualStep: React.FC<ManualStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { toast } = useToast();
  const { addManualAuthor } = useScholarFinderApi();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();

  // Local state
  const [searchResults, setSearchResults] = useState<ManualAuthor[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [addedAuthors, setAddedAuthors] = useState<ManualAuthor[]>([]);
  const [searchHistory, setSearchHistory] = useState<Array<{
    searchTerm: string;
    results: ManualAuthor[];
    timestamp: Date;
  }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSearched, setLastSearched] = useState<Date | null>(null);

  // Loading states
  const isSearching = addManualAuthor.isPending;
  const isLoading = externalLoading || isSearching;

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, [process, stepData]);

  const loadExistingData = () => {
    try {
      // Load from process step data if available
      const existingData = process?.stepData?.manual as ManualStepData;
      if (existingData) {
        if (existingData.addedAuthors) {
          setAddedAuthors(existingData.addedAuthors);
        }
        if (existingData.searchHistory) {
          setSearchHistory(existingData.searchHistory.map(item => ({
            ...item,
            timestamp: new Date(item.timestamp)
          })));
        }
        if (existingData.lastSearched) {
          setLastSearched(new Date(existingData.lastSearched));
        }
      }
    } catch (error) {
      console.error('Failed to load existing manual data:', error);
    }
  };

  const handleSearch = async (authorName: string) => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Job ID is required for author search',
        variant: 'destructive'
      });
      return;
    }

    if (!authorName || authorName.trim().length < 2) {
      toast({
        title: 'Invalid Search Term',
        description: 'Author name must be at least 2 characters long.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setCurrentSearchTerm(authorName);
      
      const response = await addManualAuthor.mutateAsync({ jobId, authorName: authorName.trim() });
      
      setSearchResults(response.data.found_authors);
      setLastSearched(new Date());
      
      // Add to search history
      const newHistoryItem = {
        searchTerm: authorName.trim(),
        results: response.data.found_authors,
        timestamp: new Date()
      };
      
      setSearchHistory(prev => [newHistoryItem, ...prev.slice(0, 9)]); // Keep last 10 searches
      setHasUnsavedChanges(true);
      
      if (response.data.found_authors.length === 0) {
        toast({
          title: 'No Results Found',
          description: `No authors found for "${authorName}". Try using different search terms or partial names.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Search Completed',
          description: `Found ${response.data.found_authors.length} author${response.data.found_authors.length !== 1 ? 's' : ''} matching "${authorName}".`,
          variant: 'default'
        });
      }
    } catch (error: any) {
      console.error('Author search failed:', error);
      
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search for authors. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddAuthor = (author: ManualAuthor) => {
    // Check if author is already added
    const isAlreadyAdded = addedAuthors.some(
      existing => existing.name.toLowerCase() === author.name.toLowerCase() && 
                 existing.affiliation.toLowerCase() === author.affiliation.toLowerCase()
    );

    if (isAlreadyAdded) {
      toast({
        title: 'Author Already Added',
        description: `${author.name} from ${author.affiliation} is already in your list.`,
        variant: 'default'
      });
      return;
    }

    setAddedAuthors(prev => [...prev, author]);
    setHasUnsavedChanges(true);
    
    toast({
      title: 'Author Added',
      description: `${author.name} has been added to your reviewer candidates.`,
      variant: 'default'
    });
  };

  const handleRemoveAuthor = (authorToRemove: ManualAuthor) => {
    setAddedAuthors(prev => 
      prev.filter(author => 
        !(author.name === authorToRemove.name && author.affiliation === authorToRemove.affiliation)
      )
    );
    setHasUnsavedChanges(true);
    
    toast({
      title: 'Author Removed',
      description: `${authorToRemove.name} has been removed from your list.`,
      variant: 'default'
    });
  };

  const handleClearResults = () => {
    setSearchResults([]);
    setCurrentSearchTerm('');
  };

  const handleSave = async (showToast = true) => {
    try {
      const stepData: ManualStepData = {
        addedAuthors,
        searchHistory,
        lastSearched: lastSearched || undefined
      };

      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.MANUAL,
        stepData
      });

      setHasUnsavedChanges(false);

      if (showToast) {
        toast({
          title: 'Manual Authors Saved',
          description: 'Your manually added authors have been saved.',
          variant: 'default'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save manual data:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save manual authors. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext({
        addedAuthors,
        totalManualAuthors: addedAuthors.length
      });
    }
  };

  const getSuggestions = (searchTerm: string): string[] => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const suggestions: string[] = [];
    
    // Suggest partial name searches
    const parts = searchTerm.trim().split(/\s+/);
    if (parts.length > 1) {
      suggestions.push(`Try searching for just "${parts[0]}" or "${parts[parts.length - 1]}"`);
    }
    
    // Suggest common variations
    if (searchTerm.includes('.')) {
      suggestions.push(`Try removing periods: "${searchTerm.replace(/\./g, '')}"`);
    }
    
    if (!searchTerm.includes(' ') && searchTerm.length > 3) {
      suggestions.push(`Try adding a space: "${searchTerm.slice(0, -2)} ${searchTerm.slice(-2)}"`);
    }
    
    // Generic suggestions
    suggestions.push('Try using only the last name');
    suggestions.push('Check spelling and try alternative spellings');
    suggestions.push('Use the author\'s most common name format');
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Add Reviewers Manually</CardTitle>
              <CardDescription>
                Search for and add specific reviewers by name to supplement your database search results
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
              ? 'You have unsaved changes. Your manually added authors will be saved automatically when you continue.'
              : `Last searched: ${lastSearched?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Author Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search for Authors</span>
          </CardTitle>
          <CardDescription>
            Enter an author's name to search for potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthorSearch
            onSearch={handleSearch}
            isLoading={isLoading}
            searchHistory={searchHistory}
          />
        </CardContent>
      </Card>

      {/* Search Results */}
      {(searchResults.length > 0 || (currentSearchTerm && searchResults.length === 0 && !isLoading)) && (
        <SearchResults
          results={searchResults}
          searchTerm={currentSearchTerm}
          onAddAuthor={handleAddAuthor}
          onClearResults={handleClearResults}
          addedAuthors={addedAuthors}
          suggestions={searchResults.length === 0 ? getSuggestions(currentSearchTerm) : []}
          isLoading={isLoading}
        />
      )}

      {/* Added Authors Summary */}
      {addedAuthors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Added Authors ({addedAuthors.length})</span>
            </CardTitle>
            <CardDescription>
              Authors you've manually added to the reviewer candidate pool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {addedAuthors.map((author, index) => (
                <div
                  key={`${author.name}-${author.affiliation}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200"
                >
                  <div className="flex-1">
                    <div className="font-medium text-green-900">{author.name}</div>
                    <div className="text-sm text-green-700">{author.affiliation}</div>
                    {author.email && (
                      <div className="text-sm text-green-600">{author.email}</div>
                    )}
                    {author.country && (
                      <div className="text-sm text-green-600">{author.country}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAuthor(author)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Error */}
      {addManualAuthor.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {addManualAuthor.error.message || 'Failed to search for authors. Please try again.'}
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
            disabled={isLoading}
            className="min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Continue to Validation
                {addedAuthors.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    +{addedAuthors.length}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ManualStep;