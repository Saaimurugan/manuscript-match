/**
 * Validation Step Display Component
 * Shows step-by-step validation results with checkmarks and crosses
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Users, FileText, Building, AlertTriangle } from 'lucide-react';
import type { ValidationResults, ValidationRequest } from '@/types/api';

interface ValidationStepDisplayProps {
  steps: ValidationResults['validationSteps'];
  rules: ValidationRequest['rules'];
}

interface StepConfig {
  key: keyof ValidationResults['validationSteps'];
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  ruleKey: keyof ValidationRequest['rules'];
  enabled: boolean;
}

export const ValidationStepDisplay: React.FC<ValidationStepDisplayProps> = ({
  steps,
  rules,
}) => {
  const stepConfigs: StepConfig[] = [
    {
      key: 'manuscriptAuthors',
      title: 'Manuscript Authors',
      description: 'Exclude authors who appear in the manuscript',
      icon: FileText,
      ruleKey: 'excludeManuscriptAuthors',
      enabled: rules.excludeManuscriptAuthors,
    },
    {
      key: 'coAuthors',
      title: 'Co-Authors',
      description: 'Exclude authors who have co-authored with manuscript authors',
      icon: Users,
      ruleKey: 'excludeCoAuthors',
      enabled: rules.excludeCoAuthors,
    },
    {
      key: 'publications',
      title: 'Publication Count',
      description: `Require minimum ${rules.minimumPublications} publications`,
      icon: FileText,
      ruleKey: 'minimumPublications',
      enabled: rules.minimumPublications > 0,
    },
    {
      key: 'retractions',
      title: 'Retractions',
      description: `Allow maximum ${rules.maxRetractions} retractions`,
      icon: AlertTriangle,
      ruleKey: 'maxRetractions',
      enabled: true, // Always check retractions
    },
    {
      key: 'institutions',
      title: 'Institutional Conflicts',
      description: 'Exclude reviewers from same institutions',
      icon: Building,
      ruleKey: 'excludeInstitutionalConflicts',
      enabled: rules.excludeInstitutionalConflicts,
    },
  ];

  const getStepStatus = (step: StepConfig) => {
    if (!step.enabled) {
      return 'disabled';
    }
    
    const stepData = steps[step.key];
    const total = stepData.excluded + stepData.passed;
    
    if (total === 0) {
      return 'no-data';
    }
    
    return stepData.passed > 0 ? 'passed' : 'failed';
  };

  const getStepIcon = (step: StepConfig) => {
    const status = getStepStatus(step);
    const IconComponent = step.icon;
    
    switch (status) {
      case 'disabled':
        return <IconComponent className="h-5 w-5 text-gray-400" />;
      case 'no-data':
        return <IconComponent className="h-5 w-5 text-gray-400" />;
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <IconComponent className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepBadge = (step: StepConfig) => {
    const status = getStepStatus(step);
    
    switch (status) {
      case 'disabled':
        return <Badge variant="secondary">Disabled</Badge>;
      case 'no-data':
        return <Badge variant="outline">No Data</Badge>;
      case 'passed':
        return <Badge variant="default">Active</Badge>;
      case 'failed':
        return <Badge variant="destructive">All Excluded</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg font-medium">Validation Steps</h4>
        <p className="text-sm text-muted-foreground">
          Detailed breakdown of how each validation rule was applied
        </p>
      </div>

      <div className="grid gap-4">
        {stepConfigs.map((step) => {
          const stepData = steps[step.key];
          const total = stepData.excluded + stepData.passed;
          const passRate = total > 0 ? (stepData.passed / total) * 100 : 0;
          const status = getStepStatus(step);

          return (
            <Card key={step.key} className={status === 'disabled' ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step)}
                    <div>
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {getStepBadge(step)}
                </div>
              </CardHeader>
              
              {step.enabled && total > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Pass Rate</span>
                        <span className="font-medium">{passRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={passRate} className="h-2" />
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{total}</p>
                        <p className="text-muted-foreground">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-green-600">{stepData.passed}</p>
                        <p className="text-muted-foreground">Passed</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-red-600">{stepData.excluded}</p>
                        <p className="text-muted-foreground">Excluded</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}

              {step.enabled && total === 0 && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    No data available for this validation step
                  </p>
                </CardContent>
              )}

              {!step.enabled && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    This validation rule is currently disabled
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};