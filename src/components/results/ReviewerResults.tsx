import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Download, Filter, Mail, Building, BookOpen, ExternalLink } from "lucide-react";
import { ActivityLogger } from "@/services/activityLogger";
import { toast } from "sonner";

interface Reviewer {
  id: string;
  name: string;
  email?: string;
  affiliation: string;
  country: string;
  publicationCount: number;
  recentPublications: string[];
  expertise: string[];
  database: string;
  matchScore: number;
}

interface ReviewerResultsProps {
  reviewers: Reviewer[];
  onExport: (selectedReviewers: Reviewer[]) => void;
}

export const ReviewerResults = ({ reviewers, onExport }: ReviewerResultsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDatabase, setFilterDatabase] = useState<string>("all");
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<Set<string>>(new Set());

  const filteredReviewers = reviewers.filter(reviewer => {
    const matchesSearch = reviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.affiliation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         reviewer.expertise.some(exp => exp.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDatabase = filterDatabase === "all" || reviewer.database === filterDatabase;
    
    return matchesSearch && matchesDatabase;
  });

  const databases = [...new Set(reviewers.map(r => r.database))];

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return "bg-accent text-accent-foreground";
    if (score >= 70) return "bg-primary text-primary-foreground";
    if (score >= 50) return "bg-secondary text-secondary-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleSelectReviewer = (reviewerId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedReviewerIds);
    if (checked) {
      newSelectedIds.add(reviewerId);
    } else {
      newSelectedIds.delete(reviewerId);
    }
    setSelectedReviewerIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviewerIds(new Set(filteredReviewers.map(r => r.id)));
    } else {
      setSelectedReviewerIds(new Set());
    }
  };

  const handleExport = async () => {
    const selectedReviewers = reviewers.filter(r => selectedReviewerIds.has(r.id));
    
    if (selectedReviewers.length === 0) {
      toast.error("Please select at least one reviewer to export");
      return;
    }

    // Log the export activity
    const logger = ActivityLogger.getInstance();
    await logger.logActivity(
      'EXPORT',
      `Exported ${selectedReviewers.length} reviewers`,
      {
        reviewerCount: selectedReviewers.length,
        reviewerNames: selectedReviewers.map(r => r.name),
        databases: [...new Set(selectedReviewers.map(r => r.database))]
      }
    );

    onExport(selectedReviewers);
    toast.success(`Exported ${selectedReviewers.length} reviewers successfully`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Reviewer Search Results</span>
              </CardTitle>
              <CardDescription>
                Found {reviewers.length} potential reviewers across multiple databases
              </CardDescription>
            </div>
            <Button 
              onClick={handleExport} 
              variant="outline"
              disabled={selectedReviewerIds.size === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Selected ({selectedReviewerIds.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search reviewers by name, affiliation, or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterDatabase}
                onChange={(e) => setFilterDatabase(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Databases</option>
                {databases.map(db => (
                  <option key={db} value={db}>{db}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredReviewers.length} of {reviewers.length} reviewers
            </div>
            {filteredReviewers.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={filteredReviewers.every(r => selectedReviewerIds.has(r.id))}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All
                </label>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {filteredReviewers.map((reviewer) => (
              <Card key={reviewer.id} className="border-l-4 border-l-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3 flex-1">
                      <Checkbox
                        id={`reviewer-${reviewer.id}`}
                        checked={selectedReviewerIds.has(reviewer.id)}
                        onCheckedChange={(checked) => handleSelectReviewer(reviewer.id, checked as boolean)}
                      />
                      <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg">{reviewer.name}</h3>
                        <Badge className={getMatchScoreColor(reviewer.matchScore)}>
                          {reviewer.matchScore}% match
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {reviewer.database}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-2" />
                          {reviewer.affiliation}, {reviewer.country}
                        </div>
                        {reviewer.email && (
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            {reviewer.email}
                          </div>
                        )}
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-2" />
                          {reviewer.publicationCount} publications (last 10 years)
                        </div>
                      </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Profile
                    </Button>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Expertise Areas</h4>
                      <div className="flex flex-wrap gap-2">
                        {reviewer.expertise.map((area, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {reviewer.recentPublications.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Recent Publications</h4>
                        <div className="space-y-1">
                          {reviewer.recentPublications.slice(0, 3).map((pub, index) => (
                            <p key={index} className="text-xs text-muted-foreground leading-relaxed">
                              • {pub}
                            </p>
                          ))}
                          {reviewer.recentPublications.length > 3 && (
                            <p className="text-xs text-primary">
                              +{reviewer.recentPublications.length - 3} more publications
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredReviewers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reviewers found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};