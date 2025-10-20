/**
 * MetadataStep Component
 * Step 2 of the ScholarFinder workflow - Review and edit extracted manuscript metadata
 */

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Alert, AlertDescription } from '../../../../components/ui/alert';
import { Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import { useScholarFinderApi } from '../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../hooks/useProcessManagement';
import { ProcessStep } from '../../types/process';
import type { Author, Affiliation } from '../../types/process';
import MetadataForm from './metadata/MetadataForm';

// Lazy load AuthorList component
const AuthorList = React.lazy(() => import('./metadata/AuthorList'));

// Validation schema for metadata form
const metadataSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .min(10, 'Title must be at least 10 characters')
    .max(500, 'Title must be less than 500 characters'),
  abstract: z.string()
    .min(1, 'Abstract is required')
    .min(50, 'Abstract must be at least 50 characters')
    .max(5000, 'Abstract must be less than 5000 characters'),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty'))
    .min(1, 'At least one keyword is required')
    .max(20, 'Maximum 20 keywords allowed'),
  authors: z.array(z.object({
    name: z.string()
      .min(1, 'Author name is required')
      .min(2, 'Author name must be at least 2 characters')
      .max(100, 'Author name must be less than 100 characters'),
    email: z.string()
      .email('Invalid email format')
      .optional()
      .or(z.literal('')),
    affiliation: z.string()
      .min(1, 'Affiliation is required')
      .max(200, 'Affiliation must be less than 200 characters')
  })).min(1, 'At least one author is required')
    .max(50, 'Maximum 50 authors allowed'),
  affiliations: z.array(z.object({
    name: z.string()
      .min(1, 'Affiliation name is required')
      .max(200, 'Affiliation name must be less than 200 characters'),
    country: z.string().optional(),
    city: z.string().optional()
  })).min(1, 'At least one affiliation is required')
});

export type MetadataFormData = z.infer<typeof metadataSchema>;

interface MetadataStepProps {
  processId: string;
  jobId: string;
  onNext: (data?: any) => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export const MetadataStep: React.FC<MetadataStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false
}) => {
  const { toast } = useToast();
  const { useMetadata } = useScholarFinderApi();
  const { data: process } = useProcess(processId);
  const updateProcessStep = useUpdateProcessStep();
  
  // Use React Query hook for metadata
  const { data: metadataResponse, isLoading: isLoadingMetadata, error: metadataError } = useMetadata(jobId, !!jobId);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const form = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      title: '',
      abstract: '',
      keywords: [],
      authors: [],
      affiliations: []
    },
    mode: 'onChange'
  });

  const { watch, formState: { errors, isValid, isDirty } } = form;

  // Watch for form changes to track unsaved changes
  useEffect(() => {
    const subscription = watch(() => {
      if (isDirty && !isSaving) {
        setHasUnsavedChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, isDirty, isSaving]);

  // Load metadata when data is available
  useEffect(() => {
    if (process || metadataResponse) {
      loadMetadata();
    }
  }, [process, metadataResponse]);

  // Handle metadata loading errors
  useEffect(() => {
    if (metadataError) {
      toast({
        title: 'Error Loading Metadata',
        description: metadataError.message || 'Failed to load manuscript metadata. Please try again.',
        variant: 'destructive'
      });
    }
  }, [metadataError, toast]);

  const loadMetadata = () => {
    if (!jobId) return;

    try {
      // First try to get existing process data
      if (process?.stepData?.metadata) {
        // Use saved process data
        const { title, authors, affiliations, abstract, keywords } = process.stepData.metadata;
        form.reset({
          title,
          authors: authors.map(author => ({
            name: author.name || '',
            email: author.email || '',
            affiliation: author.affiliation || ''
          })),
          affiliations: affiliations.map(aff => ({
            name: aff.name || '',
            country: aff.country,
            city: aff.city
          })),
          abstract,
          keywords
        });
        setLastSaved(process.stepData.metadata.lastModified);
      } else if (metadataResponse) {
        // Transform API response to form data
        const formData = transformApiResponseToFormData(metadataResponse);
        form.reset(formData);
      }
    } catch (error: any) {
      console.error('Failed to load metadata:', error);
      toast({
        title: 'Error Loading Metadata',
        description: error.message || 'Failed to load manuscript metadata. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const transformApiResponseToFormData = (response: any): MetadataFormData => {
    const { data } = response;
    
    // Transform authors array to Author objects with affiliations
    const authors: Author[] = data.authors.map((authorName: string) => ({
      name: authorName,
      email: '',
      affiliation: data.author_aff_map[authorName] || data.affiliations[0] || ''
    }));

    // Transform affiliations array to Affiliation objects
    const affiliations: Affiliation[] = data.affiliations.map((affName: string) => ({
      name: affName,
      country: '',
      city: ''
    }));

    // Parse keywords string into array
    const keywords = data.keywords
      ? data.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
      : [];

    return {
      title: data.heading || '',
      abstract: data.abstract || '',
      keywords,
      authors,
      affiliations
    };
  };

  const handleSave = async (showToast = true) => {
    if (!isValid) {
      if (showToast) {
        toast({
          title: 'Validation Error',
          description: 'Please fix the errors in the form before saving.',
          variant: 'destructive'
        });
      }
      return false;
    }

    setIsSaving(true);
    try {
      const formData = form.getValues();
      
      // Update process step data
      await updateProcessStep.mutateAsync({
        processId,
        step: ProcessStep.METADATA,
        stepData: {
          ...formData,
          lastModified: new Date()
        }
      });

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      if (showToast) {
        toast({
          title: 'Metadata Saved',
          description: 'Your manuscript metadata has been saved successfully.',
          variant: 'default'
        });
      }
      
      return true;
    } catch (error: any) {
      console.error('Failed to save metadata:', error);
      if (showToast) {
        toast({
          title: 'Save Failed',
          description: error.message || 'Failed to save metadata. Please try again.',
          variant: 'destructive'
        });
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Auto-save before proceeding
    const saved = await handleSave(false);
    if (saved) {
      onNext();
    }
  };

  const handleAuthorChange = (authors: Author[]) => {
    form.setValue('authors', authors, { shouldDirty: true, shouldValidate: true });
  };

  const handleAffiliationChange = (affiliations: Affiliation[]) => {
    form.setValue('affiliations', affiliations, { shouldDirty: true, shouldValidate: true });
  };

  const isLoading = externalLoading || isLoadingMetadata;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading manuscript metadata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Review Manuscript Metadata</h2>
        <p className="text-muted-foreground">
          Review and edit the extracted manuscript information. Ensure all details are accurate before proceeding.
        </p>
      </div>

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
              ? 'You have unsaved changes. Click Save to preserve your edits.'
              : `Last saved: ${lastSaved?.toLocaleString()}`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <div className="grid gap-6">
        {/* Basic Metadata Form */}
        <Card>
          <CardHeader>
            <CardTitle>Manuscript Information</CardTitle>
            <CardDescription>
              Basic manuscript details extracted from your document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MetadataForm 
              form={form}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Authors and Affiliations */}
        <Card>
          <CardHeader>
            <CardTitle>Authors and Affiliations</CardTitle>
            <CardDescription>
              Manage author information and their institutional affiliations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <React.Suspense fallback={<div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
              <AuthorList
                authors={(form.watch('authors') || []) as Author[]}
                affiliations={(form.watch('affiliations') || []) as Affiliation[]}
                onAuthorsChange={handleAuthorChange}
                onAffiliationsChange={handleAffiliationChange}
                errors={{
                  authors: errors.authors as any,
                  affiliations: errors.affiliations as any
                }}
              />
            </React.Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading || isSaving}
        >
          Previous
        </Button>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={isLoading || isSaving || !isDirty}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={handleNext}
            disabled={isLoading || isSaving || !isValid}
          >
            Next: Enhance Keywords
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MetadataStep;