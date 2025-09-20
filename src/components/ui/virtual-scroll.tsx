/**
 * Virtual Scrolling Component
 * Efficiently renders large lists by only rendering visible items
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (props: { item: T; index: number; style: React.CSSProperties }) => React.ReactNode;
  className?: string;
  overscan?: number; // Number of items to render outside visible area
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const itemCount = items.length;
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      itemCount
    );

    // Add overscan
    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount, visibleEnd + overscan);

    const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight
    }));

    return {
      visibleItems,
      totalHeight: itemCount * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);
  }, [onScroll]);

  // Handle loading state
  if (loading) {
    return (
      <div 
        className={cn("overflow-hidden", className)}
        style={{ height: containerHeight }}
      >
        {loadingComponent || (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    );
  }

  // Handle empty state
  if (items.length === 0) {
    return (
      <div 
        className={cn("overflow-hidden", className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent || (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No items to display
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                position: 'relative'
              }}
            >
              {renderItem({
                item,
                index,
                style: { height: itemHeight }
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Specialized Virtual List for Reviewers
interface VirtualReviewerListProps {
  reviewers: any[];
  onSelectReviewer: (reviewerId: string, selected: boolean) => void;
  selectedReviewerIds: Set<string>;
  containerHeight?: number;
  className?: string;
  loading?: boolean;
}

export const VirtualReviewerList: React.FC<VirtualReviewerListProps> = ({
  reviewers,
  onSelectReviewer,
  selectedReviewerIds,
  containerHeight = 600,
  className,
  loading = false
}) => {
  const renderReviewerItem = useCallback(({ item: reviewer, index, style }: any) => (
    <div style={style} className="px-4 py-2 border-b">
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={selectedReviewerIds.has(reviewer.id)}
          onChange={(e) => onSelectReviewer(reviewer.id, e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium truncate">{reviewer.name}</h3>
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {reviewer.matchScore}% match
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {reviewer.affiliation}, {reviewer.country}
          </p>
          <p className="text-xs text-muted-foreground">
            {reviewer.publicationCount} publications
          </p>
        </div>
      </div>
    </div>
  ), [selectedReviewerIds, onSelectReviewer]);

  return (
    <VirtualScroll
      items={reviewers}
      itemHeight={80}
      containerHeight={containerHeight}
      renderItem={renderReviewerItem}
      className={className}
      loading={loading}
      emptyComponent={
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="text-4xl mb-2">👥</div>
          <p>No reviewers found</p>
        </div>
      }
    />
  );
};

// Specialized Virtual List for Processes
interface VirtualProcessListProps {
  processes: any[];
  onSelectProcess: (process: any) => void;
  containerHeight?: number;
  className?: string;
  loading?: boolean;
}

export const VirtualProcessList: React.FC<VirtualProcessListProps> = ({
  processes,
  onSelectProcess,
  containerHeight = 400,
  className,
  loading = false
}) => {
  const renderProcessItem = useCallback(({ item: process, index, style }: any) => (
    <div 
      style={style} 
      className="px-4 py-3 border-b hover:bg-muted/50 cursor-pointer"
      onClick={() => onSelectProcess(process)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{process.title}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {process.description}
          </p>
          <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
            <span>Step {process.currentStep} of 5</span>
            <span>{new Date(process.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={cn(
            "px-2 py-1 rounded text-xs",
            process.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            process.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          )}>
            {process.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  ), [onSelectProcess]);

  return (
    <VirtualScroll
      items={processes}
      itemHeight={90}
      containerHeight={containerHeight}
      renderItem={renderProcessItem}
      className={className}
      loading={loading}
      emptyComponent={
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="text-4xl mb-2">📄</div>
          <p>No processes found</p>
        </div>
      }
    />
  );
};

// Specialized Virtual List for Activity Logs
interface VirtualActivityListProps {
  activities: any[];
  containerHeight?: number;
  className?: string;
  loading?: boolean;
}

export const VirtualActivityList: React.FC<VirtualActivityListProps> = ({
  activities,
  containerHeight = 500,
  className,
  loading = false
}) => {
  const renderActivityItem = useCallback(({ item: activity, index, style }: any) => (
    <div style={style} className="px-4 py-3 border-b">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <span className="text-xs font-medium text-primary">
            {activity.action.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium">{activity.action}</p>
            <span className="text-xs text-muted-foreground">
              {new Date(activity.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {activity.description}
          </p>
          {activity.details && (
            <div className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded">
              {JSON.stringify(activity.details, null, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  ), []);

  return (
    <VirtualScroll
      items={activities}
      itemHeight={100}
      containerHeight={containerHeight}
      renderItem={renderActivityItem}
      className={className}
      loading={loading}
      emptyComponent={
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="text-4xl mb-2">📋</div>
          <p>No activity logs found</p>
        </div>
      }
    />
  );
};