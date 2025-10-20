/**
 * SearchResults Component
 * Displays search results for manual author addition with selection functionality
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  UserPlus, 
  Users, 
  Mail, 
  MapPin, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  X
} from 'lucide-react';
import { ManualAuthor } from '../../../types/api';

interface SearchResultsProps {
  results: ManualAuthor[];
  searchTerm: string;
  onAddAuthor: (author: ManualAuthor) => void;
  onClearResults: () => void;
  addedAuthors: ManualAuthor[];
  suggestions?: string[];
  isLoading?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  searchTerm,
  onAddAuthor,
  onClearResults,
  addedAuthors,
  suggestions = [],
  isLoading = false
}) => {
  const isAuthorAdded = (author: ManualAuthor): boolean => {
    return addedAuthors.some(
      existing => existing.name.toLowerCase() === author.name.toLowerCase() && 
                 existing.affiliation.toLowerCase() === author.affiliation.toLowerCase()
    );
  };

  const handleAddAuthor = (author: ManualAuthor) => {
    if (!isAuthorAdded(author)) {
      onAddAuthor(author);
    }
  };

  // No results case
  if (results.length === 0 && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <CardTitle>No Results Found</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearResults}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            No authors found for "{searchTerm}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* No Results Message */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              We couldn't find any authors matching "{searchTerm}". This could be due to:
              <ul className="mt-2 ml-4 space-y-1">
                <li>• The author may not be in the database</li>
                <li>• Different name spelling or format</li>
                <li>• The author may be listed under a different affiliation</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-medium mb-2">Try these suggestions:</div>
                <ul className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm">• {suggestion}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Alternative Actions */}
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-3">
              You can still continue without adding this author, or try a different search term.
            </p>
            <Button
              variant="outline"
              onClick={onClearResults}
              className="w-full"
            >
              Try Different Search
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Results found
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <CardTitle>Search Results</CardTitle>
            <Badge variant="secondary">
              {results.length} author{results.length !== 1 ? 's' : ''} found
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearResults}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Found {results.length} author{results.length !== 1 ? 's' : ''} matching "{searchTerm}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((author, index) => {
            const isAdded = isAuthorAdded(author);
            
            return (
              <div
                key={`${author.name}-${author.affiliation}-${index}`}
                className={`p-4 border rounded-lg transition-colors ${
                  isAdded 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Author Name */}
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-medium ${isAdded ? 'text-green-900' : 'text-gray-900'}`}>
                        {author.name}
                      </h4>
                      {isAdded && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      )}
                    </div>

                    {/* Affiliation */}
                    <div className={`text-sm ${isAdded ? 'text-green-700' : 'text-gray-600'}`}>
                      {author.affiliation}
                    </div>

                    {/* Additional Information */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      {author.email && (
                        <div className={`flex items-center space-x-1 ${isAdded ? 'text-green-600' : 'text-gray-500'}`}>
                          <Mail className="h-3 w-3" />
                          <span>{author.email}</span>
                        </div>
                      )}
                      
                      {author.country && (
                        <div className={`flex items-center space-x-1 ${isAdded ? 'text-green-600' : 'text-gray-500'}`}>
                          <MapPin className="h-3 w-3" />
                          <span>{author.country}</span>
                        </div>
                      )}
                      
                      {author.publications !== undefined && (
                        <div className={`flex items-center space-x-1 ${isAdded ? 'text-green-600' : 'text-gray-500'}`}>
                          <BookOpen className="h-3 w-3" />
                          <span>{author.publications} publications</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="ml-4">
                    <Button
                      onClick={() => handleAddAuthor(author)}
                      disabled={isAdded || isLoading}
                      size="sm"
                      variant={isAdded ? "secondary" : "default"}
                      className={isAdded ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Added
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Author
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary */}
          {results.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {results.filter(author => isAuthorAdded(author)).length} of {results.length} authors added
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearResults}
                >
                  New Search
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchResults;