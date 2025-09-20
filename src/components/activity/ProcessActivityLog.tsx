import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Activity, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useProcessActivityLogs } from "@/hooks/useActivityLogs";
import { ActivityLogQuery } from "@/services/activityLogger";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcessActivityLogProps {
  processId: string;
  height?: string;
  showPagination?: boolean;
}

export function ProcessActivityLog({ 
  processId, 
  height = "300px",
  showPagination = true
}: ProcessActivityLogProps) {
  const [query, setQuery] = useState<Omit<ActivityLogQuery, 'processId'>>({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  const { data, isLoading, error, refetch } = useProcessActivityLogs(processId, query);

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    refetch();
  };

  const getActionBadgeVariant = (action: string) => {
    const actionLower = action.toLowerCase();
    switch (true) {
      case actionLower.includes('upload') || actionLower.includes('file'):
        return "default";
      case actionLower.includes('metadata') || actionLower.includes('extract'):
        return "secondary";
      case actionLower.includes('keyword') || actionLower.includes('enhance'):
        return "outline";
      case actionLower.includes('search') || actionLower.includes('database'):
        return "destructive";
      case actionLower.includes('validate') || actionLower.includes('validation'):
        return "default";
      case actionLower.includes('recommendation') || actionLower.includes('shortlist'):
        return "secondary";
      case actionLower.includes('export'):
        return "outline";
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Process Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Failed to load process activities</p>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Process Activity
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="pr-4" style={{ height }}>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-l-2 border-muted pl-3 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No activities recorded for this process yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.data.map((activity, index) => (
                <div
                  key={activity.id}
                  className="border-l-2 border-muted pl-3 pb-3 last:pb-0 relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[5px] top-2 w-2 h-2 bg-primary rounded-full" />
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={getActionBadgeVariant(activity.action)}
                          className="text-xs"
                        >
                          {formatActionName(activity.action)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {activity.formattedTimestamp || 
                            format(new Date(activity.timestamp), "MMM dd, HH:mm")}
                        </span>
                      </div>
                      
                      {activity.details && typeof activity.details === 'string' && (
                        <p className="text-sm text-muted-foreground">
                          {activity.details}
                        </p>
                      )}
                      
                      {activity.details && typeof activity.details === 'object' && (
                        <div className="mt-1 text-xs text-muted-foreground space-y-1">
                          {Object.entries(activity.details).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </span>{" "}
                              <span className="text-foreground">
                                {typeof value === 'object' 
                                  ? JSON.stringify(value).substring(0, 50) + '...'
                                  : String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')
                                }
                              </span>
                            </div>
                          ))}
                          {Object.keys(activity.details).length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{Object.keys(activity.details).length - 3} more fields
                            </div>
                          )}
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
        {showPagination && data?.pagination && data.pagination.total > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              {data.pagination.total} total activities
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(query.page! - 1)}
                disabled={!data.pagination.hasPreviousPage}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <span className="text-xs">
                {data.pagination.page} / {Math.ceil(data.pagination.total / data.pagination.limit)}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(query.page! + 1)}
                disabled={!data.pagination.hasNextPage}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}