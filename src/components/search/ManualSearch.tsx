/**
 * Manual Search Component
 * Allows users to search for specific reviewers by name or email
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSearchByName, useSearchByEmail } from "@/hooks/useSearch";

interface ManualSearchProps {
  processId: string;
  onSearchComplete?: (results: any[]) => void;
}

export const ManualSearch = ({ processId, onSearchComplete }: ManualSearchProps) => {
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const { toast } = useToast();

  const searchByNameMutation = useSearchByName();
  const searchByEmailMutation = useSearchByEmail();

  const handleSearchByName = async () => {
    if (!nameQuery.trim()) {
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
        name: nameQuery.trim()
      });
      
      toast({
        title: "Manual search completed",
        description: `Found ${results.length} potential reviewers matching "${nameQuery}".`,
      });
      
      if (onSearchComplete) {
        onSearchComplete(results);
      }
      
      setNameQuery("");
    } catch (error: any) {
      toast({
        title: "Manual search failed",
        description: error.message || "There was an error searching by name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearchByEmail = async () => {
    if (!emailQuery.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email to search for.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailQuery.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await searchByEmailMutation.mutateAsync({
        processId,
        email: emailQuery.trim()
      });
      
      toast({
        title: "Manual search completed",
        description: `Found ${results.length} potential reviewers matching "${emailQuery}".`,
      });
      
      if (onSearchComplete) {
        onSearchComplete(results);
      }
      
      setEmailQuery("");
    } catch (error: any) {
      toast({
        title: "Manual search failed",
        description: error.message || "There was an error searching by email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !searchByNameMutation.isPending) {
      handleSearchByName();
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !searchByEmailMutation.isPending) {
      handleSearchByEmail();
    }
  };

  return (
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
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              onKeyDown={handleNameKeyDown}
              className="flex-1"
              disabled={searchByNameMutation.isPending}
            />
            <Button 
              onClick={handleSearchByName}
              disabled={searchByNameMutation.isPending || !nameQuery.trim()}
              size="default"
            >
              {searchByNameMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {searchByNameMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {searchByNameMutation.error.message || "Failed to search by name"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Search by Email */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Search by Email</Label>
          <div className="flex gap-3">
            <Input
              placeholder="Enter reviewer email..."
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              className="flex-1"
              type="email"
              disabled={searchByEmailMutation.isPending}
            />
            <Button 
              onClick={handleSearchByEmail}
              disabled={searchByEmailMutation.isPending || !emailQuery.trim()}
              size="default"
            >
              {searchByEmailMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {searchByEmailMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {searchByEmailMutation.error.message || "Failed to search by email"}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Success Messages */}
        {(searchByNameMutation.data || searchByEmailMutation.data) && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Manual search completed successfully! Results have been added to your reviewer pool 
              and will appear in the recommendations step.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Tips */}
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="font-medium">Search Tips:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Use full names for better results (e.g., "John Smith" instead of "J. Smith")</li>
            <li>Try variations of names if no results are found</li>
            <li>Email searches are exact matches - use the complete email address</li>
            <li>Manual searches complement database searches and help find specific reviewers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};