import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Search, Plus, X, Database, AlertCircle, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useKeywords } from "@/hooks/useKeywords";
import { useInitiateSearch, useSearchProgress, useSearchByName, useSearchByEmail } from "@/hooks/useSearch";

interface SearchDatabase {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ReviewerSearchProps {
  processId: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  onKeywordsChange: (primary: string[], secondary: string[]) => void;
  onSearchComplete?: () => void;
}

export const ReviewerSearch = ({ 
  processId,
  primaryKeywords, 
  secondaryKeywords, 
  onKeywordsChange, 
  onSearchComplete 
}: ReviewerSearchProps) => {
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordType, setKeywordType] = useState<"primary" | "secondary">("primary");
  const [manualSearchName, setManualSearchName] = useState("");
  const [manualSearchEmail, setManualSearchEmail] = useState("");
  const { toast } = useToast();
  
  // Fetch enhanced keywords from backend
  const { data: enhancedKeywords, isLoading: isLoadingKeywords, error: keywordsError } = useKeywords(processId);
  
  // Search mutations and status
  const initiateSearchMutation = useInitiateSearch();
  const searchByNameMutation = useSearchByName();
  const searchByEmailMutation = useSearchByEmail();
  const { 
    status: searchStatus, 
    progress, 
    totalFound, 
    progressPercentage, 
    isSearching, 
    isCompleted, 
    isFailed,
    isLoading: isLoadingStatus,
    error: searchError 
  } = useSearchProgress(processId);

  const [databases, setDatabases] = useState<SearchDatabase[]>([
    {
      id: "pubmed",
      name: "PubMed",
      description: "Medical and biomedical literature",
      enabled: true,
    },
    {
      id: "elsevier",
      name: "Elsevier/ScienceDirect",
      description: "Scientific and academic research",
      enabled: true,
    },
    {
      id: "taylorFrancis",
      name: "Taylor & Francis",
      description: "Academic journals and books",
      enabled: false,
    },
    {
      id: "wiley",
      name: "Wiley Online Library",
      description: "Scientific research and journals",
      enabled: false,
    },
  ]);

  // Update keywords when enhanced keywords are loaded
  useEffect(() => {
    if (enhancedKeywords && primaryKeywords.length === 0 && secondaryKeywords.length === 0) {
      // Set primary keywords to original + enhanced, secondary to MeSH terms
      const newPrimary = [...enhancedKeywords.original, ...enhancedKeywords.enhanced];
      const newSecondary = enhancedKeywords.meshTerms;
      onKeywordsChange(newPrimary, newSecondary);
    }
  }, [enhancedKeywords, primaryKeywords.length, secondaryKeywords.length, onKeywordsChange]);

  const addKeyword = () => {
    if (!newKeyword.trim()) return;

    const keyword = newKeyword.trim();
    if (keywordType === "primary") {
      if (!primaryKeywords.includes(keyword)) {
        onKeywordsChange([...primaryKeywords, keyword], secondaryKeywords);
      }
    } else {
      if (!secondaryKeywords.includes(keyword)) {
        onKeywordsChange(primaryKeywords, [...secondaryKeywords, keyword]);
      }
    }
    setNewKeyword("");
  };

  const removeKeyword = (keyword: string, type: "primary" | "secondary") => {
    if (type === "primary") {
      onKeywordsChange(
        primaryKeywords.filter(k => k !== keyword), 
        secondaryKeywords
      );
    } else {
      onKeywordsChange(
        primaryKeywords, 
        secondaryKeywords.filter(k => k !== keyword)
      );
    }
  };

  const toggleDatabase = (databaseId: string) => {
    setDatabases(prev => 
      prev.map(db => 
        db.id === databaseId 
          ? { ...db, enabled: !db.enabled }
          : db
      )
    );
  };

  const handleSearch = async () => {
    const enabledDatabases = databases.filter(db => db.enabled).map(db => db.id);
    const allKeywords = [...primaryKeywords, ...secondaryKeywords];

    if (allKeywords.length === 0) {
      toast({
        title: "No keywords selected",
        description: "Please add at least one keyword to search for reviewers.",
        variant: "destructive",
      });
      return;
    }

    if (enabledDatabases.length === 0) {
      toast({
        title: "No databases selected",
        description: "Please enable at least one database to search.",
        variant: "destructive",
      });
      return;
    }

    try {
      await initiateSearchMutation.mutateAsync({
        processId,
        request: {
          keywords: allKeywords,
          databases: enabledDatabases,
          searchOptions: {
            maxResults: 1000,
            dateRange: {
              from: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years ago
              to: new Date().toISOString()
            }
          }
        }
      });
      
      toast({
        title: "Search initiated",
        description: `Started searching ${enabledDatabases.length} databases for potential reviewers.`,
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "There was an error initiating the search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualSearchByName = async () => {
    if (!manualSearchName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name to search for.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await searchByNameMutation.mutateAsync({
        processId,
        name: manualSearchName.trim()
      });
      
      toast({
        title: "Manual search completed",
        description: `Found ${results.length} potential reviewers matching "${manualSearchName}".`,
      });
      
      setManualSearchName("");
    } catch (error: any) {
      toast({
        title: "Manual search failed",
        description: error.message || "There was an error searching by name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualSearchByEmail = async () => {
    if (!manualSearchEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email to search for.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await searchByEmailMutation.mutateAsync({
        processId,
        email: manualSearchEmail.trim()
      });
      
      toast({
        title: "Manual search completed",
        description: `Found ${results.length} potential reviewers matching "${manualSearchEmail}".`,
      });
      
      setManualSearchEmail("");
    } catch (error: any) {
      toast({
        title: "Manual search failed",
        description: error.message || "There was an error searching by email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle search completion
  useEffect(() => {
    if (isCompleted && onSearchComplete) {
      onSearchComplete();
    }
  }, [isCompleted, onSearchComplete]);

  // Show loading state
  if (isLoadingKeywords) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Database Search</span>
          </CardTitle>
          <CardDescription>
            Search academic databases for potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading enhanced keywords...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if keywords couldn't be loaded
  if (keywordsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Database Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load enhanced keywords. Please go back and enhance keywords first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Keywords Summary */}
      {enhancedKeywords && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-primary" />
              <span>Enhanced Keywords Summary</span>
            </CardTitle>
            <CardDescription>
              Keywords generated from your manuscript for database searches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Original Keywords</Label>
                <div className="flex flex-wrap gap-1">
                  {enhancedKeywords.original.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Enhanced Keywords</Label>
                <div className="flex flex-wrap gap-1">
                  {enhancedKeywords.enhanced.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">MeSH Terms</Label>
                <div className="flex flex-wrap gap-1">
                  {enhancedKeywords.meshTerms.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Keyword Management</span>
          </CardTitle>
          <CardDescription>
            Manage primary and secondary keywords for reviewer search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Primary Keywords</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {primaryKeywords.map((keyword) => (
                    <Badge key={keyword} variant="default" className="gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword, "primary")}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Secondary Keywords</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {secondaryKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="gap-1">
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword, "secondary")}
                        className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Add new keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={keywordType === "primary"}
                onCheckedChange={(checked) => 
                  setKeywordType(checked ? "primary" : "secondary")
                }
              />
              <Label htmlFor="primary" className="text-sm">Primary</Label>
            </div>
            <Button onClick={addKeyword} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Keyword String</span>
          </CardTitle>
          <CardDescription>
            Combined search string for database queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
              <div className="flex items-center justify-between">
                <code className="text-sm text-foreground/90 font-mono break-all">
                  {(() => {
                    const primaryStr = primaryKeywords.length > 0 ? `(${primaryKeywords.join(' OR ')})` : '';
                    const secondaryStr = secondaryKeywords.length > 0 ? `(${secondaryKeywords.join(' OR ')})` : '';
                    
                    if (primaryStr && secondaryStr) {
                      return `${primaryStr} AND ${secondaryStr}`;
                    }
                    return primaryStr || secondaryStr || 'No keywords selected';
                  })()}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const primaryStr = primaryKeywords.length > 0 ? `(${primaryKeywords.join(' OR ')})` : '';
                    const secondaryStr = secondaryKeywords.length > 0 ? `(${secondaryKeywords.join(' OR ')})` : '';
                    const keywordString = primaryStr && secondaryStr ? `${primaryStr} AND ${secondaryStr}` : (primaryStr || secondaryStr);
                    
                    if (keywordString && keywordString !== 'No keywords selected') {
                      navigator.clipboard.writeText(keywordString);
                      toast({
                        title: "Copied to clipboard",
                        description: "Keyword string has been copied to your clipboard.",
                      });
                    }
                  }}
                  className="ml-2 flex-shrink-0"
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Search Databases</span>
          </CardTitle>
          <CardDescription>
            Select databases to search for potential reviewers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {databases.map((db) => (
              <div key={db.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <Checkbox 
                  id={db.id} 
                  checked={db.enabled}
                  onCheckedChange={() => toggleDatabase(db.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor={db.id} className="font-medium cursor-pointer">
                    {db.name}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {db.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSearch} 
            className="w-full" 
            disabled={isSearching || initiateSearchMutation.isPending}
            size="lg"
          >
            {isSearching || initiateSearchMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isSearching ? "Searching databases..." : "Initiating search..."}
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search for Reviewers
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Progress Tracking */}
      {(isSearching || isCompleted || isFailed) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {isSearching && <Clock className="w-5 h-5 text-blue-500" />}
              {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
              {isFailed && <XCircle className="w-5 h-5 text-red-500" />}
              <span>Search Progress</span>
            </CardTitle>
            <CardDescription>
              {isSearching && "Searching databases for potential reviewers..."}
              {isCompleted && `Search completed! Found ${totalFound} potential reviewers.`}
              {isFailed && "Search failed. Please try again or contact support."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>

            {/* Database-specific Progress */}
            {progress && Object.keys(progress).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Database Progress</Label>
                <div className="grid gap-3">
                  {Object.entries(progress).map(([database, info]) => (
                    <div key={database} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {info.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {info.status === 'IN_PROGRESS' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {info.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-500" />}
                        {info.status === 'PENDING' && <Clock className="w-4 h-4 text-gray-400" />}
                        <div>
                          <div className="font-medium capitalize">
                            {database === 'taylorFrancis' ? 'Taylor & Francis' : database}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {info.status === 'COMPLETED' && `Found ${info.count} reviewers`}
                            {info.status === 'IN_PROGRESS' && 'Searching...'}
                            {info.status === 'FAILED' && 'Search failed'}
                            {info.status === 'PENDING' && 'Waiting to start'}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          info.status === 'COMPLETED' ? 'default' :
                          info.status === 'IN_PROGRESS' ? 'secondary' :
                          info.status === 'FAILED' ? 'destructive' : 'outline'
                        }
                      >
                        {info.count || 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Information */}
            {isFailed && searchError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {searchError.message || "An error occurred during the search. Please try again."}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Reviewer Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary" />
            <span>Manual Reviewer Search</span>
          </CardTitle>
          <CardDescription>
            Search for specific reviewers by name or email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search by Name */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Search by Name</Label>
            <div className="flex gap-3">
              <Input
                placeholder="Enter reviewer name..."
                value={manualSearchName}
                onChange={(e) => setManualSearchName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearchByName()}
                className="flex-1"
              />
              <Button 
                onClick={handleManualSearchByName}
                disabled={searchByNameMutation.isPending || !manualSearchName.trim()}
                size="default"
              >
                {searchByNameMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search by Email */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Search by Email</Label>
            <div className="flex gap-3">
              <Input
                placeholder="Enter reviewer email..."
                value={manualSearchEmail}
                onChange={(e) => setManualSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearchByEmail()}
                className="flex-1"
                type="email"
              />
              <Button 
                onClick={handleManualSearchByEmail}
                disabled={searchByEmailMutation.isPending || !manualSearchEmail.trim()}
                size="default"
              >
                {searchByEmailMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Manual Search Results Info */}
          {(searchByNameMutation.data || searchByEmailMutation.data) && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Manual search completed. Results have been added to your reviewer pool and will appear in the recommendations step.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};