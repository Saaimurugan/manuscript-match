/**
 * Search Progress Component
 * Displays real-time search progress with database-specific status
 */

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { useSearchProgress } from "@/hooks/useSearch";

interface SearchProgressProps {
  processId: string;
  onComplete?: () => void;
}

export const SearchProgress = ({ processId, onComplete }: SearchProgressProps) => {
  const { 
    status, 
    progress, 
    totalFound, 
    progressPercentage, 
    isSearching, 
    isCompleted, 
    isFailed,
    error 
  } = useSearchProgress(processId);

  // Call onComplete when search finishes
  React.useEffect(() => {
    if (isCompleted && onComplete) {
      onComplete();
    }
  }, [isCompleted, onComplete]);

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    if (isSearching) return <Clock className="w-5 h-5 text-blue-500" />;
    if (isCompleted) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (isFailed) return <XCircle className="w-5 h-5 text-red-500" />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusDescription = () => {
    if (isSearching) return "Searching databases for potential reviewers...";
    if (isCompleted) return `Search completed! Found ${totalFound} potential reviewers.`;
    if (isFailed) return "Search failed. Please try again or contact support.";
    return "Search status unknown";
  };

  const getDatabaseDisplayName = (database: string) => {
    switch (database) {
      case 'taylorFrancis': return 'Taylor & Francis';
      case 'pubmed': return 'PubMed';
      case 'elsevier': return 'Elsevier/ScienceDirect';
      case 'wiley': return 'Wiley Online Library';
      default: return database.charAt(0).toUpperCase() + database.slice(1);
    }
  };

  const getDatabaseStatusIcon = (dbStatus: string) => {
    switch (dbStatus) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS': return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING': return <Clock className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDatabaseStatusText = (dbStatus: string, count: number) => {
    switch (dbStatus) {
      case 'COMPLETED': return `Found ${count} reviewers`;
      case 'IN_PROGRESS': return 'Searching...';
      case 'FAILED': return 'Search failed';
      case 'PENDING': return 'Waiting to start';
      default: return 'Unknown status';
    }
  };

  const getDatabaseStatusVariant = (dbStatus: string) => {
    switch (dbStatus) {
      case 'COMPLETED': return 'default' as const;
      case 'IN_PROGRESS': return 'secondary' as const;
      case 'FAILED': return 'destructive' as const;
      case 'PENDING': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Search Progress</span>
        </CardTitle>
        <CardDescription>
          {getStatusDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        {/* Database-specific Progress */}
        {progress && Object.keys(progress).length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Database Progress</div>
            <div className="grid gap-3">
              {Object.entries(progress).map(([database, info]) => (
                <div key={database} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getDatabaseStatusIcon(info.status)}
                    <div>
                      <div className="font-medium">
                        {getDatabaseDisplayName(database)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getDatabaseStatusText(info.status, info.count)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={getDatabaseStatusVariant(info.status)}>
                    {info.count || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Information */}
        {isFailed && error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message || "An error occurred during the search. Please try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Summary */}
        {isCompleted && totalFound > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Search completed successfully! Found {totalFound} potential reviewers across all databases. 
              You can now proceed to the validation step to filter these results.
            </AlertDescription>
          </Alert>
        )}

        {/* No Results */}
        {isCompleted && totalFound === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No potential reviewers were found with the current search criteria. 
              Consider broadening your keywords or trying manual searches.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};