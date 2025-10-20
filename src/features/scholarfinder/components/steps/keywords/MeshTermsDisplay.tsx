/**
 * MeshTermsDisplay Component
 * Displays Medical Subject Headings (MeSH) terms and broader terms extracted from the manuscript
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  ExternalLink, 
  Info, 
  BookOpen, 
  Globe,
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MeshTermsDisplayProps {
  meshTerms: string[];
  broaderTerms: string[];
}

interface TermItemProps {
  term: string;
  type: 'mesh' | 'broader';
  onCopy?: (term: string) => void;
}

const TermItem: React.FC<TermItemProps> = ({ term, type, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(term);
    } else {
      try {
        await navigator.clipboard.writeText(term);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy term:', error);
      }
    }
  };

  const handleMeshLookup = () => {
    // Open MeSH browser in new tab
    const searchUrl = `https://meshb.nlm.nih.gov/search?q=${encodeURIComponent(term)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border transition-all hover:bg-muted/50",
      type === 'mesh' ? "border-blue-200 bg-blue-50/50" : "border-green-200 bg-green-50/50"
    )}>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium break-words">{term}</span>
      </div>
      <div className="flex items-center space-x-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
          title="Copy term"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        {type === 'mesh' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMeshLookup}
            className="h-8 w-8 p-0"
            title="Look up in MeSH browser"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

const MeshTermsDisplay: React.FC<MeshTermsDisplayProps> = ({
  meshTerms,
  broaderTerms
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('mesh');

  // Filter terms based on search
  const filteredMeshTerms = meshTerms.filter(term =>
    term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBroaderTerms = broaderTerms.filter(term =>
    term.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyTerm = async (term: string) => {
    try {
      await navigator.clipboard.writeText(term);
      toast({
        title: 'Copied',
        description: `"${term}" copied to clipboard`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy term to clipboard',
        variant: 'destructive'
      });
    }
  };

  const handleCopyAllTerms = async (type: 'mesh' | 'broader') => {
    const terms = type === 'mesh' ? filteredMeshTerms : filteredBroaderTerms;
    const termsList = terms.join(', ');
    
    try {
      await navigator.clipboard.writeText(termsList);
      toast({
        title: 'Copied All Terms',
        description: `${terms.length} ${type === 'mesh' ? 'MeSH' : 'broader'} terms copied to clipboard`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy terms to clipboard',
        variant: 'destructive'
      });
    }
  };

  const getTermStats = () => {
    return {
      mesh: {
        total: meshTerms.length,
        filtered: filteredMeshTerms.length
      },
      broader: {
        total: broaderTerms.length,
        filtered: filteredBroaderTerms.length
      }
    };
  };

  const stats = getTermStats();

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-medium text-blue-900">MeSH Terms</p>
            <p className="text-sm text-blue-700">{meshTerms.length} standardized medical terms</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200">
          <Globe className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-900">Broader Terms</p>
            <p className="text-sm text-green-700">{broaderTerms.length} related concepts</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Terms Display */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mesh" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>MeSH Terms ({stats.mesh.filtered})</span>
          </TabsTrigger>
          <TabsTrigger value="broader" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Broader Terms ({stats.broader.filtered})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mesh" className="space-y-4">
          {/* MeSH Terms Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyAllTerms('mesh')}
                disabled={filteredMeshTerms.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://meshb.nlm.nih.gov/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                MeSH Browser
              </Button>
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">
                {stats.mesh.filtered} of {stats.mesh.total} terms
              </span>
            )}
          </div>

          {/* MeSH Terms List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredMeshTerms.length > 0 ? (
              filteredMeshTerms.map((term, index) => (
                <TermItem
                  key={`mesh-${index}`}
                  term={term}
                  type="mesh"
                  onCopy={handleCopyTerm}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No MeSH terms found</p>
                {searchTerm && <p className="text-sm">Try a different search term</p>}
              </div>
            )}
          </div>

          {/* MeSH Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>MeSH (Medical Subject Headings)</strong> are standardized terms used by the National Library of Medicine 
              for indexing biomedical literature. These terms help ensure consistent and precise searching across medical databases.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="broader" className="space-y-4">
          {/* Broader Terms Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyAllTerms('broader')}
                disabled={filteredBroaderTerms.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground">
                {stats.broader.filtered} of {stats.broader.total} terms
              </span>
            )}
          </div>

          {/* Broader Terms List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredBroaderTerms.length > 0 ? (
              filteredBroaderTerms.map((term, index) => (
                <TermItem
                  key={`broader-${index}`}
                  term={term}
                  type="broader"
                  onCopy={handleCopyTerm}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No broader terms found</p>
                {searchTerm && <p className="text-sm">Try a different search term</p>}
              </div>
            )}
          </div>

          {/* Broader Terms Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Broader Terms</strong> are related concepts and keywords that expand the scope of your research area. 
              These can include methodologies, related fields, and conceptual frameworks that might help identify additional relevant reviewers.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Usage Tips */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>How to Use These Terms</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="text-sm space-y-1">
            <p><strong>For Keyword Selection:</strong> Use these terms as inspiration when selecting primary and secondary keywords for your search.</p>
            <p><strong>For Manual Searches:</strong> Copy terms to use in your own literature searches or when manually adding reviewers.</p>
            <p><strong>For Validation:</strong> Verify that your selected keywords align with these standardized terms for better search accuracy.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MeshTermsDisplay;