/**
 * KeywordSelector Component
 * Allows users to select primary and secondary keywords from enhanced keyword lists
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  X, 
  CheckCircle2, 
  Circle, 
  Info,
  Sparkles,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeywordEnhancementResponse } from '../../../types/api';

interface KeywordSelectorProps {
  enhancedData: KeywordEnhancementResponse['data'];
  selectedKeywords: {
    primary: string[];
    secondary: string[];
  };
  onSelectionChange: (type: 'primary' | 'secondary', keywords: string[]) => void;
  isLoading?: boolean;
}

interface KeywordItemProps {
  keyword: string;
  isSelected: boolean;
  onToggle: (keyword: string) => void;
  type: 'primary' | 'secondary';
  disabled?: boolean;
}

const KeywordItem: React.FC<KeywordItemProps> = ({
  keyword,
  isSelected,
  onToggle,
  type,
  disabled = false
}) => {
  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
        isSelected && "bg-primary/5 border-primary/20",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onToggle(keyword)}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => !disabled && onToggle(keyword)}
        disabled={disabled}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm font-medium",
          isSelected && "text-primary"
        )}>
          {keyword}
        </span>
      </div>
      {isSelected && (
        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
      )}
    </div>
  );
};

const KeywordSelector: React.FC<KeywordSelectorProps> = ({
  enhancedData,
  selectedKeywords,
  onSelectionChange,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('primary');

  // Combine all available keywords for each type
  const availableKeywords = useMemo(() => {
    return {
      primary: [
        ...enhancedData.primary_focus,
        ...enhancedData.additional_primary_keywords,
        ...enhancedData.all_primary_focus_list
      ].filter((keyword, index, array) => 
        keyword && array.indexOf(keyword) === index // Remove duplicates and empty strings
      ),
      secondary: [
        ...enhancedData.secondary_focus,
        ...enhancedData.additional_secondary_keywords,
        ...enhancedData.all_secondary_focus_list
      ].filter((keyword, index, array) => 
        keyword && array.indexOf(keyword) === index // Remove duplicates and empty strings
      )
    };
  }, [enhancedData]);

  // Filter keywords based on search term
  const filteredKeywords = useMemo(() => {
    const filterBySearch = (keywords: string[]) => {
      if (!searchTerm) return keywords;
      return keywords.filter(keyword =>
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      );
    };

    return {
      primary: filterBySearch(availableKeywords.primary),
      secondary: filterBySearch(availableKeywords.secondary)
    };
  }, [availableKeywords, searchTerm]);

  const handleKeywordToggle = (type: 'primary' | 'secondary', keyword: string) => {
    const currentSelection = selectedKeywords[type];
    const isSelected = currentSelection.includes(keyword);
    
    let newSelection: string[];
    if (isSelected) {
      // Remove keyword
      newSelection = currentSelection.filter(k => k !== keyword);
    } else {
      // Add keyword
      newSelection = [...currentSelection, keyword];
    }
    
    onSelectionChange(type, newSelection);
  };

  const handleSelectAll = (type: 'primary' | 'secondary') => {
    const availableForType = filteredKeywords[type];
    const currentSelection = selectedKeywords[type];
    
    // If all filtered keywords are selected, deselect all
    const allSelected = availableForType.every(keyword => currentSelection.includes(keyword));
    
    if (allSelected) {
      // Deselect all filtered keywords
      const newSelection = currentSelection.filter(keyword => !availableForType.includes(keyword));
      onSelectionChange(type, newSelection);
    } else {
      // Select all filtered keywords
      const newSelection = [...new Set([...currentSelection, ...availableForType])];
      onSelectionChange(type, newSelection);
    }
  };

  const handleClearAll = (type: 'primary' | 'secondary') => {
    onSelectionChange(type, []);
  };

  const handleAddCustomKeyword = (type: 'primary' | 'secondary') => {
    const keyword = customKeyword.trim();
    if (!keyword) return;
    
    const currentSelection = selectedKeywords[type];
    if (!currentSelection.includes(keyword)) {
      onSelectionChange(type, [...currentSelection, keyword]);
    }
    setCustomKeyword('');
  };

  const handleRemoveKeyword = (type: 'primary' | 'secondary', keyword: string) => {
    const currentSelection = selectedKeywords[type];
    const newSelection = currentSelection.filter(k => k !== keyword);
    onSelectionChange(type, newSelection);
  };

  const getSelectionStats = (type: 'primary' | 'secondary') => {
    const selected = selectedKeywords[type].length;
    const available = availableKeywords[type].length;
    return { selected, available };
  };

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Primary Keywords</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Main research focus areas ({getSelectionStats('primary').selected} selected)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {selectedKeywords.primary.length > 0 ? (
                selectedKeywords.primary.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="default"
                    className="text-xs bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword('primary', keyword)}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No primary keywords selected</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-secondary-foreground" />
              <CardTitle className="text-base">Secondary Keywords</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Supporting research areas ({getSelectionStats('secondary').selected} selected)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1">
              {selectedKeywords.secondary.length > 0 ? (
                selectedKeywords.secondary.map((keyword) => (
                  <Badge
                    key={keyword}
                    variant="secondary"
                    className="text-xs"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword('secondary', keyword)}
                      className="ml-1 hover:bg-secondary/20 rounded-full p-0.5"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No secondary keywords selected</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Selection Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Available Keywords</CardTitle>
          <CardDescription>
            Select keywords from AI-enhanced suggestions or add your own
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Keyword Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="primary" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Primary ({selectedKeywords.primary.length})</span>
              </TabsTrigger>
              <TabsTrigger value="secondary" className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Secondary ({selectedKeywords.secondary.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="primary" className="space-y-4">
              {/* Primary Keywords Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll('primary')}
                    disabled={isLoading || filteredKeywords.primary.length === 0}
                  >
                    {filteredKeywords.primary.every(k => selectedKeywords.primary.includes(k)) ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearAll('primary')}
                    disabled={isLoading || selectedKeywords.primary.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredKeywords.primary.length} available
                </span>
              </div>

              {/* Primary Keywords List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredKeywords.primary.length > 0 ? (
                  filteredKeywords.primary.map((keyword) => (
                    <KeywordItem
                      key={keyword}
                      keyword={keyword}
                      isSelected={selectedKeywords.primary.includes(keyword)}
                      onToggle={(k) => handleKeywordToggle('primary', k)}
                      type="primary"
                      disabled={isLoading}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No primary keywords found</p>
                    {searchTerm && <p className="text-sm">Try a different search term</p>}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="secondary" className="space-y-4">
              {/* Secondary Keywords Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll('secondary')}
                    disabled={isLoading || filteredKeywords.secondary.length === 0}
                  >
                    {filteredKeywords.secondary.every(k => selectedKeywords.secondary.includes(k)) ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearAll('secondary')}
                    disabled={isLoading || selectedKeywords.secondary.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {filteredKeywords.secondary.length} available
                </span>
              </div>

              {/* Secondary Keywords List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredKeywords.secondary.length > 0 ? (
                  filteredKeywords.secondary.map((keyword) => (
                    <KeywordItem
                      key={keyword}
                      keyword={keyword}
                      isSelected={selectedKeywords.secondary.includes(keyword)}
                      onToggle={(k) => handleKeywordToggle('secondary', k)}
                      type="secondary"
                      disabled={isLoading}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Circle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No secondary keywords found</p>
                    {searchTerm && <p className="text-sm">Try a different search term</p>}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Add Custom Keyword */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <Label className="text-sm font-medium">Add Custom Keyword</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  placeholder="Enter custom keyword..."
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomKeyword(activeTab as 'primary' | 'secondary');
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={() => handleAddCustomKeyword(activeTab as 'primary' | 'secondary')}
                  disabled={isLoading || !customKeyword.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Selection Guidance */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Selection Tips:</strong> Primary keywords should represent your main research focus, 
          while secondary keywords can include related concepts, methodologies, or broader topics. 
          Select 3-8 keywords total for optimal search results.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default KeywordSelector;