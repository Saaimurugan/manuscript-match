/**
 * Validation Results Component
 * Displays overall validation results summary
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Users } from 'lucide-react';
import type { ValidationResults as ValidationResultsType } from '@/types/api';

interface ValidationResultsProps {
  results: ValidationResultsType;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ results }) => {
  const {
    totalCandidates,
    validatedReviewers,
    excludedReviewers,
  } = results;

  const validationRate = totalCandidates > 0 ? (validatedReviewers / totalCandidates) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Candidates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalCandidates}</p>
                <p className="text-sm text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validated Reviewers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{validatedReviewers}</p>
                <p className="text-sm text-muted-foreground">Validated Reviewers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Excluded Reviewers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{excludedReviewers}</p>
                <p className="text-sm text-muted-foreground">Excluded Reviewers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Rate */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Validation Success Rate</span>
              <Badge variant={validationRate >= 50 ? 'default' : validationRate >= 25 ? 'secondary' : 'destructive'}>
                {validationRate.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={validationRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {validatedReviewers} out of {totalCandidates} candidates passed all validation rules
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {validationRate < 25 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <div className="rounded-full bg-amber-100 p-1">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Low Validation Rate</p>
                <p className="text-sm text-amber-700">
                  Consider relaxing some validation rules to get more reviewer recommendations.
                  You can adjust the minimum publications requirement or disable some conflict checks.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};