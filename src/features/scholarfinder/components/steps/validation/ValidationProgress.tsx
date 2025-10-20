/**
 * ValidationProgress Component
 * Displays real-time progress for the author validation process
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Shield, Users, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationProgressProps {
  progressPercentage: number;
  estimatedCompletionTime?: string;
  totalAuthorsProcessed: number;
  validationCriteria: string[];
}

export const ValidationProgress: React.FC<ValidationProgressProps> = ({
  progressPercentage,
  estimatedCompletionTime,
  totalAuthorsProcessed,
  validationCriteria
}) => {
  // Format estimated completion time
  const formatEstimatedTime = (timeString?: string) => {
    if (!timeString) return null;
    
    try {
      // If it's a duration like "5 minutes" or "2 hours"
      if (timeString.includes('minute') || timeString.includes('hour')) {
        return timeString;
      }
      
      // If it's a timestamp, parse and format
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMinutes = Math.ceil(diffMs / (1000 * 60));
        
        if (diffMinutes <= 0) {
          return 'Completing soon';
        } else if (diffMinutes < 60) {
          return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        } else {
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;
          return `${hours}h ${minutes}m`;
        }
      }
      
      return timeString;
    } catch (error) {
      return timeString;
    }
  };

  const formattedTime = formatEstimatedTime(estimatedCompletionTime);
  const progressColor = progressPercentage >= 75 ? 'bg-green-500' : progressPercentage >= 50 ? 'bg-blue-500' : 'bg-orange-500';

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="h-5 w-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-blue-900">Validation in Progress</CardTitle>
            <CardDescription className="text-blue-700">
              Checking authors against conflict rules and quality criteria
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Progress: {Math.round(progressPercentage)}%
            </span>
            {formattedTime && (
              <div className="flex items-center space-x-1 text-sm text-blue-700">
                <Clock className="h-4 w-4" />
                <span>~{formattedTime} remaining</span>
              </div>
            )}
          </div>
          
          <Progress 
            value={progressPercentage} 
            className="h-3"
            // Custom progress bar color based on progress
            style={{
              '--progress-background': progressColor
            } as React.CSSProperties}
          />
          
          <div className="flex items-center justify-between text-xs text-blue-600">
            <span>Starting validation</span>
            <span>Applying criteria</span>
            <span>Finalizing results</span>
          </div>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-200">
            <Users className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Authors Processed</p>
              <p className="text-sm text-blue-700">{totalAuthorsProcessed.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-blue-200">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Validation Criteria</p>
              <p className="text-sm text-blue-700">{validationCriteria.length} rules applied</p>
            </div>
          </div>
        </div>

        {/* Validation Criteria */}
        <div className="space-y-3">
          <h4 className="font-medium text-blue-900">Applied Validation Rules</h4>
          <div className="flex flex-wrap gap-2">
            {validationCriteria.map((criterion, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="bg-blue-100 text-blue-800 border-blue-200"
              >
                {criterion}
              </Badge>
            ))}
          </div>
        </div>

        {/* Progress Stages */}
        <div className="space-y-3">
          <h4 className="font-medium text-blue-900">Validation Stages</h4>
          <div className="space-y-2">
            {[
              { stage: 'Data Collection', threshold: 0, description: 'Gathering author information' },
              { stage: 'Conflict Detection', threshold: 25, description: 'Checking for conflicts of interest' },
              { stage: 'Quality Assessment', threshold: 50, description: 'Evaluating publication quality' },
              { stage: 'Final Scoring', threshold: 75, description: 'Calculating validation scores' },
              { stage: 'Results Compilation', threshold: 90, description: 'Preparing final results' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={cn(
                  "w-3 h-3 rounded-full border-2",
                  progressPercentage > item.threshold 
                    ? "bg-green-500 border-green-500" 
                    : progressPercentage >= item.threshold 
                    ? "bg-blue-500 border-blue-500 animate-pulse" 
                    : "bg-gray-200 border-gray-300"
                )} />
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium",
                    progressPercentage >= item.threshold ? "text-blue-900" : "text-gray-500"
                  )}>
                    {item.stage}
                  </p>
                  <p className={cn(
                    "text-xs",
                    progressPercentage >= item.threshold ? "text-blue-700" : "text-gray-400"
                  )}>
                    {item.description}
                  </p>
                </div>
                {progressPercentage > item.threshold && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="p-3 bg-blue-100 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>What's happening:</strong> The system is validating each potential reviewer against 
            conflict of interest rules, publication quality criteria, and other academic standards. 
            This process ensures you receive the most appropriate reviewer recommendations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ValidationProgress;