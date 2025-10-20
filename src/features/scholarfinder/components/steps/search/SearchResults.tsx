/**
 * SearchResults Component
 * Displays search results with reviewer count and sample data
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  TrendingUp,
  Globe,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseSearchResponse, Reviewer } from '../../../types/api';

interface SearchResultsProps {
  results: DatabaseSearchResponse['data'];
  searchStatus: 'idle' | 'searching' | 'completed' | 'failed' | 'partial';
  searchErrors: Record<string, string>;
  databaseNames: Record<string, string>;
  onRetryFailed?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchStatus,
  searchErrors,
  databaseNames,
  onRetryFailed
}) => {
  const [showPreview, setShowPreview] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200'
    };

    const labels = {
      success: 'Success',
      failed: 'Failed',
      in_progress: 'In Progress'
    };

    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs", variants[status as keyof typeof variants])}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const successfulDatabases = Object.entries(results.search_status)
    .filter(([_, status]) => status === 'success');
  
  const failedDatabases = Object.entries(results.search_status)
    .filter(([_, status]) => status === 'failed');

  const hasFailures = failedDatabases.length > 0;
  const hasSuccesses = successfulDatabases.length > 0;

  // Calculate statistics from preview data
  const previewStats = results.preview_reviewers ? {
    totalReviewers: results.preview_reviewers.length,
    avgPublications: Math.round(
      results.preview_reviewers.reduce((sum, r) => sum + r.Total_Publications, 0) / 
      results.preview_reviewers.length
    ),
    countries: [...new Set(results.preview_reviewers.map(r => r.country))].length,
    topCountries: Object.entries(
      results.preview_reviewers.reduce((acc, r) => {
        acc[r.country] = (acc[r.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([country]) => country)
  } : null;

  return (
    <div className="space-y-4">
      {/* Overall Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Search Results</span>
            {searchStatus === 'partial' && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                Partial Results
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {results.total_reviewers.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Reviewers Found
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {successfulDatabases.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Databases Searched Successfully
              </div>
            </div>
            
            {previewStats && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {previewStats.countries}
                </div>
                <div className="text-sm text-muted-foreground">
                  Countries Represented
                </div>
              </div>
            )}
          </div>

          {/* Database Status Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Database Results</h4>
            <div className="space-y-2">
              {Object.entries(results.search_status).map(([databaseId, status]) => (
                <div key={databaseId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <span className="font-medium">
                      {databaseNames[databaseId] || databaseId}
                    </span>
                    {getStatusBadge(status)}
                  </div>
                  {status === 'failed' && searchErrors[databaseId] && (
                    <span className="text-xs text-red-600">
                      {searchErrors[databaseId]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Toggle */}
          {results.preview_reviewers && results.preview_reviewers.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                Preview available for {results.preview_reviewers.length} reviewers
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Preview
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Statistics */}
      {showPreview && previewStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Preview Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Building className="h-4 w-4" />
                  <span>Publication Statistics</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  <p>Average publications per reviewer: {previewStats.avgPublications}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Globe className="h-4 w-4" />
                  <span>Geographic Distribution</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  <p>Top countries: {previewStats.topCountries.join(', ')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Reviewers Preview */}
      {showPreview && results.preview_reviewers && results.preview_reviewers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Reviewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.preview_reviewers.slice(0, 5).map((reviewer, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{reviewer.reviewer}</div>
                      <div className="text-sm text-muted-foreground">
                        {reviewer.aff}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {reviewer.city}, {reviewer.country}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">
                        {reviewer.Total_Publications} publications
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {reviewer.conditions_met} conditions met
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {results.preview_reviewers.length > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  ... and {results.preview_reviewers.length - 5} more reviewers
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partial Results Warning */}
      {searchStatus === 'partial' && hasFailures && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-2">
              <p className="font-medium">Partial Search Results</p>
              <p>
                {failedDatabases.length} database{failedDatabases.length !== 1 ? 's' : ''} failed to respond: {' '}
                {failedDatabases.map(([db]) => databaseNames[db] || db).join(', ')}
              </p>
              <p>
                You can continue with the current results or retry the failed databases.
              </p>
              {onRetryFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetryFailed}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Failed Databases
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Complete Failure */}
      {searchStatus === 'failed' && !hasSuccesses && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Search Failed</p>
              <p>
                All selected databases failed to respond. This may be due to network issues 
                or temporary database unavailability.
              </p>
              <p>
                Please check your internet connection and try again, or contact support if the problem persists.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {searchStatus === 'completed' && hasSuccesses && !hasFailures && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <p className="font-medium">Search Completed Successfully</p>
            <p>
              Found {results.total_reviewers.toLocaleString()} potential reviewers across {' '}
              {successfulDatabases.length} database{successfulDatabases.length !== 1 ? 's' : ''}. 
              You can now proceed to the next step.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Next Steps Information */}
      {hasSuccesses && results.total_reviewers > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Ready for Next Step</p>
                <p className="text-blue-600 mt-1">
                  Your search has found {results.total_reviewers.toLocaleString()} potential reviewers. 
                  In the next step, you can manually add specific reviewers you know in your field, 
                  then proceed to author validation and filtering.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchResults;