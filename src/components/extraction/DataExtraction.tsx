import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, Hash, Building, BookOpen } from "lucide-react";

interface ExtractedData {
  title?: string;
  abstract?: string;
  keywords?: string[];
  authors?: Array<{
    name: string;
    affiliation: string;
    email?: string;
  }>;
  headings?: string[];
}

interface DataExtractionProps {
  data: ExtractedData;
  fileName: string;
}

export const DataExtraction = ({ data, fileName }: DataExtractionProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Extracted Manuscript Data</span>
          </CardTitle>
          <CardDescription>
            Automatically extracted information from {fileName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.title && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">TITLE</h4>
              <p className="text-lg font-semibold leading-relaxed">{data.title}</p>
            </div>
          )}

          {data.abstract && (
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">ABSTRACT</h4>
              <p className="text-sm leading-relaxed text-foreground/90 bg-muted/30 p-4 rounded-lg">
                {data.abstract}
              </p>
            </div>
          )}

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            {data.authors && data.authors.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  AUTHORS & AFFILIATIONS
                </h4>
                <div className="space-y-3">
                  {data.authors.map((author, index) => (
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

            {data.keywords && data.keywords.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center">
                  <Hash className="w-4 h-4 mr-1" />
                  EXTRACTED KEYWORDS
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
};