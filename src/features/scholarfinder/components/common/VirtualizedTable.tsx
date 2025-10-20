/**
 * VirtualizedTable Component
 * High-performance table component with virtual scrolling for large datasets
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, SortAsc, SortDesc } from 'lucide-react';
import { Reviewer } from '../../types/api';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps {
  data: Reviewer[];
  selectedIds: Set<string>;
  onSelectionChange: (id: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddToShortlist?: (reviewer: Reviewer) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  height?: number;
  itemHeight?: number;
  showActions?: boolean;
  isLoading?: boolean;
  className?: string;
}

interface ColumnDefinition {
  key: string;
  title: string;
  width: number;
  sortable: boolean;
  render: (reviewer: Reviewer, index: number) => React.ReactNode;
}

export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  onAddToShortlist,
  onSort,
  sortColumn,
  sortDirection,
  height = 400,
  itemHeight = 60,
  showActions = true,
  isLoading = false,
  className
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate visible items for virtual scrolling
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(height / itemHeight) + 1,
      data.length
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, height, data.length]);

  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [data, visibleRange]);

  // Column definitions
  const columns = useMemo((): ColumnDefinition[] => [
    {
      key: 'select',
      title: '',
      width: 50,
      sortable: false,
      render: (reviewer) => (
        <Checkbox
          checked={selectedIds.has(reviewer.email)}
          onCheckedChange={(checked) => 
            onSelectionChange(reviewer.email, checked as boolean)
          }
          aria-label={`Select ${reviewer.reviewer}`}
        />
      )
    },
    {
      key: 'reviewer',
      title: 'Name',
      width: Math.max(200, containerWidth * 0.25),
      sortable: true,
      render: (reviewer) => (
        <div className="min-w-0">
          <div className="font-medium truncate" title={reviewer.reviewer}>
            {reviewer.reviewer}
          </div>
          <div className="text-sm text-muted-foreground truncate" title={reviewer.email}>
            {reviewer.email}
          </div>
        </div>
      )
    },
    {
      key: 'aff',
      title: 'Affiliation',
      width: Math.max(200, containerWidth * 0.3),
      sortable: true,
      render: (reviewer) => (
        <div className="truncate" title={reviewer.aff}>
          {reviewer.aff}
        </div>
      )
    },
    {
      key: 'country',
      title: 'Country',
      width: 120,
      sortable: true,
      render: (reviewer) => reviewer.country
    },
    {
      key: 'Total_Publications',
      title: 'Publications',
      width: 120,
      sortable: true,
      render: (reviewer) => (
        <div className="text-center space-y-1">
          <div className="font-medium">{reviewer.Total_Publications}</div>
          {reviewer.Retracted_Pubs_no > 0 && (
            <Badge variant="destructive" className="text-xs">
              {reviewer.Retracted_Pubs_no} retracted
            </Badge>
          )}
          {reviewer.coauthor && (
            <Badge variant="outline" className="text-xs">
              Co-author
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'conditions_met',
      title: 'Score',
      width: 100,
      sortable: true,
      render: (reviewer) => {
        const totalConditions = reviewer.conditions_satisfied.split(',').length;
        const percentage = totalConditions > 0 ? (reviewer.conditions_met / totalConditions) * 100 : 0;
        
        let variant: "default" | "secondary" | "destructive" | "outline" = "default";
        if (percentage >= 80) variant = "default";
        else if (percentage >= 60) variant = "secondary";
        else variant = "outline";

        return (
          <div className="text-center">
            <Badge variant={variant} className="text-xs">
              {reviewer.conditions_met}/{totalConditions}
            </Badge>
          </div>
        );
      }
    },
    ...(showActions ? [{
      key: 'actions',
      title: 'Action',
      width: 100,
      sortable: false,
      render: (reviewer: Reviewer) => (
        <div className="text-center">
          <Button
            size="sm"
            onClick={() => onAddToShortlist?.(reviewer)}
            disabled={isLoading}
            aria-label={`Add ${reviewer.reviewer} to shortlist`}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )
    }] : [])
  ], [containerWidth, selectedIds, onSelectionChange, onAddToShortlist, showActions, isLoading]);

  const handleSort = useCallback((column: string) => {
    if (!onSort) return;
    
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(column, newDirection);
  }, [onSort, sortColumn, sortDirection]);

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const allSelected = data.length > 0 && data.every(reviewer => selectedIds.has(reviewer.email));
  const someSelected = data.some(reviewer => selectedIds.has(reviewer.email));

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-lg font-medium">No reviewers available</p>
        <p className="text-sm">Try adjusting your filters to see more reviewers</p>
      </div>
    );
  }

  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  return (
    <div ref={containerRef} className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Table Header */}
      <div className="bg-muted/50 border-b">
        <div className="flex items-center">
          {columns.map((column, index) => (
            <div
              key={column.key}
              className={cn(
                "px-4 py-3 font-medium text-sm",
                column.sortable && "cursor-pointer hover:bg-muted/70 transition-colors",
                index === 0 && "flex justify-center",
                column.key === 'conditions_met' && "text-center",
                column.key === 'actions' && "text-center"
              )}
              style={{ width: column.width, minWidth: column.width }}
              onClick={column.sortable ? () => handleSort(column.key) : undefined}
              role={column.sortable ? "button" : undefined}
              tabIndex={column.sortable ? 0 : undefined}
              onKeyDown={column.sortable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSort(column.key);
                }
              } : undefined}
            >
              {column.key === 'select' ? (
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el && el.querySelector('input')) {
                      (el.querySelector('input') as HTMLInputElement).indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onCheckedChange={allSelected ? onDeselectAll : onSelectAll}
                  aria-label="Select all reviewers"
                />
              ) : (
                <div className="flex items-center space-x-1">
                  <span>{column.title}</span>
                  {getSortIcon(column.key)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        className="overflow-auto"
        style={{ height }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((reviewer, index) => {
              const actualIndex = visibleRange.startIndex + index;
              return (
                <div
                  key={reviewer.email}
                  className="flex items-center border-b hover:bg-muted/50"
                  style={{ height: itemHeight }}
                >
                  {columns.map((column, colIndex) => (
                    <div
                      key={column.key}
                      className={cn(
                        "px-4 py-2 flex items-center",
                        colIndex === 0 && "justify-center",
                        column.key === 'conditions_met' && "justify-center",
                        column.key === 'actions' && "justify-center"
                      )}
                      style={{ width: column.width, minWidth: column.width }}
                    >
                      {column.render(reviewer, actualIndex)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoized version for better performance
export const MemoizedVirtualizedTable = React.memo(VirtualizedTable);