/**
 * Progress Indicators
 * Provides progress indicators for long-running operations
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Upload, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Database,
  FileText,
  Users,
  Shield,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';

// File Upload Progress
interface FileUploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  onCancel?: () => void;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  fileName,
  progress,
  status,
  error,
  onCancel
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500" />;
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return 'Processing and extracting metadata...';
      case 'completed':
        return 'Upload completed successfully';
      case 'error':
        return error || 'Upload failed';
      default:
        return 'Preparing upload...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <p className={cn("text-sm", getStatusColor())}>{getStatusText()}</p>
          </div>
          {onCancel && (status === 'uploading' || status === 'processing') && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        
        {(status === 'uploading' || status === 'processing') && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{status === 'uploading' ? 'Uploading' : 'Processing'}</span>
            </div>
          </div>
        )}
        
        {status === 'error' && error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Database Search Progress
interface DatabaseSearchProgressProps {
  databases: Array<{
    name: string;
    status: 'pending' | 'searching' | 'completed' | 'failed';
    progress?: number;
    resultsCount?: number;
    error?: string;
  }>;
  overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalResults: number;
  onCancel?: () => void;
}

export const DatabaseSearchProgress: React.FC<DatabaseSearchProgressProps> = ({
  databases,
  overallStatus,
  totalResults,
  onCancel
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'searching':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'searching':
        return <Badge variant="secondary" className="text-blue-600">Searching</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="text-green-600">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const completedDatabases = databases.filter(db => db.status === 'completed').length;
  const overallProgress = (completedDatabases / databases.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <CardTitle>Database Search Progress</CardTitle>
          </div>
          {onCancel && overallStatus === 'in_progress' && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel Search
            </Button>
          )}
        </div>
        <CardDescription>
          Searching {databases.length} databases for potential reviewers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{completedDatabases}/{databases.length} databases</span>
          </div>
          <Progress value={overallProgress} className="w-full" />
        </div>

        {/* Database Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map((database) => (
            <Card key={database.name} className="border-l-4 border-l-primary/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{database.name}</span>
                  </div>
                  {getStatusBadge(database.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(database.status)}
                    <span className="text-sm text-muted-foreground">
                      {database.status === 'completed' && database.resultsCount !== undefined
                        ? `${database.resultsCount} results found`
                        : database.status === 'failed' && database.error
                        ? database.error
                        : database.status.charAt(0).toUpperCase() + database.status.slice(1)
                      }
                    </span>
                  </div>
                </div>

                {database.status === 'searching' && database.progress !== undefined && (
                  <div className="mt-2">
                    <Progress value={database.progress} className="w-full h-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Results Summary */}
        {overallStatus === 'completed' && (
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">
              Search completed successfully!
            </p>
            <p className="text-sm text-green-600">
              Found {totalResults} potential reviewers across all databases
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Validation Progress
interface ValidationProgressProps {
  steps: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processed?: number;
    total?: number;
    excluded?: number;
  }>;
  overallStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalCandidates: number;
  validatedReviewers: number;
}

export const ValidationProgress: React.FC<ValidationProgressProps> = ({
  steps,
  overallStatus,
  totalCandidates,
  validatedReviewers
}) => {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const overallProgress = (completedSteps / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Author Validation Progress</CardTitle>
        </div>
        <CardDescription>
          Validating {totalCandidates} potential reviewers against conflict of interest rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Validation Progress</span>
            <span>{completedSteps}/{steps.length} steps completed</span>
          </div>
          <Progress value={overallProgress} className="w-full" />
        </div>

        {/* Validation Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                {getStepIcon(step.status)}
                <span className="font-medium">{step.name}</span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                {step.processed !== undefined && step.total !== undefined && (
                  <span>{step.processed}/{step.total}</span>
                )}
                {step.excluded !== undefined && step.excluded > 0 && (
                  <Badge variant="outline" className="text-red-600">
                    {step.excluded} excluded
                  </Badge>
                )}
                {step.status === 'processing' && step.processed && step.total && (
                  <div className="w-16">
                    <Progress value={(step.processed / step.total) * 100} className="h-1" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Results Summary */}
        {overallStatus === 'completed' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{totalCandidates}</div>
                <div className="text-sm text-muted-foreground">Total Candidates</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{validatedReviewers}</div>
                <div className="text-sm text-muted-foreground">Validated Reviewers</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{totalCandidates - validatedReviewers}</div>
                <div className="text-sm text-muted-foreground">Excluded</div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Export Progress
interface ExportProgressProps {
  fileName: string;
  format: string;
  progress: number;
  status: 'preparing' | 'generating' | 'completed' | 'error';
  error?: string;
  downloadUrl?: string;
  onDownload?: () => void;
}

export const ExportProgress: React.FC<ExportProgressProps> = ({
  fileName,
  format,
  progress,
  status,
  error,
  downloadUrl,
  onDownload
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
      case 'generating':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'preparing':
        return 'Preparing export...';
      case 'generating':
        return `Generating ${format.toUpperCase()} file...`;
      case 'completed':
        return 'Export completed successfully';
      case 'error':
        return error || 'Export failed';
      default:
        return 'Ready to export';
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-sm text-muted-foreground">{getStatusText()}</p>
          </div>
          {status === 'completed' && onDownload && (
            <Button size="sm" onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
        
        {(status === 'preparing' || status === 'generating') && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>{format.toUpperCase()} format</span>
            </div>
          </div>
        )}
        
        {status === 'error' && error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Generic Operation Progress
interface OperationProgressProps {
  title: string;
  description?: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  icon?: React.ReactNode;
  error?: string;
  onCancel?: () => void;
}

export const OperationProgress: React.FC<OperationProgressProps> = ({
  title,
  description,
  progress,
  status,
  icon,
  error,
  onCancel
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'in_progress':
        return 'border-l-blue-500';
      case 'completed':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <Card className={cn("border-l-4", getStatusColor())}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          {icon || <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {onCancel && status === 'in_progress' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        
        {status === 'in_progress' && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress}% complete</span>
              <span>Processing...</span>
            </div>
          </div>
        )}
        
        {status === 'error' && error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        
        {status === 'completed' && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            Operation completed successfully
          </div>
        )}
      </CardContent>
    </Card>
  );
};