import React from 'react';
import { TimelineDataPoint } from '../../hooks/useReports';

interface ProcessTimelineChartProps {
  data: TimelineDataPoint[];
  detailed?: boolean;
}

export function ProcessTimelineChart({ data, detailed = false }: ProcessTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No timeline data available
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.created, d.completed)),
    1
  );

  const height = detailed ? 400 : 300;
  const chartHeight = height - 60;
  const barWidth = Math.max(4, Math.min(20, (100 / data.length) - 2));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-1" style={{ height: `${height}px` }}>
        {data.map((point, index) => {
          const createdHeight = (point.created / maxValue) * chartHeight;
          const completedHeight = (point.completed / maxValue) * chartHeight;
          
          return (
            <div key={point.date} className="flex flex-col items-center gap-1 flex-1">
              <div className="flex items-end gap-1 w-full justify-center" style={{ height: `${chartHeight}px` }}>
                <div
                  className="bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ 
                    height: `${createdHeight}px`,
                    width: `${barWidth}px`,
                    minHeight: point.created > 0 ? '2px' : '0'
                  }}
                  title={`Created: ${point.created}`}
                />
                <div
                  className="bg-green-500 rounded-t hover:bg-green-600 transition-colors cursor-pointer"
                  style={{ 
                    height: `${completedHeight}px`,
                    width: `${barWidth}px`,
                    minHeight: point.completed > 0 ? '2px' : '0'
                  }}
                  title={`Completed: ${point.completed}`}
                />
              </div>
              {(detailed || index % Math.ceil(data.length / 10) === 0) && (
                <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left mt-2">
                  {new Date(point.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-sm">Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-sm">Completed</span>
        </div>
      </div>
    </div>
  );
}
