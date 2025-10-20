/**
 * OptimizedReviewerTable Component
 * High-performance reviewer table with memoization and virtual scrolling
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Filter, 
  Plus, 
  Users, 
  CheckSquare,
  Square
} from 'lucide-react';
import { Reviewer } from '../../types/api';
import { MemoizedVirtualizedTable } from './VirtualizedTable';
import { DebouncedSearchInput, DebouncedFilterInput } from './DebouncedInput';
import { cn } from '@/lib/utils';

interface FilterState {
  searchTerm: string;
  minPublications: number | null;
  maxRetractions: number | null;
  countries: string[];
  minConditionsMet: number | null;
  excludeCoauthors: boolean;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface OptimizedReviewerTableProps {
  availableReviewers: Reviewer[];
  selectedReviewers: Reviewer[];
  onAddToShortlist: (reviewer: Reviewer) => void;
  onBulkAdd: (reviewers: Reviewer[]) => void;
  maxReviewers: number;
  isLoading?: boolean;
  className?: string;
}

// Memoized filter functions for better performance
const createFilterFunctions = () => {
  const searchFilter = (reviewer: Reviewer, searchTerm: string): boolean => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      reviewer.reviewer.toLowerCase().includes(searchLower) ||
      reviewer.aff.toLowerCase().includes(searchLower) ||
      reviewer.email.toLowerCase().includes(searchLower) ||
      reviewer.country.toLowerCase().includes(searchLower)
    );
  };

  const publicationsFilter = (reviewer: Reviewer, minPublications: number | null): boolean => {
    return minPublications === null || reviewer.Total_Publications >= minPublications;
  };

  const retractionsFilter = (reviewer: Reviewer, maxRetractions: number | null): boolean => {
    return maxRetractions === null || reviewer.Retracted_Pubs_no <= maxRetractions;
  };

  const countriesFilter = (reviewer: Reviewer, countries: string[]): boolean => {
    return countries.length === 0 || countries.includes(reviewer.country);
  };

  const conditionsFilter = (reviewer: Reviewer, minConditionsMet: number | null): boolean => {
    return minConditionsMet === null || reviewer.conditions_met >= minConditionsMet;
  };

  const coauthorFilter = (reviewer: Reviewer, excludeCoauthors: boolean): boolean => {
    return !excludeCoauthors || !reviewer.coauthor;
  };

  return {
    searchFilter,
    publicationsFilter,
    retractionsFilter,
    countriesFilter,
    conditionsFilter,
    coauthorFilter
  };
};

// Memoized sorting function
const createSortFunction = (column: string, direction: 'asc' | 'desc') => {
  return (a: Reviewer, b: Reviewer): number => {
    let aValue: any;
    let bValue: any;

    switch (column) {
      case 'reviewer':
        aValue = a.reviewer.toLowerCase();
        bValue = b.reviewer.toLowerCase();
        break;
      case 'aff':
        aValue = a.aff.toLowerCase();
        bValue = b.aff.toLowerCase();
        break;
      case 'country':
        aValue = a.country.toLowerCase();
        bValue = b.country.toLowerCase();
        break;
      case 'Total_Publications':
        aValue = a.Total_Publications;
        bValue = b.Total_Publications;
        break;
      case 'conditions_met':
        aValue = a.conditions_met;
        bValue = b.conditions_met;
        break;
      case 'Retracted_Pubs_no':
        aValue = a.Retracted_Pubs_no;
        bValue = b.Retracted_Pubs_no;
        break;
      default:
        return 0;
    }

    if (direction === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  };
};

// Memoized component for filter controls
const FilterControls = React.memo<{
  filters: FilterState;
  uniqueCountries: string[];
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  isLoading: boolean;
}>(({ filters, uniqueCountries, onFilterChange, onClearFilters, showFilters, isLoading }) => {
  if (!showFilters) return null;

  return (
    <Card className="p-4 bg-muted/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Min Publications</label>
          <DebouncedFilterInput
            placeholder="e.g., 10"
            value={filters.minPublications?.toString() || ''}
            onChange={(value) => onFilterChange('minPublications', value)}
            min={0}
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Max Retractions</label>
          <DebouncedFilterInput
            placeholder="e.g., 0"
            value={filters.maxRetractions?.toString() || ''}
            onChange={(value) => onFilterChange('maxRetractions', value)}
            min={0}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Min Conditions Met</label>
          <DebouncedFilterInput
            placeholder="e.g., 5"
            value={filters.minConditionsMet?.toString() || ''}
            onChange={(value) => onFilterChange('minConditionsMet', value)}
            min={0}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Countries</label>
          <Select
            value={filters.countries.length > 0 ? filters.countries[0] : ''}
            onValueChange={(value) => 
              onFilterChange('countries', value ? [value] : [])
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All countries</SelectItem>
              {uniqueCountries.map(country => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="excludeCoauthors"
            checked={filters.excludeCoauthors}
            onCheckedChange={(checked) => 
              onFilterChange('excludeCoauthors', checked)
            }
            disabled={isLoading}
          />
          <label htmlFor="excludeCoauthors" className="text-sm font-medium">
            Exclude co-authors
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={isLoading}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>
  );
});

FilterControls.displayName = 'FilterControls';

export const OptimizedReviewerTable: React.FC<OptimizedReviewerTableProps> = ({
  availableReviewers,
  selectedReviewers,
  onAddToShortlist,
  onBulkAdd,
  maxReviewers,
  isLoading = false,
  className
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    minPublications: null,
    maxRetractions: null,
    countries: [],
    minConditionsMet: null,
    excludeCoauthors: false
  });
  
  const [sortState, setSortState] = useState<SortState>({
    column: 'conditions_met',
    direction: 'desc'
  });

  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Memoized filter functions
  const filterFunctions = useMemo(() => createFilterFunctions(), []);

  // Memoized unique countries calculation
  const uniqueCountries = useMemo(() => {
    const countries = availableReviewers.map(r => r.country).filter(Boolean);
    return Array.from(new Set(countries)).sort();
  }, [availableReviewers]);

  // Memoized selected reviewer emails set for O(1) lookup
  const selectedReviewerEmails = useMemo(() => 
    new Set(selectedReviewers.map(r => r.email)),
    [selectedReviewers]
  );

  // Memoized filtered and sorted reviewers
  const filteredAndSortedReviewers = useMemo(() => {
    // Filter reviewers
    let filtered = availableReviewers.filter(reviewer => {
      // Exclude already selected reviewers
      if (selectedReviewerEmails.has(reviewer.email)) {
        return false;
      }

      // Apply all filters
      return (
        filterFunctions.searchFilter(reviewer, filters.searchTerm) &&
        filterFunctions.publicationsFilter(reviewer, filters.minPublications) &&
        filterFunctions.retractionsFilter(reviewer, filters.maxRetractions) &&
        filterFunctions.countriesFilter(reviewer, filters.countries) &&
        filterFunctions.conditionsFilter(reviewer, filters.minConditionsMet) &&
        filterFunctions.coauthorFilter(reviewer, filters.excludeCoauthors)
      );
    });

    // Sort the filtered results
    const sortFunction = createSortFunction(sortState.column, sortState.direction);
    filtered.sort(sortFunction);

    return filtered;
  }, [
    availableReviewers,
    selectedReviewerEmails,
    filters,
    sortState,
    filterFunctions
  ]);

  // Memoized callbacks
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setSortState({ column, direction });
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleBulkSelectionChange = useCallback((reviewerId: string, selected: boolean) => {
    setBulkSelection(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(reviewerId);
      } else {
        newSelection.delete(reviewerId);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filteredAndSortedReviewers.map(r => r.email);
    setBulkSelection(new Set(allIds));
  }, [filteredAndSortedReviewers]);

  const handleDeselectAll = useCallback(() => {
    setBulkSelection(new Set());
  }, []);

  const handleBulkAdd = useCallback(() => {
    const reviewersToAdd = filteredAndSortedReviewers.filter(r => 
      bulkSelection.has(r.email)
    );
    onBulkAdd(reviewersToAdd);
    setBulkSelection(new Set());
  }, [filteredAndSortedReviewers, bulkSelection, onBulkAdd]);

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      minPublications: null,
      maxRetractions: null,
      countries: [],
      minConditionsMet: null,
      excludeCoauthors: false
    });
  }, []);

  // Memoized computed values
  const availableSlots = useMemo(() => maxReviewers - selectedReviewers.length, [maxReviewers, selectedReviewers.length]);
  const canAddMore = availableSlots > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Available Reviewers</span>
            </CardTitle>
            <CardDescription>
              Select reviewers from your recommendations to add to your shortlist
              ({filteredAndSortedReviewers.length} available, {availableSlots} slots remaining)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              disabled={isLoading}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            {bulkSelection.size > 0 && (
              <Button
                onClick={handleBulkAdd}
                disabled={!canAddMore || isLoading}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Selected ({bulkSelection.size})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <DebouncedSearchInput
          value={filters.searchTerm}
          onChange={(value) => handleFilterChange('searchTerm', value)}
          isLoading={isLoading}
          disabled={isLoading}
        />

        {/* Advanced Filters */}
        <FilterControls
          filters={filters}
          uniqueCountries={uniqueCountries}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showFilters={showFilters}
          isLoading={isLoading}
        />

        {/* Bulk Selection Controls */}
        {filteredAndSortedReviewers.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={bulkSelection.size === filteredAndSortedReviewers.length ? handleDeselectAll : handleSelectAll}
                disabled={isLoading}
              >
                {bulkSelection.size === filteredAndSortedReviewers.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span className="ml-2">
                  {bulkSelection.size === filteredAndSortedReviewers.length ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
              {bulkSelection.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  {bulkSelection.size} selected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Virtualized Table */}
        <MemoizedVirtualizedTable
          data={filteredAndSortedReviewers}
          selectedIds={bulkSelection}
          onSelectionChange={handleBulkSelectionChange}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onAddToShortlist={onAddToShortlist}
          onSort={handleSort}
          sortColumn={sortState.column}
          sortDirection={sortState.direction}
          height={400}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

// Export memoized version
export const MemoizedOptimizedReviewerTable = React.memo(OptimizedReviewerTable);