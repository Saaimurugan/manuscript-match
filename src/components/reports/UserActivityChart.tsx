import React from 'react';
import { UserActivityData } from '../../hooks/useReports';
import { Badge } from '../ui/badge';

interface UserActivityChartProps {
  data: UserActivityData[];
  detailed?: boolean;
}

export function UserActivityChart({ data, detailed = false }: UserActivityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No user activity data available
      </div>
    );
  }

  const maxProcesses = Math.max(...data.map(d => d.processCount), 1);
  const displayData = detailed ? data : data.slice(0, 10);

  return (
    <div className="space-y-4">
      {displayData.map((user) => {
        const processPercentage = (user.processCount / maxProcesses) * 100;
        const activePercentage = user.processCount > 0 
          ? (user.activeCount / user.processCount) * 100 
          : 0;
        const completedPercentage = user.processCount > 0 
          ? (user.completedCount / user.processCount) * 100 
          : 0;

        return (
          <div key={user.userId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {user.userEmail}
                </span>
                <Badge variant="outline" className="text-xs">
                  {user.processCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-blue-600">{user.activeCount} active</span>
                <span className="text-green-600">{user.completedCount} done</span>
              </div>
            </div>
            
            <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                style={{ width: `${processPercentage}%` }}
              />
              <div
                className="absolute left-0 top-0 h-full bg-green-500 transition-all"
                style={{ width: `${(completedPercentage / 100) * processPercentage}%` }}
              />
            </div>
          </div>
        );
      })}

      {!detailed && data.length > 10 && (
        <p className="text-sm text-muted-foreground text-center pt-2">
          Showing top 10 users. Switch to Users tab for full details.
        </p>
      )}
    </div>
  );
}
