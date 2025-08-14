import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, X, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SearchDatabase {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface ReviewerSearchProps {
  primaryKeywords: string[];
  secondaryKeywords: string[];
  onKeywordsChange: (primary: string[], secondary: string[]) => void;
  onSearch: (keywords: string[], databases: string[]) => void;
}

export const ReviewerSearch = ({ 
  primaryKeywords, 
  secondaryKeywords, 
  onKeywordsChange, 
  onSearch 
}: ReviewerSearchProps) => {
  const [newKeyword, setNewKeyword] = useState("");
  const [keywordType, setKeywordType] = useState<"primary" | "secondary">("primary");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const [databases] = useState<SearchDatabase[]>([
    {
      id: "pubmed",
      name: "PubMed",
      description: "Medical and biomedical literature",
      enabled: true,
    },
    {
      id: "sciencedirect",
      name: "ScienceDirect",
      description: "Scientific and academic research",
      enabled: true,
    },
    {
      id: "taylor_francis",
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

    setIsSearching(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate search
      onSearch(allKeywords, enabledDatabases);
      toast({
        title: "Search completed",
        description: `Found potential reviewers across ${enabledDatabases.length} databases.`,
      });
    } catch (error) {
      toast({
        title: "Search failed",
        description: "There was an error searching for reviewers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
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
                onKeyPress={(e) => e.key === "Enter" && addKeyword()}
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
            disabled={isSearching}
            size="lg"
          >
            {isSearching ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Searching for reviewers...
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
    </div>
  );
};