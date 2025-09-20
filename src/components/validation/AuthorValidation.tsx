/**
 * Author Validation Component
 * Main component for author validation with configurable rules
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useValidation } from '@/hooks/useValidation';
import { ValidationRulesForm } from './ValidationRulesForm';
import { ValidationResults } from './ValidationResults';
import { ValidationStepDisplay } from './ValidationStepDisplay';
import type { ValidationRequest } from '@/types/api';

interface AuthorValidationProps {
  processId: string;
  onValidationComplete?: () => void;
}

export const AuthorValidation: React.FC<AuthorValidationProps> = ({
  processId,
  onValidationComplete,
}) => {
  const {
    validateAuthors,
    results,
    isValidating,
    validationError,
    hasResults,
    isLoadingResults,
  } = useValidation(processId);

  const [validationRules, setValidationRules] = useState<ValidationRequest['rules']>({
    excludeManuscriptAuthors: true,
    excludeCoAuthors: true,
    minimumPublications: 5,
    maxRetractions: 2,
    excludeInstitutionalConflicts: true,
  });

  const handleValidate = async () => {
    try {
      await validateAuthors(validationRules);
      onValidationComplete?.();
    } catch (error) {
      // Error is handled by the hook
      console.error('Validation failed:', error);
    }
  };

  const handleRevalidate = () => {
    handleValidate();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Author Validation
          </CardTitle>
          <CardDescription>
            Configure validation rules to filter potential reviewers and avoid conflicts of interest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validation Rules Configuration */}
          <ValidationRulesForm
            rules={validationRules}
            onChange={setValidationRules}
            disabled={isValidating}
          />

          {/* Validation Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              className="flex items-center gap-2"
            >
              {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasResults ? 'Re-validate Authors' : 'Validate Authors'}
            </Button>
            
            {hasResults && (
              <Button
                variant="outline"
                onClick={handleRevalidate}
                disabled={isValidating}
              >
                Apply New Rules
              </Button>
            )}
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Validation failed: {validationError.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {(hasResults || isLoadingResults) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Validation Results
            </CardTitle>
            <CardDescription>
              Step-by-step validation results showing how many reviewers passed each filter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingResults ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading validation results...</span>
              </div>
            ) : results ? (
              <div className="space-y-6">
                <ValidationResults results={results} />
                <ValidationStepDisplay 
                  steps={results.validationSteps}
                  rules={validationRules}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};