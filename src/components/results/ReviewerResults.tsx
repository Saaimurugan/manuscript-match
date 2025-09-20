import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ReviewerResultsSkeleton, ReviewerCardSkeleton } from "@/components/ui/skeleton-components";
import { VirtualReviewerList } from "@/components/ui/virtual-scroll";
import { 
  Users, 
  Download, 
  Filter, 
  Mail, 
  Building, 
  BookOpen, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { usePaginatedRecommendations, useFilteredRecommendations, useRecommendationFilters } from "@/hooks/useRecommendations";
import { useDebounce, useRenderPerformance } from "@/hooks/usePerformance";
import { ActivityLogger } from "@/services/activityLogger";
import { toast } from "sonner";
import type { Reviewer, RecommendationFilters, RecommendationSort } from "@/types/api";

interface ReviewerResultsProps {
  processId: string;
  onExport?: (selectedReviewers: Reviewer[]) => void;
}

export const ReviewerResults = ({ processId, onExport }: ReviewerResultsProps) => {
  // Performance monitoring
  useRenderPerformance('ReviewerResults');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State for filtering
  const [filters, setFilters] = useState<RecommendationFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  
  // State for sorting
  const [sort, setSort] = useState<RecommendationSort>({
    field: 'matchScore',
    direction: 'desc'
  });
  
  // State for selection
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set());

  // Debounced search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Get filter options from backend
  const { data: filterOptions } = useRecommendationFilters(processId);

  // Fetch recommendations with current filters, sort, and pagination
  const { 
    data: currentData, 
    isLoading: currentLoading, 
    error: currentError,
    refetch
  } = usePaginatedRecommendations(
    processId,
    currentPage,
    pageSize,
    filters,
    sort
  );

  const reviewers = currentData?.data || [];
  const pagination = currentData?.pagination;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // Refetch when search term changes (debounced)
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      // Add search term to filters if it exists
      const searchFilters = debouncedSearchTerm 
        ? { ...filters, search: debouncedSearchTerm }
        : filters;
      
      // Update filters to trigger refetch
      setFilters(searchFilters);
    }
  }, [debouncedSearchTerm]);

  // Use backend filter options or fallback to client-side calculation
  const clientFilterOptions = useMemo(() => {
    if (filterOptions) return filterOptions;
    
    // Fallback: calculate from current reviewers
    const countries = [...new Set(reviewers.map(r => r.country))].sort();
    const databases = [...new Set(reviewers.map(r => r.database))].sort();
    const expertise = [...new Set(reviewers.flatMap(r => r.expertise))].sort();
    
    return { 
      countries, 
      databases, 
      expertise, 
      affiliationTypes: [],
      publicationRange: { min: 0, max: 100 }
    };
  }, [reviewers, filterOptions]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return "bg-accent text-accent-foreground";
    if (score >= 70) return "bg-primary text-primary-foreground";
    if (score >= 50) return "bg-secondary text-secondary-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleSelectReviewer = (reviewerId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedReviewerIds);
    if (checked) {
      newSelectedIds.add(reviewerId);
    } else {
      newSelectedIds.delete(reviewerId);
    }
    setSelectedReviewerIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviewerIds(new Set(reviewers.map(r => r.id)));
    } else {
      setSelectedReviewerIds(new Set());
    }
  };

  const handleSort = (field: RecommendationSort['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleFilterChange = (key: keyof RecommendationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    if (!onExport) {
      toast.error("Export functionality not available");
      return;
    }

    const selectedReviewers = reviewers.filter(r => selectedReviewerIds.has(r.id));
    
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer to export");
      return;
    }

    try {
      // Log the export activity
      const logger = ActivityLogger.getInstance();
      await logger.logActivity(
        'EXPORT',
        `Exported ${selectedReviewers.length} reviewers`,
        JSON.stringify({
          processId,
          reviewerCount: selectedReviewers.length,
          reviewerNames: selectedReviewers.map(r => r.name),
          databases: [...new Set(selectedReviewers.map(r => r.database))]
        })
      );

      onExport(selectedReviewers);
      toast.success(`Exported ${selectedReviewers.length} reviewers successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export reviewers. Please try again.");
    }
  };

  const getSortIcon = (field: RecommendationSort['field']) => {
    if (sort.field !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sort.direction === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />;
  };

  // Handle loading state
  if (currentLoading && !reviewers.length) {
    return <ReviewerResultsSkeleton />;
  }

  // Handle error state
  if (currentError) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-destructive mb-4">Failed to load recommendations</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Reviewer Recommendations</span>
              </CardTitle>
              <CardDescription>
                {pagination ? (
                  `Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, pagination.total)} of ${pagination.total} reviewers`
                ) : (
                  `Found ${reviewers.length} potential reviewers`
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button 
                onClick={handleExport} 
                variant="outline"
                disabled={selectedReviewerIds.size === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedReviewerIds.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search reviewers by name, affiliation, or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="virtual-scroll"
                checked={useVirtualScrolling}
                onCheckedChange={(checked) => setUseVirtualScrolling(checked === true)}
              />
              <label htmlFor="virtual-scroll" className="text-sm">
                Virtual Scrolling
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Select
                value={filters.databases?.[0] || "all"}
                onValueChange={(value) => 
                  handleFilterChange('databases', value === 'all' ? undefined : [value])
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Database" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Databases</SelectItem>
                  {clientFilterOptions.databases.map(db => (
                    <SelectItem key={db} value={db}>{db}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Publication Count Range */}
                  <div className="space-y-2">
                    <Label>Publication Count</Label>
                    <div className="px-3">
                      <Slider
                        value={[filters.minPublications || 0, filters.maxPublications || 100]}
                        onValueChange={([min, max]) => {
                          handleFilterChange('minPublications', min);
                          handleFilterChange('maxPublications', max);
                        }}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.minPublications || 0}</span>
                        <span>{filters.maxPublications || 100}+</span>
                      </div>
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={filters.countries?.[0] || "all"}
                      onValueChange={(value) => 
                        handleFilterChange('countries', value === 'all' ? undefined : [value])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        {clientFilterOptions.countries.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expertise Filter */}
                  <div className="space-y-2">
                    <Label>Expertise Area</Label>
                    <Select
                      value={filters.expertise?.[0] || "all"}
                      onValueChange={(value) => 
                        handleFilterChange('expertise', value === 'all' ? undefined : [value])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expertise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Expertise</SelectItem>
                        {clientFilterOptions.expertise.slice(0, 20).map(exp => (
                          <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFilters({})}
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <div className="flex items-center space-x-2">
                <Button
                  variant={sort.field === 'matchScore' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('matchScore')}
                >
                  Match Score {sort.field === 'matchScore' && getSortIcon('matchScore')}
                </Button>
                <Button
                  variant={sort.field === 'publicationCount' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('publicationCount')}
                >
                  Publications {sort.field === 'publicationCount' && getSortIcon('publicationCount')}
                </Button>
                <Button
                  variant={sort.field === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSort('name')}
                >
                  Name {sort.field === 'name' && getSortIcon('name')}
                </Button>
              </div>
            </div>
            
            {reviewers.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={reviewers.every(r => selectedReviewerIds.has(r.id))}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All
                </label>
              </div>
            )}
          </div>

          {/* Reviewers List */}
          <div className="space-y-4">
            {currentLoading && reviewers.length === 0 ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ReviewerCardSkeleton key={i} />
                ))}
              </div>
            ) : useVirtualScrolling && reviewers.length > 20 ? (
              <VirtualReviewerList
                reviewers={reviewers}
                onSelectReviewer={handleSelectReviewer}
                selectedReviewerIds={selectedReviewerIds}
                containerHeight={600}
                loading={currentLoading}
              />
            ) : (
              reviewers.map((reviewer) => (
                <Card key={reviewer.id} className="border-l-4 border-l-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          id={`reviewer-${reviewer.id}`}
                          checked={selectedReviewerIds.has(reviewer.id)}
                          onCheckedChange={(checked) => handleSelectReviewer(reviewer.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">{reviewer.name}</h3>
                            <Badge className={getMatchScoreColor(reviewer.matchScore)}>
                              {reviewer.matchScore}% match
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {reviewer.database}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Building className="w-4 h-4 mr-2" />
                              {reviewer.affiliation}, {reviewer.country}
                            </div>
                            {reviewer.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-2" />
                                {reviewer.email}
                              </div>
                            )}
                            <div className="flex items-center">
                              <BookOpen className="w-4 h-4 mr-2" />
                              {reviewer.publicationCount} publications (last 10 years)
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Profile
                      </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Expertise Areas</h4>
                        <div className="flex flex-wrap gap-2">
                          {reviewer.expertise.map((area, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {reviewer.recentPublications.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Recent Publications</h4>
                          <div className="space-y-1">
                            {reviewer.recentPublications.slice(0, 3).map((pub, index) => (
                              <p key={index} className="text-xs text-muted-foreground leading-relaxed">
                                • {pub}
                              </p>
                            ))}
                            {reviewer.recentPublications.length > 3 && (
                              <p className="text-xs text-primary">
                                +{reviewer.recentPublications.length - 3} more publications
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Empty State */}
          {!currentLoading && reviewers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No reviewers found matching your criteria.</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({})}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => setPageSize(parseInt(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">per page</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPreviousPage || currentLoading}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!pagination.hasNextPage || currentLoading}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};