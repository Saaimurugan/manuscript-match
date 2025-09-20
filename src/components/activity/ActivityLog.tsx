import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, User, Activity, Search, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useActivityLogs, useRealtimeActivityLogs } from "@/hooks/useActivityLogs";
import { ActivityLogQuery } from "@/services/activityLogger";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLogProps {
  userId?: string;
  currentUser?: string;
  processId?: string;
  enableRealtime?: boolean;
  showFilters?: boolean;
  height?: string;
}

export function ActivityLog({ 
  userId, 
  currentUser, 
  processId,
  enableRealtime = false,
  showFilters = true,
  height = "400px"
}: ActivityLogProps) {
  const [query, setQuery] = useState<ActivityLogQuery>({
    page: 1,
    limit: 20,
    userId,
    processId,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Use realtime hook if enabled, otherwise use regular hook
  const { data, isLoading, error, refetch } = enableRealtime 
    ? useRealtimeActivityLogs(query, 5000)
    : useActivityLogs(query);

  const handleSearch = () => {
    setQuery(prev => ({
      ...prev,
      search: searchTerm,
      action: actionFilter === 'all' ? undefined : actionFilter || undefined,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const getActionBadgeVariant = (action: string) => {
    const actionLower = action.toLowerCase();
    switch (true) {
      case actionLower.includes('login') || actionLower.includes('auth'):
        return "default";
      case actionLower.includes('upload') || actionLower.includes('file'):
        return "secondary";
      case actionLower.includes('search') || actionLower.includes('database'):
        return "outline";
      case actionLower.includes('export') || actionLower.includes('download'):
        return "destructive";
      case actionLower.includes('create') || actionLower.includes('process'):
        return "default";
      case actionLower.includes('validate') || actionLower.includes('recommendation'):
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Failed to load activities</p>
            <Button variant="outline" onClick={handleRefresh} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
          {currentUser && (
            <Badge variant="outline" className="ml-auto">
              <User className="h-3 w-3 mr-1" />
              {currentUser}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        
        {showFilters && (
          <div className="flex gap-2 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="PROCESS_CREATED">Process Created</SelectItem>
                <SelectItem value="FILE_UPLOADED">File Upload</SelectItem>
                <SelectItem value="SEARCH_INITIATED">Database Search</SelectItem>
                <SelectItem value="VALIDATION_COMPLETED">Validation</SelectItem>
                <SelectItem value="EXPORT_GENERATED">Export</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className={`pr-4`} style={{ height }}>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-l-2 border-muted pl-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities recorded yet</p>
              {query.search && (
                <p className="text-sm mt-2">
                  Try adjusting your search filters
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data.data.map((activity) => (
                <div
                  key={activity.id}
                  className="border-l-2 border-muted pl-4 pb-4 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getActionBadgeVariant(activity.action)}>
                          {formatActionName(activity.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.formattedTimestamp || 
                            format(new Date(activity.timestamp), "MMM dd, HH:mm:ss")}
                        </span>
                      </div>
                      
                      {activity.details && typeof activity.details === 'string' && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {activity.details}
                        </p>
                      )}
                      
                      {activity.details && typeof activity.details === 'object' && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {Object.entries(activity.details).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>{" "}
                              <span className="text-foreground">
                                {typeof value === 'object' 
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {activity.processId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Process: <span className="font-mono">{activity.processId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Pagination */}
        {data?.pagination && data.pagination.total > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{" "}
              {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
              {data.pagination.total} activities
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(query.page! - 1)}
                disabled={!data.pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <span className="text-sm">
                Page {data.pagination.page} of {Math.ceil(data.pagination.total / data.pagination.limit)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(query.page! + 1)}
                disabled={!data.pagination.hasNextPage}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}