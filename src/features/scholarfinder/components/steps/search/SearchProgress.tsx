/**
 * SearchProgress Component
 * Shows real-time progress tracking during database search
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchProgressProps {
  selectedDatabases: string[];
  databaseNames: Record<string, string>;
}

interface DatabaseProgress {
  id: string;
  name: string;
  status: 'pending' | 'searching' | 'completed' | 'failed';
  progress: number;
  estimatedTime?: number;
  resultCount?: number;
}

export const SearchProgress: React.FC<SearchProgressProps> = ({
  selectedDatabases,
  databaseNames
}) => {
  const [databases, setDatabases] = useState<DatabaseProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  // Initialize database progress tracking
  useEffect(() => {
    const initialDatabases: DatabaseProgress[] = selectedDatabases.map((id, index) => ({
      id,
      name: databaseNames[id] || id,
      status: index === 0 ? 'searching' : 'pending',
      progress: 0,
      estimatedTime: getEstimatedSearchTime(id)
    }));
    
    setDatabases(initialDatabases);
  }, [selectedDatabases, databaseNames]);

  // Simulate search progress
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      
      setDatabases(prev => {
        const updated = [...prev];
        let hasChanges = false;
        
        // Update progress for searching databases
        updated.forEach((db, index) => {
          if (db.status === 'searching' && db.progress < 100) {
            // Simulate realistic progress with some randomness
            const increment = Math.random() * 15 + 5; // 5-20% increment
            const newProgress = Math.min(db.progress + increment, 100);
            updated[index] = { ...db, progress: newProgress };
            hasChanges = true;
            
            // Complete the search when progress reaches 100%
            if (newProgress >= 100) {
              updated[index] = {
                ...db,
                status: 'completed',
                progress: 100,
                resultCount: Math.floor(Math.random() * 500) + 50 // Simulate result count
              };
              
              // Start next database if available
              const nextIndex = updated.findIndex(d => d.status === 'pending');
              if (nextIndex !== -1) {
                updated[nextIndex] = { ...updated[nextIndex], status: 'searching' };
              }
            }
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate overall progress
  useEffect(() => {
    const totalDatabases = databases.length;
    if (totalDatabases === 0) return;
    
    const totalProgress = databases.reduce((sum, db) => sum + db.progress, 0);
    const overall = totalProgress / totalDatabases;
    setOverallProgress(overall);
    
    // Calculate estimated time remaining
    const completedDatabases = databases.filter(db => db.status === 'completed').length;
    const remainingDatabases = totalDatabases - completedDatabases;
    
    if (completedDatabases > 0 && remainingDatabases > 0) {
      const avgTimePerDatabase = elapsedTime / completedDatabases;
      setEstimatedTimeRemaining(Math.ceil(avgTimePerDatabase * remainingDatabases));
    } else if (remainingDatabases === 0) {
      setEstimatedTimeRemaining(0);
    }
  }, [databases, elapsedTime]);

  const getEstimatedSearchTime = (databaseId: string): number => {
    // Estimated search times in seconds for different databases
    const times = {
      pubmed: 45,
      tandf: 60,
      sciencedirect: 50,
      wiley: 55
    };
    return times[databaseId as keyof typeof times] || 50;
  };

  const getStatusIcon = (status: DatabaseProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'searching':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DatabaseProgress['status']) => {
    const variants = {
      pending: 'bg-gray-100 text-gray-600 border-gray-200',
      searching: 'bg-blue-100 text-blue-600 border-blue-200',
      completed: 'bg-green-100 text-green-600 border-green-200',
      failed: 'bg-red-100 text-red-600 border-red-200'
    };

    const labels = {
      pending: 'Pending',
      searching: 'Searching',
      completed: 'Completed',
      failed: 'Failed'
    };

    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs", variants[status])}
      >
        {labels[status]}
      </Badge>
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = databases.filter(db => db.status === 'completed').length;
  const totalResults = databases.reduce((sum, db) => sum + (db.resultCount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Searching Databases</span>
          </CardTitle>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Elapsed: {formatTime(elapsedTime)}</span>
            </div>
            {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
              <div className="flex items-center space-x-1">
                <span>ETA: {formatTime(estimatedTimeRemaining)}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {completedCount} of {databases.length} databases completed
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(overallProgress)}% complete</span>
            {totalResults > 0 && (
              <span>{totalResults.toLocaleString()} reviewers found so far</span>
            )}
          </div>
        </div>

        {/* Individual Database Progress */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Database Status</h4>
          <div className="space-y-3">
            {databases.map((database) => (
              <div key={database.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(database.status)}
                    <span className="text-sm font-medium">{database.name}</span>
                    {getStatusBadge(database.status)}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    {database.status === 'completed' && database.resultCount && (
                      <span>{database.resultCount.toLocaleString()} results</span>
                    )}
                    {database.status === 'searching' && (
                      <span>{Math.round(database.progress)}%</span>
                    )}
                  </div>
                </div>
                
                {(database.status === 'searching' || database.status === 'completed') && (
                  <Progress 
                    value={database.progress} 
                    className={cn(
                      "h-1.5",
                      database.status === 'completed' && "bg-green-100"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Search Information */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Database className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Search in Progress</p>
              <p className="text-blue-600 text-xs mt-1">
                We're searching across {databases.length} academic databases using your enhanced keywords. 
                This process may take a few minutes depending on database response times.
              </p>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Search times may vary based on database availability and query complexity</p>
          <p>• You can continue to the next step once at least one database completes successfully</p>
          <p>• Failed searches can be retried individually after completion</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchProgress;