/**
 * ShortlistStep Component
 * Step 8 of the ScholarFinder workflow - Reviewer shortlist management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StepComponentProps } from '../../types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, CheckCircle, AlertCircle, ListChecks, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { useScholarFinder } from '../../hooks/useScholarFinderContext';
import { ProcessStep } from '../../types/process';
import { Reviewer } from '../../types/api';
import { cn } from '@/lib/utils';

// Import sub-components
import { ReviewerSelection } from './shortlist/ReviewerSelection';
import { ShortlistManager } from './shortlist/ShortlistManager';

interface ShortlistStepProps extends StepComponentProps {}

interface ShortlistStepData {
  selectedReviewers: Reviewer[];
  selectionHistory: ShortlistAction[];
  lastModified: Date;
  minReviewers: number;
  maxReviewers: number;
  validationErrors?: string[];
}

interface ShortlistAction {
  type: 'add' | 'remove' | 'reorder' | 'bulk_add' | 'bulk_remove' | 'clear';
  reviewerId?: string;
  reviewerIds?: string[];
  fromIndex?: number;
  toIndex?: number;
  timestamp: Date;
}

export const ShortlistStep: React.FC<ShortlistStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const { toast } = useToast();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();
  const { shortlist, addToShortlist, removeFromShortlist, clearShortlist } = useScholarFinder();

  // Local state
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<Reviewer[]>([]);
  const [selectionHistory, setSelectionHistory] = useState<ShortlistAction[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastModified, setLastModified] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Configuration
  const minReviewers = 3;
  const maxReviewers = 20;

  // Loading states
  const isLoading = externalLoading;

  // Load existing data on mount
  useEffect(() => {
    loadExistingData();
  }, [process, stepData]);

  // Sync with context shortlist
  useEffect(() => {
    if (shortlist.length > 0 && selectedReviewers.length === 0) {
      setSelectedReviewers(shortlist);
      setHasUnsavedChanges(true);
    }
  }, [shortlist, selectedReviewers.length]);

  const loadExistingData = () => {
    try {
      // Load available reviewers from recommendations step
      const recommendationsData = process?.stepData?.recommendations;
      if (recommendationsData?.reviewers) {
        setAvailableReviewers(recommendationsData.reviewers);
      }

      // Load existing shortlist data
      const existingData = process?.stepData?.shortlist as ShortlistStepData;
      if (existingData) {
        if (existingData.selectedReviewers) {
          setSelectedReviewers(existingData.selectedReviewers);
          // Sync with context
          existingData.selectedReviewers.forEach(reviewer => {
            addToShortlist(reviewer);
          });
        }
        if (existingData.selectionHistory) {
          setSelectionHistory(existingData.selectionHistory);
        }
        if (existingData.lastModified) {
          setLastModified(existingData.lastModified);
        }
        if (existingData.validationErrors) {
          setValidationErrors(existingData.validationErrors);
        }
      }
    } catch (error) {
      console.error('Failed to load existing shortlist data:', error);
    }
  };

  const addAction = useCallback((action: Omit<ShortlistAction, 'timestamp'>) => {
    const newAction: ShortlistAction = {
      ...action,
      timestamp: new Date()
    };
    setSelectionHistory(prev => [...prev, newAction]);
    setLastModified(new Date());
    setHasUnsavedChanges(true);
  }, []);

  const handleAddToShortlist = useCallback((reviewer: Reviewer) => {
    if (selectedReviewers.length >= maxReviewers) {
      toast({
        title: 'Maximum Reviewers Reached',
        description: `You can select a maximum of ${maxReviewers} reviewers.`,
        variant: 'destructive'
      });
      return;
    }

    if (selectedReviewers.some(r => r.email === reviewer.email)) {
      toast({
        title: 'Reviewer Already Selected',
        description: 'This reviewer is already in your shortlist.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedReviewers(prev => [...prev, reviewer]);
    addToShortlist(reviewer);
    addAction({ type: 'add', reviewerId: reviewer.email });

    toast({
      title: 'Reviewer Added',
      description: `${reviewer.reviewer} has been added to your shortlist.`,
      variant: 'default'
    });
  }, [selectedReviewers, maxReviewers, addToShortlist, addAction, toast]);

  const handleRemoveFromShortlist = useCallback((reviewerId: string) => {
    const reviewer = selectedReviewers.find(r => r.email === reviewerId);
    if (!reviewer) return;

    setSelectedReviewers(prev => prev.filter(r => r.email !== reviewerId));
    removeFromShortlist(reviewerId);
    addAction({ type: 'remove', reviewerId });

    toast({
      title: 'Reviewer Removed',
      description: `${reviewer.reviewer} has been removed from your shortlist.`,
      variant: 'default'
    });
  }, [selectedReviewers, removeFromShortlist, addAction, toast]);

  const handleBulkAdd = useCallback((reviewers: Reviewer[]) => {
    const availableSlots = maxReviewers - selectedReviewers.length;
    const reviewersToAdd = reviewers.slice(0, availableSlots);
    
    if (reviewersToAdd.length < reviewers.length) {
      toast({
        title: 'Some Reviewers Not Added',
        description: `Only ${reviewersToAdd.length} reviewers were added due to the maximum limit of ${maxReviewers}.`,
        variant: 'default'
      });
    }

    const newReviewers = reviewersToAdd.filter(
      reviewer => !selectedReviewers.some(r => r.email === reviewer.email)
    );

    if (newReviewers.length === 0) {
      toast({
        title: 'No New Reviewers',
        description: 'All selected reviewers are already in your shortlist.',
        variant: 'default'
      });
      return;
    }

    setSelectedReviewers(prev => [...prev, ...newReviewers]);
    newReviewers.forEach(reviewer => addToShortlist(reviewer));
    addAction({ 
      type: 'bulk_add', 
      reviewerIds: newReviewers.map(r => r.email) 
    });

    toast({
      title: 'Reviewers Added',
      description: `${newReviewers.length} reviewers have been added to your shortlist.`,
      variant: 'default'
    });
  }, [selectedReviewers, maxReviewers, addToShortlist, addAction, toast]);

  const handleBulkRemove = useCallback((reviewerIds: string[]) => {
    const reviewersToRemove = selectedReviewers.filter(r => reviewerIds.includes(r.email));
    
    setSelectedReviewers(prev => prev.filter(r => !reviewerIds.includes(r.email)));
    reviewerIds.forEach(id => removeFromShortlist(id));
    addAction({ type: 'bulk_remove', reviewerIds });

    toast({
      title: 'Reviewers Removed',
      description: `${reviewersToRemove.length} reviewers have been removed from your shortlist.`,
      variant: 'default'
    });
  }, [selectedReviewers, removeFromShortlist, addAction, toast]);

  const handleReorderShortlist = useCallback((fromIndex: number, toIndex: number) => {
    const newSelectedReviewers = [...selectedReviewers];
    const [movedReviewer] = newSelectedReviewers.splice(fromIndex, 1);
    newSelectedReviewers.splice(toIndex, 0, movedReviewer);
    
    setSelectedReviewers(newSelectedReviewers);
    addAction({ 
      type: 'reorder', 
      reviewerId: movedReviewer.email,
      fromIndex,
      toIndex 
    });
    setHasUnsavedChanges(true);
  }, [selectedReviewers, addAction]);

  const handleClearShortlist = useCallback(() => {
    setSelectedReviewers([]);
    clearShortlist();
    addAction({ type: 'clear' });

    toast({
      title: 'Shortlist Cleared',
      description: 'All reviewers have been removed from your shortlist.',
      variant: 'default'
    });
  }, [clearShortlist, addAction, toast]);

  const handleUndo = useCallback(() => {
    if (selectionHistory.length === 0) return;

    const lastAction = selectionHistory[selectionHistory.length - 1];
    const newHistory = selectionHistory.slice(0, -1);
    setSelectionHistory(newHistory);

    // Reverse the last action
    switch (lastAction.type) {
      case 'add':
        if (lastAction.reviewerId) {
          setSelectedReviewers(prev => prev.filter(r => r.email !== lastAction.reviewerId));
          removeFromShortlist(lastAction.reviewerId);
        }
        break;
      case 'remove':
        if (lastAction.reviewerId) {
          const reviewer = availableReviewers.find(r => r.email === lastAction.reviewerId);
          if (reviewer) {
            setSelectedReviewers(prev => [...prev, reviewer]);
            addToShortlist(reviewer);
          }
        }
        break;
      case 'bulk_add':
        if (lastAction.reviewerIds) {
          setSelectedReviewers(prev => prev.filter(r => !lastAction.reviewerIds!.includes(r.email)));
          lastAction.reviewerIds.forEach(id => removeFromShortlist(id));
        }
        break;
      case 'bulk_remove':
        if (lastAction.reviewerIds) {
          const reviewersToRestore = availableReviewers.filter(r => lastAction.reviewerIds!.includes(r.email));
          setSelectedReviewers(prev => [...prev, ...reviewersToRestore]);
          reviewersToRestore.forEach(reviewer => addToShortlist(reviewer));
        }
        break;
      case 'clear':
        // Restore all reviewers from the previous state
        // This is complex to implement perfectly, so we'll show a message
        toast({
          title: 'Cannot Undo Clear',
          description: 'Cannot undo clearing the entire shortlist. Please re-select reviewers manually.',
          variant: 'default'
        });
        return;
    }

    setHasUnsavedChanges(true);
    toast({
      title: 'Action Undone',
      description: 'The last action has been undone.',
      variant: 'default'
    });
  }, [selectionHistory, availableReviewers, addToShortlist, removeFromShortlist, toast]);

  const validateShortlist = useCallback((): string[] => {
    const errors: string[] = [];

    if (selectedReviewers.length < minReviewers) {
      errors.push(`You must select at least ${minReviewers} reviewers.`);
    }

    if (selectedReviewers.length > maxReviewers) {
      errors.push(`You cannot select more than ${maxReviewers} reviewers.`);
    }

    // Check for duplicate emails (shouldn't happen, but good to validate)
    const emails = selectedReviewers.map(r => r.email);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      errors.push('Duplicate reviewers detected in shortlist.');
    }

    return errors;
  }, [selectedReviewers, minReviewers, maxReviewers]);

  const handleSave = async (showToast = true) => {
    try {
      const errors = validateShortlist();
      setValidationErrors(errors);

      const stepData: ShortlistStepData = {
        selectedReviewers,
        selectionHistory,
        lastModified: new Date(),
        minReviewers,
        maxReviewers,
        validationErrors: errors.length > 0 ? errors : undefined
      };

      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.SHORTLIST,
        stepData
      });

      setHasUnsavedChanges(false);
      setLastModified(new Date());

      if (showToast) {
        toast({
          title: 'Shortlist Saved',
          description: 'Your reviewer shortlist has been saved successfully.',
          variant: 'default'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save shortlist data:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save shortlist data. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    }
  };

  const handleNext = async () => {
    const errors = validateShortlist();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: 'Shortlist Validation Failed',
        description: errors[0],
        variant: 'destructive'
      });
      return;
    }

    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext({
        selectedReviewers,
        shortlistCount: selectedReviewers.length,
        selectionHistory,
        validationPassed: true
      });
    }
  };

  const canProceed = selectedReviewers.length >= minReviewers && selectedReviewers.length <= maxReviewers;
  const canUndo = selectionHistory.length > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ListChecks className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Create Reviewer Shortlist</CardTitle>
              <CardDescription>
                Select and manage your final list of potential reviewers for submission
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Save Status */}
      {(hasUnsavedChanges || lastModified) && (
        <Alert className={hasUnsavedChanges ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
          {hasUnsavedChanges ? (
            <AlertCircle className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={hasUnsavedChanges ? 'text-orange-800' : 'text-green-800'}>
            {hasUnsavedChanges 
              ? 'You have unsaved changes. Your shortlist will be saved automatically when you continue.'
              : `Last saved: ${lastModified?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Shortlist Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Shortlist Summary</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo || isLoading}
              >
                Undo Last Action
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearShortlist}
                disabled={selectedReviewers.length === 0 || isLoading}
              >
                Clear All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{selectedReviewers.length}</div>
              <div className="text-sm text-muted-foreground">Selected Reviewers</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{minReviewers}</div>
              <div className="text-sm text-muted-foreground">Minimum Required</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{maxReviewers}</div>
              <div className="text-sm text-muted-foreground">Maximum Allowed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Selection */}
      <ReviewerSelection
        availableReviewers={availableReviewers}
        selectedReviewers={selectedReviewers}
        onAddToShortlist={handleAddToShortlist}
        onBulkAdd={handleBulkAdd}
        maxReviewers={maxReviewers}
        isLoading={isLoading}
      />

      {/* Shortlist Manager */}
      <ShortlistManager
        selectedReviewers={selectedReviewers}
        onRemoveFromShortlist={handleRemoveFromShortlist}
        onBulkRemove={handleBulkRemove}
        onReorderShortlist={handleReorderShortlist}
        selectionHistory={selectionHistory}
        isLoading={isLoading}
      />

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
            Save Shortlist
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
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Shortlist
              </>
            ) : (
              `Select ${minReviewers - selectedReviewers.length} More Reviewers`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShortlistStep;