/**
 * KeywordStep Component
 * Step 3 of the ScholarFinder workflow - Keyword enhancement and selection
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Search, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import { cn } from '@/lib/utils';
import type { KeywordEnhancementResponse, KeywordStringResponse, KeywordSelection } from '../../types/api';

// Import sub-components
import { KeywordSelector, MeshTermsDisplay } from './keywords';

interface KeywordStepProps extends StepComponentProps {}

interface KeywordStepData {
  enhancedKeywords?: KeywordEnhancementResponse['data'];
  selectedKeywords?: {
    primary: string[];
    secondary: string[];
  };
  searchString?: string;
  lastModified?: Date;
}

export const KeywordStep: React.FC<KeywordStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { toast } = useToast();
  const { enhanceKeywords, generateKeywordString } = useScholarFinderApi();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();

  // Local state
  const [enhancedData, setEnhancedData] = useState<KeywordEnhancementResponse['data'] | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<{
    primary: string[];
    secondary: string[];
  }>({
    primary: [],
    secondary: []
  });
  const [searchString, setSearchString] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Loading states
  const isEnhancing = enhanceKeywords.isPending;
  const isGeneratingString = generateKeywordString.isPending;
  const isLoading = externalLoading || isEnhancing || isGeneratingString;

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, [process, stepData]);

  // Auto-enhance keywords if not already done
  useEffect(() => {
    if (jobId && !enhancedData && !isEnhancing) {
      handleEnhanceKeywords();
    }
  }, [jobId, enhancedData, isEnhancing]);

  // Auto-generate search string when keywords are selected
  useEffect(() => {
    if (selectedKeywords.primary.length > 0 || selectedKeywords.secondary.length > 0) {
      handleGenerateSearchString();
    }
  }, [selectedKeywords]);

  const loadExistingData = () => {
    try {
      // Load from process step data if available
      const existingData = process?.stepData?.keywords as KeywordStepData;
      if (existingData) {
        if (existingData.enhancedKeywords) {
          setEnhancedData(existingData.enhancedKeywords);
        }
        if (existingData.selectedKeywords) {
          setSelectedKeywords(existingData.selectedKeywords);
        }
        if (existingData.searchString) {
          setSearchString(existingData.searchString);
        }
        if (existingData.lastModified) {
          setLastSaved(existingData.lastModified);
        }
      }
    } catch (error) {
      console.error('Failed to load existing keyword data:', error);
    }
  };

  const handleEnhanceKeywords = async () => {
    if (!jobId) {
      toast({
        title: 'Error',
        description: 'Job ID is required for keyword enhancement',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await enhanceKeywords.mutateAsync(jobId);
      setEnhancedData(response.data);
      
      // Auto-select some keywords as defaults
      const defaultPrimary = response.data.primary_focus.slice(0, 3);
      const defaultSecondary = response.data.secondary_focus.slice(0, 3);
      
      setSelectedKeywords({
        primary: defaultPrimary,
        secondary: defaultSecondary
      });

      setHasUnsavedChanges(true);
      
      toast({
        title: 'Keywords Enhanced',
        description: 'AI-generated keywords and MeSH terms are ready for selection.',
        variant: 'default'
      });
    } catch (error: any) {
      console.error('Keyword enhancement failed:', error);
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance keywords. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleGenerateSearchString = useCallback(async () => {
    if (!jobId || (selectedKeywords.primary.length === 0 && selectedKeywords.secondary.length === 0)) {
      return;
    }

    try {
      const keywordSelection: KeywordSelection = {
        primary_keywords_input: selectedKeywords.primary.join(', '),
        secondary_keywords_input: selectedKeywords.secondary.join(', ')
      };

      const response = await generateKeywordString.mutateAsync({ jobId, keywords: keywordSelection });
      setSearchString(response.data.search_string);
      setHasUnsavedChanges(true);
    } catch (error: any) {
      console.error('Search string generation failed:', error);
      // Don't show toast for this as it's automatic
    }
  }, [jobId, selectedKeywords, generateKeywordString]);

  const handleKeywordSelectionChange = (type: 'primary' | 'secondary', keywords: string[]) => {
    setSelectedKeywords(prev => ({
      ...prev,
      [type]: keywords
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async (showToast = true) => {
    if (!enhancedData) {
      if (showToast) {
        toast({
          title: 'No Data to Save',
          description: 'Please enhance keywords first.',
          variant: 'destructive'
        });
      }
      return false;
    }

    try {
      const stepData: KeywordStepData = {
        enhancedKeywords: enhancedData,
        selectedKeywords,
        searchString,
        lastModified: new Date()
      };

      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.KEYWORDS,
        stepData
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      if (showToast) {
        toast({
          title: 'Keywords Saved',
          description: 'Your keyword selection has been saved successfully.',
          variant: 'default'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save keywords:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save keyword selection. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    // Validate that keywords are selected
    if (selectedKeywords.primary.length === 0 && selectedKeywords.secondary.length === 0) {
      toast({
        title: 'Keywords Required',
        description: 'Please select at least one primary or secondary keyword to continue.',
        variant: 'destructive'
      });
      return;
    }

    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext({
        selectedKeywords,
        searchString,
        enhancedKeywords: enhancedData
      });
    }
  };

  const canProceed = enhancedData && (selectedKeywords.primary.length > 0 || selectedKeywords.secondary.length > 0);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Enhance Keywords</CardTitle>
              <CardDescription>
                AI-enhanced keywords and MeSH terms to improve your reviewer search
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Save Status */}
      {(hasUnsavedChanges || lastSaved) && (
        <Alert className={hasUnsavedChanges ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          {hasUnsavedChanges ? (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'}>
            {hasUnsavedChanges 
              ? 'You have unsaved changes. Your selections will be saved automatically when you continue.'
              : `Last saved: ${lastSaved?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Enhancement Loading */}
      {isEnhancing && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Enhancing Keywords</p>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing your manuscript to generate relevant keywords and MeSH terms...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Keywords Display and Selection */}
      {enhancedData && !isEnhancing && (
        <div className="space-y-6">
          {/* MeSH Terms Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-5 w-5" />
                <span>Medical Subject Headings (MeSH)</span>
              </CardTitle>
              <CardDescription>
                Standardized medical terminology extracted from your manuscript
              </CardDescription>
            </CardHeader>
            <CardContent>
                <MeshTermsDisplay
                meshTerms={enhancedData.mesh_terms}
                broaderTerms={enhancedData.broader_terms}
              />
            </CardContent>
          </Card>

          {/* Keyword Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Keywords for Search</CardTitle>
              <CardDescription>
                Choose primary and secondary keywords to create your reviewer search query
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordSelector
                enhancedData={enhancedData}
                selectedKeywords={selectedKeywords}
                onSelectionChange={handleKeywordSelectionChange}
                isLoading={isGeneratingString}
              />
            </CardContent>
          </Card>

          {/* Search String Preview */}
          {searchString && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Generated Search Query</span>
                  {isGeneratingString && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription>
                  Boolean search string that will be used to find potential reviewers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <code className="text-sm break-all">{searchString}</code>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  <p>This search string combines your selected keywords using Boolean operators (AND, OR) to find the most relevant potential reviewers in academic databases.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Enhancement Error */}
      {enhanceKeywords.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {enhanceKeywords.error.message || 'Failed to enhance keywords. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Retry Enhancement */}
      {enhanceKeywords.error && (
        <Card>
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Keyword enhancement failed. You can retry or proceed with manual keyword entry.
              </p>
              <Button
                variant="outline"
                onClick={handleEnhanceKeywords}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Enhancement
              </Button>
            </div>
          </CardContent>
        </Card>
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
            disabled={isLoading || !enhancedData || !hasUnsavedChanges}
          >
            Save Selection
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || isLoading}
            className={cn(
              "min-w-[140px]",
              canProceed && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : canProceed ? (
              'Continue to Search'
            ) : (
              'Select Keywords to Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KeywordStep;