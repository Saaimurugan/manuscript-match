/**
 * Example usage of validation components and hooks
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AuthorValidation, 
  ValidationRulesForm, 
  ValidationResults, 
  ValidationStepDisplay 
} from '@/components/validation';
import { useValidation } from '@/hooks/useValidation';
import type { ValidationRequest, ValidationResults as ValidationResultsType } from '@/types/api';

// Example 1: Basic AuthorValidation usage
export const BasicValidationExample: React.FC = () => {
  const processId = 'example-process-1';

  const handleValidationComplete = () => {
    console.log('Validation completed successfully!');
    // Navigate to next step or show success message
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Basic Author Validation</h2>
      <AuthorValidation
        processId={processId}
        onValidationComplete={handleValidationComplete}
      />
    </div>
  );
};

// Example 2: Custom validation rules form
export const CustomValidationRulesExample: React.FC = () => {
  const [rules, setRules] = useState<ValidationRequest['rules']>({
    excludeManuscriptAuthors: true,
    excludeCoAuthors: false, // Allow co-authors
    minimumPublications: 10, // Higher threshold
    maxRetractions: 1, // Stricter retraction limit
    excludeInstitutionalConflicts: true,
  });

  const [isFormDisabled, setIsFormDisabled] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Validation Rules</CardTitle>
          <CardDescription>
            Example of configuring validation rules with custom settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValidationRulesForm
            rules={rules}
            onChange={setRules}
            disabled={isFormDisabled}
          />
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Rules:</h4>
            <div className="space-y-1 text-sm">
              <div>Exclude Manuscript Authors: <Badge variant={rules.excludeManuscriptAuthors ? 'default' : 'secondary'}>{rules.excludeManuscriptAuthors ? 'Yes' : 'No'}</Badge></div>
              <div>Exclude Co-Authors: <Badge variant={rules.excludeCoAuthors ? 'default' : 'secondary'}>{rules.excludeCoAuthors ? 'Yes' : 'No'}</Badge></div>
              <div>Minimum Publications: <Badge variant="outline">{rules.minimumPublications}</Badge></div>
              <div>Maximum Retractions: <Badge variant="outline">{rules.maxRetractions}</Badge></div>
              <div>Exclude Institutional Conflicts: <Badge variant={rules.excludeInstitutionalConflicts ? 'default' : 'secondary'}>{rules.excludeInstitutionalConflicts ? 'Yes' : 'No'}</Badge></div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => setIsFormDisabled(!isFormDisabled)}>
              {isFormDisabled ? 'Enable Form' : 'Disable Form'}
            </Button>
            <Button variant="outline" onClick={() => setRules({
              excludeManuscriptAuthors: true,
              excludeCoAuthors: true,
              minimumPublications: 5,
              maxRetractions: 2,
              excludeInstitutionalConflicts: true,
            })}>
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Example 3: Validation results display
export const ValidationResultsExample: React.FC = () => {
  const mockResults: ValidationResultsType = {
    totalCandidates: 150,
    validatedReviewers: 89,
    excludedReviewers: 61,
    validationSteps: {
      manuscriptAuthors: { excluded: 12, passed: 138 },
      coAuthors: { excluded: 23, passed: 127 },
      publications: { excluded: 18, passed: 132 },
      retractions: { excluded: 5, passed: 145 },
      institutions: { excluded: 3, passed: 147 },
    },
  };

  const mockRules: ValidationRequest['rules'] = {
    excludeManuscriptAuthors: true,
    excludeCoAuthors: true,
    minimumPublications: 5,
    maxRetractions: 2,
    excludeInstitutionalConflicts: true,
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Validation Results Example</h2>
      
      <ValidationResults results={mockResults} />
      
      <ValidationStepDisplay steps={mockResults.validationSteps} rules={mockRules} />
    </div>
  );
};

// Example 4: Using validation hooks directly
export const ValidationHooksExample: React.FC = () => {
  const processId = 'example-process-2';
  const {
    validateAuthors,
    results,
    isValidating,
    validationError,
    hasResults,
    isLoadingResults,
  } = useValidation(processId);

  const [customRules] = useState<ValidationRequest['rules']>({
    excludeManuscriptAuthors: true,
    excludeCoAuthors: false,
    minimumPublications: 8,
    maxRetractions: 1,
    excludeInstitutionalConflicts: true,
  });

  const handleValidate = async () => {
    try {
      await validateAuthors(customRules);
      console.log('Validation completed!');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Direct Hook Usage</CardTitle>
          <CardDescription>
            Example of using validation hooks directly for custom implementations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Is Validating:</span>
              <Badge variant={isValidating ? 'default' : 'secondary'} className="ml-2">
                {isValidating ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Has Results:</span>
              <Badge variant={hasResults ? 'default' : 'secondary'} className="ml-2">
                {hasResults ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Loading Results:</span>
              <Badge variant={isLoadingResults ? 'default' : 'secondary'} className="ml-2">
                {isLoadingResults ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Has Error:</span>
              <Badge variant={validationError ? 'destructive' : 'secondary'} className="ml-2">
                {validationError ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                Error: {validationError.message}
              </p>
            </div>
          )}

          {results && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                Validation completed: {results.validatedReviewers} out of {results.totalCandidates} reviewers validated
              </p>
            </div>
          )}

          <Button 
            onClick={handleValidate} 
            disabled={isValidating}
            className="w-full"
          >
            {isValidating ? 'Validating...' : 'Start Validation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Example 5: Validation with different rule configurations
export const ValidationConfigurationsExample: React.FC = () => {
  const processId = 'example-process-3';
  const { validateAuthors, isValidating } = useValidation(processId);

  const presetConfigurations = [
    {
      name: 'Strict',
      description: 'Maximum conflict avoidance',
      rules: {
        excludeManuscriptAuthors: true,
        excludeCoAuthors: true,
        minimumPublications: 10,
        maxRetractions: 0,
        excludeInstitutionalConflicts: true,
      },
    },
    {
      name: 'Moderate',
      description: 'Balanced approach',
      rules: {
        excludeManuscriptAuthors: true,
        excludeCoAuthors: true,
        minimumPublications: 5,
        maxRetractions: 2,
        excludeInstitutionalConflicts: true,
      },
    },
    {
      name: 'Lenient',
      description: 'More inclusive selection',
      rules: {
        excludeManuscriptAuthors: true,
        excludeCoAuthors: false,
        minimumPublications: 3,
        maxRetractions: 5,
        excludeInstitutionalConflicts: false,
      },
    },
  ];

  const handlePresetValidation = async (rules: ValidationRequest['rules']) => {
    try {
      await validateAuthors(rules);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Validation Configurations</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        {presetConfigurations.map((config) => (
          <Card key={config.name}>
            <CardHeader>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <CardDescription>{config.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm mb-4">
                <div>Manuscript Authors: <Badge variant={config.rules.excludeManuscriptAuthors ? 'destructive' : 'secondary'}>
                  {config.rules.excludeManuscriptAuthors ? 'Exclude' : 'Allow'}
                </Badge></div>
                <div>Co-Authors: <Badge variant={config.rules.excludeCoAuthors ? 'destructive' : 'secondary'}>
                  {config.rules.excludeCoAuthors ? 'Exclude' : 'Allow'}
                </Badge></div>
                <div>Min Publications: <Badge variant="outline">{config.rules.minimumPublications}</Badge></div>
                <div>Max Retractions: <Badge variant="outline">{config.rules.maxRetractions}</Badge></div>
                <div>Institutional: <Badge variant={config.rules.excludeInstitutionalConflicts ? 'destructive' : 'secondary'}>
                  {config.rules.excludeInstitutionalConflicts ? 'Exclude' : 'Allow'}
                </Badge></div>
              </div>
              
              <Button 
                onClick={() => handlePresetValidation(config.rules)}
                disabled={isValidating}
                className="w-full"
                variant={config.name === 'Moderate' ? 'default' : 'outline'}
              >
                {isValidating ? 'Validating...' : `Use ${config.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};