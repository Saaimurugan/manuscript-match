/**
 * Keyword Enhancement Component
 * Handles keyword enhancement, MeSH term generation, and search string creation
 */

import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, Search, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useKeywords, useEnhanceKeywords, useUpdateKeywordSelection } from '@/hooks/useKeywords';
import { useMetadata } from '@/hooks/useFiles';
import type { KeywordEnhancementRequest, EnhancedKeywords } from '@/types/api';

interface KeywordEnhancementProps {
  processId: string;
  onEnhancementComplete?: (keywords: EnhancedKeywords) => void;
}

export const KeywordEnhancement: React.FC<KeywordEnhancementProps> = ({
  processId,
  onEnhancementComplete,
}) => {
  const { toast } = useToast();
  
  // API hooks
  const { data: metadata } = useMetadata(processId);
  const { data: enhancedKeywords, isLoading: isLoadingKeywords, error: keywordsError } = useKeywords(processId);
  const enhanceKeywordsMutation = useEnhanceKeywords();
  const updateSelectionMutation = useUpdateKeywordSelection();

  // Local state
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [copiedSearchString, setCopiedSearchString] = useState<string | null>(null);
  const [enhancementOptions, setEnhancementOptions] = useState<KeywordEnhancementRequest>({
    includeOriginal: true,
    generateMeshTerms: true,
    generateSearchStrings: true,
  });

  // Initialize selected keywords when enhanced keywords are loaded
  useEffect(() => {
    if (enhancedKeywords && selectedKeywords.length === 0) {
      // Default to selecting all original and enhanced keywords
      const defaultSelection = [
        ...enhancedKeywords.original,
        ...enhancedKeywords.enhanced,
      ];
      setSelectedKeywords(defaultSelection);
    }
  }, [enhancedKeywords, selectedKeywords.length]);

  const handleEnhanceKeywords = async () => {
    try {
      const result = await enhanceKeywordsMutation.mutateAsync({
        processId,
        request: enhancementOptions,
      });

      toast({
        title: 'Keywords Enhanced',
        description: `Generated ${result.enhanced.length} enhanced keywords and ${result.meshTerms.length} MeSH terms.`,
      });

      onEnhancementComplete?.(result);
    } catch (error: any) {
      toast({
        title: 'Enhancement Failed',
        description: error.message || 'Failed to enhance keywords. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleKeywordToggle = (keyword: string, checked: boolean) => {
    setSelectedKeywords(prev => {
      if (checked) {
        return [...prev, keyword];
      } else {
        return prev.filter(k => k !== keyword);
      }
    });
  };

  const handleSaveSelection = async () => {
    try {
      await updateSelectionMutation.mutateAsync({
        processId,
        selection: selectedKeywords,
      });

      toast({
        title: 'Selection Saved',
        description: `${selectedKeywords.length} keywords selected for search.`,
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save keyword selection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCopySearchString = async (database: string, searchString: string) => {
    try {
      await navigator.clipboard.writeText(searchString);
      setCopiedSearchString(database);
      
      toast({
        title: 'Copied to Clipboard',
        description: `${database.toUpperCase()} search string copied successfully.`,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedSearchString(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy search string to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const renderKeywordSection = (title: string, keywords: string[], color: string) => {
    if (keywords.length === 0) return null;

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{title}</Label>
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <div key={keyword} className="flex items-center space-x-2">
              <Checkbox
                id={`keyword-${keyword}`}
                checked={selectedKeywords.includes(keyword)}
                onCheckedChange={(checked) => handleKeywordToggle(keyword, checked as boolean)}
              />
              <Badge variant="outline" className={`${color} cursor-pointer`}>
                {keyword}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSearchStrings = () => {
    if (!enhancedKeywords?.searchStrings) return null;

    const databases = [
      { key: 'pubmed', name: 'PubMed', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      { key: 'elsevier', name: 'Elsevier', color: 'bg-green-50 text-green-700 border-green-200' },
      { key: 'wiley', name: 'Wiley', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      { key: 'taylorFrancis', name: 'Taylor & Francis', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    ];

    return (
      <div className="space-y-4">
        {databases.map(({ key, name, color }) => {
          const searchString = enhancedKeywords.searchStrings[key as keyof typeof enhancedKeywords.searchStrings];
          if (!searchString) return null;

          return (
            <Card key={key} className={color}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopySearchString(name, searchString)}
                    className="h-8 w-8 p-0"
                  >
                    {copiedSearchString === name ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <code className="text-xs bg-white/50 p-2 rounded block overflow-x-auto">
                  {searchString}
                </code>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Show loading state
  if (isLoadingKeywords) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Keyword Enhancement</span>
          </CardTitle>
          <CardDescription>
            Enhance keywords and generate search terms for better reviewer matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading keywords...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (keywordsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-primary" />
            <span>Keyword Enhancement</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load keywords. Please try enhancing them first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary" />
          <span>Keyword Enhancement</span>
        </CardTitle>
        <CardDescription>
          Enhance keywords and generate search terms for better reviewer matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhancement Options and Trigger */}
        {!enhancedKeywords && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Enhancement Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-original"
                    checked={enhancementOptions.includeOriginal}
                    onCheckedChange={(checked) =>
                      setEnhancementOptions(prev => ({ ...prev, includeOriginal: checked as boolean }))
                    }
                  />
                  <Label htmlFor="include-original" className="text-sm">
                    Include original keywords from manuscript
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-mesh"
                    checked={enhancementOptions.generateMeshTerms}
                    onCheckedChange={(checked) =>
                      setEnhancementOptions(prev => ({ ...prev, generateMeshTerms: checked as boolean }))
                    }
                  />
                  <Label htmlFor="generate-mesh" className="text-sm">
                    Generate MeSH terms for medical topics
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="generate-search-strings"
                    checked={enhancementOptions.generateSearchStrings}
                    onCheckedChange={(checked) =>
                      setEnhancementOptions(prev => ({ ...prev, generateSearchStrings: checked as boolean }))
                    }
                  />
                  <Label htmlFor="generate-search-strings" className="text-sm">
                    Generate database-specific search strings
                  </Label>
                </div>
              </div>
            </div>

            {metadata?.keywords && metadata.keywords.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Original Keywords from Manuscript</Label>
                <div className="flex flex-wrap gap-2">
                  {metadata.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleEnhanceKeywords}
              disabled={enhanceKeywordsMutation.isPending}
              className="w-full"
            >
              {enhanceKeywordsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing Keywords...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Keywords
                </>
              )}
            </Button>
          </div>
        )}

        {/* Enhanced Keywords Display */}
        {enhancedKeywords && (
          <Tabs defaultValue="selection" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="selection">Keyword Selection</TabsTrigger>
              <TabsTrigger value="search-strings">Search Strings</TabsTrigger>
            </TabsList>

            <TabsContent value="selection" className="space-y-6">
              <div className="space-y-6">
                {renderKeywordSection(
                  "Original Keywords",
                  enhancedKeywords.original,
                  "bg-blue-50 text-blue-700 border-blue-200"
                )}

                {renderKeywordSection(
                  "Enhanced Keywords",
                  enhancedKeywords.enhanced,
                  "bg-green-50 text-green-700 border-green-200"
                )}

                {renderKeywordSection(
                  "MeSH Terms",
                  enhancedKeywords.meshTerms,
                  "bg-purple-50 text-purple-700 border-purple-200"
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {selectedKeywords.length} keywords selected for search
                  </div>
                  <Button
                    onClick={handleSaveSelection}
                    disabled={updateSelectionMutation.isPending || selectedKeywords.length === 0}
                    size="sm"
                  >
                    {updateSelectionMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Save Selection
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="search-strings" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Database-Specific Search Strings
                  </Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Copy these search strings to use in different academic databases
                  </p>
                </div>
                {renderSearchStrings()}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};