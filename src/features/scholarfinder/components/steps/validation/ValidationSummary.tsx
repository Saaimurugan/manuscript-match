/**
 * ValidationSummary Component
 * Displays validation results and criteria summary
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, Shield, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ValidationSummary as ValidationSummaryType } from '../../../types/api';

interface ValidationSummaryProps {
  summary: ValidationSummaryType;
  validationCriteria: string[];
  totalAuthorsProcessed: number;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  summary,
  validationCriteria,
  totalAuthorsProcessed
}) => {
  // Calculate validation success rate
  const validationRate = summary.total_authors > 0 
    ? (summary.authors_validated / summary.total_authors) * 100 
    : 0;

  // Determine quality level based on average conditions met
  const getQualityLevel = (avgConditions: number) => {
    if (avgConditions >= 7) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    if (avgConditions >= 5) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    if (avgConditions >= 3) return { level: 'Fair', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    return { level: 'Needs Review', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  };

  const qualityLevel = getQualityLevel(summary.average_conditions_met);

  // Format percentage
  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-green-900">Validation Completed Successfully</CardTitle>
            <CardDescription className="text-green-700">
              Author validation has been completed with detailed quality assessment
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-green-200">
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{summary.authors_validated.toLocaleString()}</p>
              <p className="text-sm text-green-700">Authors Validated</p>
              <p className="text-xs text-green-600">
                {formatPercentage(validationRate)} success rate
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-green-200">
            <Shield className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{summary.conditions_applied.length}</p>
              <p className="text-sm text-green-700">Validation Rules</p>
              <p className="text-xs text-green-600">Applied successfully</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-green-200">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-900">{summary.average_conditions_met.toFixed(1)}</p>
              <p className="text-sm text-green-700">Avg. Conditions Met</p>
              <p className="text-xs text-green-600">Out of {summary.conditions_applied.length}</p>
            </div>
          </div>
        </div>

        {/* Quality Assessment */}
        <div className={cn(
          "p-4 rounded-lg border",
          qualityLevel.bgColor,
          qualityLevel.borderColor
        )}>
          <div className="flex items-center space-x-3 mb-3">
            <Award className={cn("h-5 w-5", qualityLevel.color)} />
            <h4 className={cn("font-semibold", qualityLevel.color)}>
              Overall Quality: {qualityLevel.level}
            </h4>
          </div>
          <p className={cn("text-sm", qualityLevel.color)}>
            {qualityLevel.level === 'Excellent' && 
              'Outstanding validation results! The majority of reviewers meet high-quality standards with excellent conflict-free profiles.'}
            {qualityLevel.level === 'Good' && 
              'Good validation results. Most reviewers meet quality standards with minimal conflicts of interest.'}
            {qualityLevel.level === 'Fair' && 
              'Acceptable validation results. Some reviewers may need additional screening before final selection.'}
            {qualityLevel.level === 'Needs Review' && 
              'Validation results suggest careful review is needed. Consider adjusting search criteria or validation rules.'}
          </p>
        </div>

        {/* Validation Statistics */}
        <div className="space-y-4">
          <h4 className="font-semibold text-green-900">Validation Statistics</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Total Authors Found</span>
                <span className="font-semibold text-green-700">{summary.total_authors.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Successfully Validated</span>
                <span className="font-semibold text-green-700">
                  {summary.authors_validated.toLocaleString()} ({formatPercentage(validationRate)})
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Authors Processed</span>
                <span className="font-semibold text-green-700">{totalAuthorsProcessed.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Validation Rules Applied</span>
                <span className="font-semibold text-green-700">{summary.conditions_applied.length}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Average Score</span>
                <span className="font-semibold text-green-700">
                  {summary.average_conditions_met.toFixed(1)}/{summary.conditions_applied.length}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                <span className="text-sm font-medium text-green-900">Quality Rating</span>
                <span className={cn("font-semibold", qualityLevel.color)}>
                  {qualityLevel.level}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Applied Validation Criteria */}
        <div className="space-y-3">
          <h4 className="font-semibold text-green-900">Applied Validation Criteria</h4>
          <div className="flex flex-wrap gap-2">
            {summary.conditions_applied.map((condition, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-green-100 text-green-800 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {condition}
              </Badge>
            ))}
          </div>
          
          {validationCriteria.length > summary.conditions_applied.length && (
            <div className="mt-2">
              <p className="text-sm text-green-700 mb-2">Additional criteria checked:</p>
              <div className="flex flex-wrap gap-2">
                {validationCriteria
                  .filter(criterion => !summary.conditions_applied.includes(criterion))
                  .map((criterion, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="border-green-300 text-green-700"
                    >
                      {criterion}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="font-semibold text-green-900">Next Steps</h4>
          <div className="space-y-2">
            <div className="flex items-start space-x-2 p-3 bg-white rounded border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Review Recommendations</p>
                <p className="text-xs text-green-700">
                  Proceed to view detailed reviewer recommendations with validation scores
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 p-3 bg-white rounded border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">Filter by Quality</p>
                <p className="text-xs text-green-700">
                  Use validation scores to filter for the highest quality reviewers
                </p>
              </div>
            </div>
            
            {validationRate < 80 && (
              <div className="flex items-start space-x-2 p-3 bg-orange-50 rounded border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Consider Additional Sources</p>
                  <p className="text-xs text-orange-700">
                    Lower validation rate suggests you might benefit from additional manual reviewer additions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationSummary;