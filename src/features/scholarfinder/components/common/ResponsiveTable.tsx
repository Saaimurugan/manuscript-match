import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import { useAccessibilityContext } from '../accessibility/AccessibilityProvider';
import { responsiveText, responsiveSpacing } from '../../utils/responsive';
import { 
  getTableAria, 
  getTableHeaderAria, 
  getButtonAria,
  getListAria,
  getListItemAria
} from '../../utils/accessibility';

export interface TableColumn<T = any> {
  key: string;
  title: string;
  accessor: keyof T | ((item: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  mobileRender?: (item: T, index: number) => React.ReactNode;
  hideOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // For responsive column hiding
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, string>) => void;
  onRowClick?: (item: T, index: number) => void;
  onRowSelect?: (selectedItems: T[]) => void;
  selectable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  pageSize?: number;
  virtualScrolling?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onSort,
  onFilter,
  onRowClick,
  onRowSelect,
  selectable = false,
  searchable = false,
  filterable = false,
  loading = false,
  emptyMessage = 'No data available',
  className,
  pageSize = 50,
  virtualScrolling = false,
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useResponsive();
  const { announceMessage } = useAccessibilityContext();
  
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.key))
  );

  // Filter columns based on screen size and visibility settings
  const visibleColumnsForScreen = useMemo(() => {
    return columns.filter(column => {
      if (!visibleColumns.has(column.key)) return false;
      
      if (isMobile) {
        return !column.hideOnMobile && column.priority === 'high';
      }
      
      if (isTablet) {
        return !column.hideOnMobile && (column.priority === 'high' || column.priority === 'medium');
      }
      
      return true;
    });
  }, [columns, isMobile, isTablet, visibleColumns]);

  // Handle sorting
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortColumn === columnKey) {
      newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
    }

    setSortColumn(newDirection ? columnKey : null);
    setSortDirection(newDirection);
    
    if (onSort && newDirection) {
      onSort(columnKey, newDirection);
    }

    announceMessage(
      newDirection 
        ? `Table sorted by ${column.title} ${newDirection === 'asc' ? 'ascending' : 'descending'}`
        : `Sorting cleared for ${column.title}`,
      'polite'
    );
  };

  // Handle row selection
  const handleRowSelect = (index: number, selected: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    if (selected) {
      newSelectedRows.add(index);
    } else {
      newSelectedRows.delete(index);
    }
    setSelectedRows(newSelectedRows);
    
    if (onRowSelect) {
      const selectedItems = Array.from(newSelectedRows).map(i => data[i]);
      onRowSelect(selectedItems);
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(data.map((_, index) => index)));
      onRowSelect?.(data);
    } else {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    }
  };

  // Get cell value
  const getCellValue = (item: T, column: TableColumn<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return item[column.accessor];
  };

  // Render desktop table
  const renderDesktopTable = () => (
    <div className="overflow-x-auto">
      <table 
        className="w-full border-collapse"
        {...getTableAria(data.length, visibleColumnsForScreen.length)}
      >
        <thead>
          <tr className="border-b bg-muted/50">
            {selectable && (
              <th className="w-12 p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.length && data.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-border"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {visibleColumnsForScreen.map((column, index) => (
              <th
                key={column.key}
                className={cn(
                  "p-3 text-left font-medium",
                  column.sortable && "cursor-pointer hover:bg-muted/70 select-none",
                  column.width && `w-[${column.width}]`,
                  column.minWidth && `min-w-[${column.minWidth}]`
                )}
                onClick={() => column.sortable && handleSort(column.key)}
                {...getTableHeaderAria(
                  column.sortable,
                  sortColumn === column.key ? sortDirection || 'none' : 'none',
                  index + 1
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    responsiveText({ sm: 'sm', lg: 'base' })
                  )}>
                    {column.title}
                  </span>
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ChevronUp 
                        className={cn(
                          "h-3 w-3 -mb-1",
                          sortColumn === column.key && sortDirection === 'asc' 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        )}
                      />
                      <ChevronDown 
                        className={cn(
                          "h-3 w-3",
                          sortColumn === column.key && sortDirection === 'desc' 
                            ? "text-primary" 
                            : "text-muted-foreground"
                        )}
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={index}
              className={cn(
                "border-b hover:bg-muted/30 transition-colors",
                selectedRows.has(index) && "bg-primary/5",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(item, index)}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(item, index);
                }
              }}
            >
              {selectable && (
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(index)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleRowSelect(index, e.target.checked);
                    }}
                    className="rounded border-border"
                    aria-label={`Select row ${index + 1}`}
                  />
                </td>
              )}
              {visibleColumnsForScreen.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "p-3",
                    responsiveText({ sm: 'sm', lg: 'base' })
                  )}
                >
                  {column.render 
                    ? column.render(getCellValue(item, column), item, index)
                    : getCellValue(item, column)
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render mobile cards
  const renderMobileCards = () => (
    <div 
      className="space-y-3"
      {...getListAria(data.length)}
    >
      {data.map((item, index) => (
        <Card
          key={index}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedRows.has(index) && "ring-2 ring-primary"
          )}
          onClick={() => onRowClick?.(item, index)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick?.(item, index);
            }
          }}
          {...getListItemAria(index + 1, data.length, selectedRows.has(index))}
        >
          <CardContent className="p-4">
            {selectable && (
              <div className="flex items-center justify-between mb-3">
                <input
                  type="checkbox"
                  checked={selectedRows.has(index)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleRowSelect(index, e.target.checked);
                  }}
                  className="rounded border-border"
                  aria-label={`Select item ${index + 1}`}
                />
              </div>
            )}
            
            {/* Use mobile-specific render if available */}
            {columns.some(col => col.mobileRender) ? (
              columns
                .filter(col => col.mobileRender)
                .map(column => (
                  <div key={column.key}>
                    {column.mobileRender!(item, index)}
                  </div>
                ))
            ) : (
              <div className="space-y-2">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .slice(0, 4) // Show max 4 fields on mobile
                  .map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">
                        {column.title}:
                      </span>
                      <span className="text-sm ml-2 text-right min-w-0 flex-1">
                        {column.render 
                          ? column.render(getCellValue(item, column), item, index)
                          : getCellValue(item, column)
                        }
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading data...</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Table Header with Search and Filters */}
      {(searchable || filterable) && (
        <CardHeader className={cn(
          responsiveSpacing({ xs: '4', sm: '6' }, 'p')
        )}>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            {searchable && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search table data"
                />
              </div>
            )}
            
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* Toggle column visibility */}}
                  {...getButtonAria('Toggle column visibility')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Columns
                </Button>
                
                {filterable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {/* Open filter panel */}}
                    {...getButtonAria('Open filters')}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className={cn(
        responsiveSpacing({ xs: '0', sm: '6' }, 'p'),
        "pt-0"
      )}>
        {/* Selection Summary */}
        {selectable && selectedRows.size > 0 && (
          <div className="mb-4 p-3 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-between">
              <span className={cn(
                "font-medium",
                responsiveText({ xs: 'sm', sm: 'base' })
              )}>
                {selectedRows.size} item{selectedRows.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelectAll(false)}
                {...getButtonAria('Clear selection')}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Render appropriate view */}
        {isMobile ? renderMobileCards() : renderDesktopTable()}
      </CardContent>
    </Card>
  );
}