/**
 * Example usage of the reviewer recommendation system
 * Demonstrates filtering, sorting, pagination, and real-time backend integration
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerResults } from '../components/results/ReviewerResults';
import { usePaginatedRecommendations, useRecommendationFilters } from '../hooks/useRecommendations';
import { recommendationService } from '../services/recommendationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import type { Reviewer, RecommendationFilters, RecommendationSort } from '../types/api';

// Create a query client for the example
const queryClient = new QueryClient();

/**
 * Example component showing basic recommendation usage
 */
const BasicRecommendationExample: React.FC = () => {
  const processId = 'example-process-id';
  
  const { data, isLoading, error } = usePaginatedRecommendations(
    processId,
    1, // page
    20, // limit
    {}, // filters
    { field: 'matchScore', direction: 'desc' } // sort
  );

  if (isLoading) return <div>Loading recommendations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Basic Recommendations</h2>
      <div className="grid gap-4">
        {data?.data.map((reviewer) => (
          <Card key={reviewer.id}>
            <CardHeader>
              <CardTitle>{reviewer.name}</CardTitle>
              <CardDescription>{reviewer.affiliation}, {reviewer.country}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{reviewer.matchScore}% match</Badge>
                <Badge variant="outline">{reviewer.database}</Badge>
                <span className="text-sm text-muted-foreground">
                  {reviewer.publicationCount} publications
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * Example component showing advanced filtering and sorting
 */
const AdvancedRecommendationExample: React.FC = () => {
  const processId = 'example-process-id';
  const [filters, setFilters] = useState<RecommendationFilters>({
    minPublications: 10,
    countries: ['United States', 'Canada'],
    expertise: ['Machine Learning'],
  });
  const [sort, setSort] = useState<RecommendationSort>({
    field: 'matchScore',
    direction: 'desc',
  });

  const { data: filterOptions } = useRecommendationFilters(processId);
  const { data, isLoading, refetch } = usePaginatedRecommendations(
    processId,
    1,
    10,
    filters,
    sort
  );

  const handleFilterChange = (newFilters: Partial<RecommendationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSortChange = (field: RecommendationSort['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Advanced Recommendations with Filtering</h2>
      
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Minimum Publications:</label>
            <input
              type="number"
              value={filters.minPublications || 0}
              onChange={(e) => handleFilterChange({ minPublications: parseInt(e.target.value) })}
              className="ml-2 px-2 py-1 border rounded"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Countries:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {filterOptions?.countries.map(country => (
                <Badge
                  key={country}
                  variant={filters.countries?.includes(country) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const currentCountries = filters.countries || [];
                    const newCountries = currentCountries.includes(country)
                      ? currentCountries.filter(c => c !== country)
                      : [...currentCountries, country];
                    handleFilterChange({ countries: newCountries });
                  }}
                >
                  {country}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Expertise:</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {filterOptions?.expertise.slice(0, 10).map(exp => (
                <Badge
                  key={exp}
                  variant={filters.expertise?.includes(exp) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const currentExpertise = filters.expertise || [];
                    const newExpertise = currentExpertise.includes(exp)
                      ? currentExpertise.filter(e => e !== exp)
                      : [...currentExpertise, exp];
                    handleFilterChange({ expertise: newExpertise });
                  }}
                >
                  {exp}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => setFilters({})}>Clear Filters</Button>
            <Button onClick={() => refetch()}>Refresh</Button>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sorting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant={sort.field === 'matchScore' ? 'default' : 'outline'}
              onClick={() => handleSortChange('matchScore')}
            >
              Match Score {sort.field === 'matchScore' && (sort.direction === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={sort.field === 'publicationCount' ? 'default' : 'outline'}
              onClick={() => handleSortChange('publicationCount')}
            >
              Publications {sort.field === 'publicationCount' && (sort.direction === 'desc' ? '↓' : '↑')}
            </Button>
            <Button
              variant={sort.field === 'name' ? 'default' : 'outline'}
              onClick={() => handleSortChange('name')}
            >
              Name {sort.field === 'name' && (sort.direction === 'desc' ? '↓' : '↑')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {data ? `Found ${data.pagination.total} reviewers` : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              {data?.data.map((reviewer) => (
                <Card key={reviewer.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{reviewer.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {reviewer.affiliation}, {reviewer.country}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge>{reviewer.matchScore}% match</Badge>
                          <Badge variant="outline">{reviewer.database}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {reviewer.publicationCount} publications
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium">Expertise:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reviewer.expertise.map((exp, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Example showing direct service usage
 */
const ServiceUsageExample: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testServiceCall = async () => {
    setLoading(true);
    try {
      // Example: Get recommendations with filters
      const recommendations = await recommendationService.getRecommendations('test-process-id', {
        page: 1,
        limit: 10,
        filters: {
          minPublications: 5,
          countries: ['United States'],
          expertise: ['Machine Learning'],
          search: 'healthcare',
        },
        sort: {
          field: 'matchScore',
          direction: 'desc',
        },
      });

      // Example: Get filter options
      const filterOptions = await recommendationService.getFilterOptions('test-process-id');

      // Example: Get stats
      const stats = await recommendationService.getRecommendationStats('test-process-id');

      setResults({
        recommendations,
        filterOptions,
        stats,
      });
    } catch (error) {
      console.error('Service call failed:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Direct Service Usage</h2>
      
      <Button onClick={testServiceCall} disabled={loading}>
        {loading ? 'Testing...' : 'Test Service Calls'}
      </Button>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Service Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Complete example with full ReviewerResults component
 */
const CompleteRecommendationExample: React.FC = () => {
  const [selectedReviewers, setSelectedReviewers] = useState<Reviewer[]>([]);

  const handleExport = (reviewers: Reviewer[]) => {
    setSelectedReviewers(reviewers);
    console.log('Exporting reviewers:', reviewers);
    // Here you would typically call an export service
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Complete Recommendation System</h2>
      
      <ReviewerResults
        processId="example-process-id"
        onExport={handleExport}
      />

      {selectedReviewers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected for Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedReviewers.map(reviewer => (
                <div key={reviewer.id} className="flex items-center space-x-2">
                  <Badge>{reviewer.matchScore}%</Badge>
                  <span>{reviewer.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({reviewer.affiliation})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/**
 * Main example component that demonstrates all features
 */
export const RecommendationUsageExample: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('complete');

  const examples = {
    basic: BasicRecommendationExample,
    advanced: AdvancedRecommendationExample,
    service: ServiceUsageExample,
    complete: CompleteRecommendationExample,
  };

  const ExampleComponent = examples[activeExample as keyof typeof examples];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reviewer Recommendation System</h1>
          <p className="text-muted-foreground">
            Examples of filtering, sorting, pagination, and real-time backend integration
          </p>
        </div>

        {/* Example Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeExample === 'complete' ? 'default' : 'outline'}
                onClick={() => setActiveExample('complete')}
              >
                Complete System
              </Button>
              <Button
                variant={activeExample === 'basic' ? 'default' : 'outline'}
                onClick={() => setActiveExample('basic')}
              >
                Basic Usage
              </Button>
              <Button
                variant={activeExample === 'advanced' ? 'default' : 'outline'}
                onClick={() => setActiveExample('advanced')}
              >
                Advanced Filtering
              </Button>
              <Button
                variant={activeExample === 'service' ? 'default' : 'outline'}
                onClick={() => setActiveExample('service')}
              >
                Service Usage
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Example */}
        <ExampleComponent />

        {/* Implementation Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Implementation Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">Backend Integration</h4>
              <p className="text-sm text-muted-foreground">
                The recommendation system connects to the backend API endpoints:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                <li><code>GET /api/processes/:id/recommendations</code> - Get paginated recommendations</li>
                <li><code>GET /api/processes/:id/recommendations/filters</code> - Get available filter options</li>
                <li><code>GET /api/processes/:id/recommendations/stats</code> - Get recommendation statistics</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">Real-time Features</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Debounced search input for better performance</li>
                <li>Real-time filtering and sorting with backend API calls</li>
                <li>Pagination with prefetching for smooth navigation</li>
                <li>Optimistic updates and cache invalidation</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">Performance Optimizations</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Virtual scrolling for large result sets</li>
                <li>React Query caching with appropriate stale times</li>
                <li>Skeleton loading components</li>
                <li>Error boundaries for graceful error handling</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </QueryClientProvider>
  );
};

export default RecommendationUsageExample;