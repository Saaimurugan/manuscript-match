import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Hash, Building, Edit2, Save, X, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMetadata, useUpdateMetadata } from "@/hooks/useFiles";
import type { ExtractedMetadata, Author, Affiliation } from "@/types/api";

interface DataExtractionProps {
  processId: string;
  fileName?: string;
}

export const DataExtraction = ({ processId, fileName }: DataExtractionProps) => {
  const { toast } = useToast();
  const { data: metadata, isLoading, error, refetch } = useMetadata(processId);
  const updateMetadataMutation = useUpdateMetadata();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<ExtractedMetadata>>({});

  const handleEdit = () => {
    if (metadata) {
      setEditedData({
        title: metadata.title,
        abstract: metadata.abstract,
        keywords: [...metadata.keywords],
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!editedData) return;

    try {
      await updateMetadataMutation.mutateAsync({
        processId,
        metadata: editedData,
      });

      setIsEditing(false);
      setEditedData({});
      
      toast({
        title: "Metadata updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      console.error('Failed to update metadata:', error);
      
      toast({
        title: "Update failed",
        description: error.message || "Failed to update metadata. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleKeywordAdd = (keyword: string) => {
    if (keyword.trim() && editedData.keywords) {
      setEditedData({
        ...editedData,
        keywords: [...editedData.keywords, keyword.trim()],
      });
    }
  };

  const handleKeywordRemove = (index: number) => {
    if (editedData.keywords) {
      setEditedData({
        ...editedData,
        keywords: editedData.keywords.filter((_, i) => i !== index),
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Extracted Manuscript Data</span>
          </CardTitle>
          <CardDescription>
            Extracting information from {fileName || "your manuscript"}...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Separator />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span>Extraction Error</span>
          </CardTitle>
          <CardDescription>
            Failed to extract metadata from {fileName || "your manuscript"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {error.type === 'NETWORK_ERROR' 
                ? "Network error. Please check your connection and try again."
                : error.message || "An error occurred while extracting metadata."
              }
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry Extraction
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metadata) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span>No Metadata Available</span>
          </CardTitle>
          <CardDescription>
            No extracted data found for this process. Please upload a file first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Upload a manuscript file to extract metadata automatically.
            </p>
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
                <FileText className="w-5 h-5 text-primary" />
                <span>Extracted Manuscript Data</span>
              </CardTitle>
              <CardDescription>
                Automatically extracted information from {fileName || "your manuscript"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={updateMetadataMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMetadataMutation.isPending}
                  >
                    {updateMetadataMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Section */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">TITLE</h4>
            {isEditing ? (
              <Input
                value={editedData.title || ''}
                onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                placeholder="Enter manuscript title"
                className="text-lg font-semibold"
              />
            ) : (
              <p className="text-lg font-semibold leading-relaxed">
                {metadata.title || "No title extracted"}
              </p>
            )}
          </div>

          {/* Abstract Section */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">ABSTRACT</h4>
            {isEditing ? (
              <Textarea
                value={editedData.abstract || ''}
                onChange={(e) => setEditedData({ ...editedData, abstract: e.target.value })}
                placeholder="Enter manuscript abstract"
                className="min-h-32 text-sm leading-relaxed"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-lg">
                {metadata.abstract || "No abstract extracted"}
              </p>
            )}
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Authors Section */}
            {metadata.authors && metadata.authors.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  AUTHORS & AFFILIATIONS
                </h4>
                <div className="space-y-3">
                  {metadata.authors.map((author, index) => (
                    <div key={index} className="p-3 bg-card border rounded-lg">
                      <p className="font-medium text-sm">{author.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <Building className="w-3 h-3 mr-1" />
                        {author.affiliation}
                      </p>
                      {author.email && (
                        <p className="text-xs text-primary mt-1">{author.email}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keywords Section */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                <Hash className="w-4 h-4 mr-1" />
                EXTRACTED KEYWORDS
              </h4>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(editedData.keywords || []).map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleKeywordRemove(index)}
                      >
                        {keyword}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add keyword and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleKeywordAdd(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                    className="text-xs"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {metadata.keywords && metadata.keywords.length > 0 ? (
                    metadata.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No keywords extracted</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Affiliations Section */}
          {metadata.affiliations && metadata.affiliations.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                <Building className="w-4 h-4 mr-1" />
                AFFILIATIONS
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {metadata.affiliations.map((affiliation, index) => (
                  <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                    <p className="font-medium">{affiliation.name}</p>
                    <p className="text-muted-foreground">{affiliation.country}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};