/**
 * AuthorSearch Component
 * Provides search interface for finding authors by name
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Clock, X } from 'lucide-react';
import { ManualAuthor } from '../../../types/api';

interface AuthorSearchProps {
  onSearch: (authorName: string) => Promise<void>;
  isLoading?: boolean;
  searchHistory?: Array<{
    searchTerm: string;
    results: ManualAuthor[];
    timestamp: Date;
  }>;
}

export const AuthorSearch: React.FC<AuthorSearchProps> = ({
  onSearch,
  isLoading = false,
  searchHistory = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim().length >= 2) {
      await onSearch(searchTerm.trim());
    }
  };

  const handleHistorySearch = (term: string) => {
    setSearchTerm(term);
    setShowHistory(false);
    onSearch(term);
  };

  const clearSearchTerm = () => {
    setSearchTerm('');
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  // Get recent unique search terms
  const recentSearches = searchHistory
    .slice(0, 5)
    .map(item => item.searchTerm)
    .filter((term, index, arr) => arr.indexOf(term) === index);

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="author-search">Author Name</Label>
          <div className="relative">
            <Input
              id="author-search"
              type="text"
              placeholder="Enter author's name (e.g., John Smith, J. Smith)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
              className="pr-20"
              autoComplete="off"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearchTerm}
                className="absolute right-12 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                disabled={isLoading}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || searchTerm.trim().length < 2}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter at least 2 characters. Try different name formats if no results are found.
          </p>
        </div>
      </form>

      {/* Search Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="text-sm space-y-2">
            <p className="font-medium text-blue-900">Search Tips:</p>
            <ul className="text-blue-800 space-y-1 ml-4">
              <li>• Try different name formats: "John Smith", "J. Smith", "Smith J"</li>
              <li>• Use partial names if full name doesn't work</li>
              <li>• Check spelling and try alternative spellings</li>
              <li>• Search by last name only for broader results</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Search History */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Recent Searches</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHistory}
              className="text-xs"
            >
              <Clock className="h-3 w-3 mr-1" />
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </div>
          
          {showHistory && (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((term, index) => {
                const historyItem = searchHistory.find(item => item.searchTerm === term);
                return (
                  <Badge
                    key={`${term}-${index}`}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleHistorySearch(term)}
                  >
                    <span className="mr-1">{term}</span>
                    <span className="text-xs text-muted-foreground">
                      ({historyItem?.results.length || 0})
                    </span>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthorSearch;