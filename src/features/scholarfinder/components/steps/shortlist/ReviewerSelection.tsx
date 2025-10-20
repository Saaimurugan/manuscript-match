/**
 * ReviewerSelection Component
 * Component for selecting reviewers from available recommendations
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  SortAsc, 
  SortDesc,
  CheckSquare,
  Square
} from 'lucide-react';
import { Reviewer } from '../../../types/api';
import { MemoizedVirtualizedTable } from '../../common/VirtualizedTable';
import { cn } from '@/lib/utils';

interface ReviewerSelectionProps {
  availableReviewers: Reviewer[];
  selectedReviewers: Reviewer[];
  onAddToShortlist: (reviewer: Reviewer) => void;
  onBulkAdd: (reviewers: Reviewer[]) => void;
  maxReviewers: number;
  isLoading?: boolean;
}

interface FilterState {
  searchTerm: string;
  minPublications: string;
  maxRetractions: string;
  countries: string[];
  minConditionsMet: string;
  excludeCoauthors: boolean;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export const ReviewerSelection: React.FC<ReviewerSelectionProps> = ({
  availableReviewers,
  selectedReviewers,
  onAddToShortlist,
  onBulkAdd,
  maxReviewers,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    minPublications: '',
    maxRetractions: '',
    countries: [],
    minConditionsMet: '',
    excludeCoauthors: false
  });
  
  const [sortState, setSortState] = useState<SortState>({
    column: 'conditions_met',
    direction: 'desc'
  });

  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Get unique countries for filter dropdown
  const uniqueCountries = useMemo(() => {
    const countries = availableReviewers.map(r => r.country).filter(Boolean);
    return Array.from(new Set(countries)).sort();
  }, [availableReviewers]);

  // Filter and sort reviewers
  const filteredAndSortedReviewers = useMemo(() => {
    let filtered = availableReviewers.filter(reviewer => {
      // Exclude already selected reviewers
      if (selectedReviewers.some(selected => selected.email === reviewer.email)) {
        return false;
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          reviewer.reviewer.toLowerCase().includes(searchLower) ||
          reviewer.aff.toLowerCase().includes(searchLower) ||
          reviewer.email.toLowerCase().includes(searchLower) ||
          reviewer.country.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Publications filter
      if (filters.minPublications) {
        const minPubs = parseInt(filters.minPublications);
        if (reviewer.Total_Publications < minPubs) return false;
      }

      // Retractions filter
      if (filters.maxRetractions) {
        const maxRetractions = parseInt(filters.maxRetractions);
        if (reviewer.Retracted_Pubs_no > maxRetractions) return false;
      }

      // Countries filter
      if (filters.countries.length > 0) {
        if (!filters.countries.includes(reviewer.country)) return false;
      }

      // Conditions met filter
      if (filters.minConditionsMet) {
        const minConditions = parseInt(filters.minConditionsMet);
        if (reviewer.conditions_met < minConditions) return false;
      }

      // Exclude coauthors filter
      if (filters.excludeCoauthors && reviewer.coauthor) {
        return false;
      }

      return true;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortState.column) {
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
          aValue = 0;
          bValue = 0;
      }

      if (sortState.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [availableReviewers, selectedReviewers, filters, sortState]);

  const handleSort = useCallback((column: string) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleBulkSelectionToggle = useCallback((reviewerId: string) => {
    setBulkSelection(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(reviewerId)) {
        newSelection.delete(reviewerId);
      } else {
        newSelection.add(reviewerId);
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
      minPublications: '',
      maxRetractions: '',
      countries: [],
      minConditionsMet: '',
      excludeCoauthors: false
    });
  }, []);

  const getSortIcon = (column: string) => {
    if (sortState.column !== column) return null;
    return sortState.direction === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  const getConditionsMetBadge = (conditionsMet: number, conditionsSatisfied: string) => {
    const totalConditions = conditionsSatisfied.split(',').length;
    const percentage = totalConditions > 0 ? (conditionsMet / totalConditions) * 100 : 0;
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    if (percentage >= 80) variant = "default";
    else if (percentage >= 60) variant = "secondary";
    else variant = "outline";

    return (
      <Badge variant={variant} className="text-xs">
        {conditionsMet}/{totalConditions}
      </Badge>
    );
  };

  const availableSlots = maxReviewers - selectedReviewers.length;
  const canAddMore = availableSlots > 0;

  return (
    <Card>
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviewers by name, affiliation, email, or country..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Min Publications</label>
                <Input
                  type="number"
                  placeholder="e.g., 10"
                  value={filters.minPublications}
                  onChange={(e) => handleFilterChange('minPublications', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Max Retractions</label>
                <Input
                  type="number"
                  placeholder="e.g., 0"
                  value={filters.maxRetractions}
                  onChange={(e) => handleFilterChange('maxRetractions', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Min Conditions Met</label>
                <Input
                  type="number"
                  placeholder="e.g., 5"
                  value={filters.minConditionsMet}
                  onChange={(e) => handleFilterChange('minConditionsMet', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Countries</label>
                <Select
                  value={filters.countries.length > 0 ? filters.countries[0] : ''}
                  onValueChange={(value) => 
                    handleFilterChange('countries', value ? [value] : [])
                  }
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
                    handleFilterChange('excludeCoauthors', checked)
                  }
                />
                <label htmlFor="excludeCoauthors" className="text-sm font-medium">
                  Exclude co-authors
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Selection Controls */}
        {filteredAndSortedReviewers.length > 0 && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={bulkSelection.size === filteredAndSortedReviewers.length ? handleDeselectAll : handleSelectAll}
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

        {/* Optimized Virtualized Table */}
        <MemoizedVirtualizedTable
          data={filteredAndSortedReviewers}
          selectedIds={bulkSelection}
          onSelectionChange={handleBulkSelectionToggle}
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