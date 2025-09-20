/**
 * Example usage of database search integration components
 * Demonstrates how to use SearchService, search hooks, and search components
 */

import React, { useState } from "react";
import { ReviewerSearch } from "../components/search/ReviewerSearch";
import { SearchProgress } from "../components/search/SearchProgress";
import { ManualSearch } from "../components/search/ManualSearch";
import { useSearchProgress } from "../hooks/useSearch";

// Example: Basic search workflow
export const BasicSearchExample = () => {
  const [processId] = useState("example-process-123");
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([
    "machine learning",
    "artificial intelligence"
  ]);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([
    "neural networks",
    "deep learning"
  ]);

  const handleKeywordsChange = (primary: string[], secondary: string[]) => {
    setPrimaryKeywords(primary);
    setSecondaryKeywords(secondary);
  };

  const handleSearchComplete = () => {
    console.log("Search completed! Moving to next step...");
    // Navigate to validation or recommendations step
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Database Search Example</h2>
      
      <ReviewerSearch
        processId={processId}
        primaryKeywords={primaryKeywords}
        secondaryKeywords={secondaryKeywords}
        onKeywordsChange={handleKeywordsChange}
        onSearchComplete={handleSearchComplete}
      />
    </div>
  );
};

// Example: Search with progress monitoring
export const SearchWithProgressExample = () => {
  const [processId] = useState("example-process-456");
  const { isSearching, isCompleted } = useSearchProgress(processId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search Progress Monitoring</h2>
      
      {(isSearching || isCompleted) && (
        <SearchProgress
          processId={processId}
          onComplete={() => {
            console.log("Search monitoring detected completion");
          }}
        />
      )}
      
      {!isSearching && !isCompleted && (
        <div className="text-center text-muted-foreground">
          Start a search to see progress monitoring in action
        </div>
      )}
    </div>
  );
};

// Example: Manual search only
export const ManualSearchExample = () => {
  const [processId] = useState("example-process-789");

  const handleManualSearchComplete = (results: any[]) => {
    console.log(`Manual search found ${results.length} reviewers:`, results);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manual Search Example</h2>
      
      <ManualSearch
        processId={processId}
        onSearchComplete={handleManualSearchComplete}
      />
    </div>
  );
};

// Example: Complete search workflow
export const CompleteSearchWorkflowExample = () => {
  const [processId] = useState("example-process-complete");
  const [currentStep, setCurrentStep] = useState<"search" | "progress" | "manual">("search");
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([]);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);

  const { isSearching, isCompleted, isFailed } = useSearchProgress(processId);

  const handleKeywordsChange = (primary: string[], secondary: string[]) => {
    setPrimaryKeywords(primary);
    setSecondaryKeywords(secondary);
  };

  const handleSearchComplete = () => {
    setCurrentStep("manual");
  };

  const handleManualSearchComplete = (results: any[]) => {
    console.log("Manual search results:", results);
  };

  // Auto-advance to progress step when search starts
  React.useEffect(() => {
    if (isSearching && currentStep === "search") {
      setCurrentStep("progress");
    }
  }, [isSearching, currentStep]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Complete Search Workflow</h2>
      
      {/* Step indicator */}
      <div className="flex items-center space-x-4 text-sm">
        <div className={`px-3 py-1 rounded ${currentStep === "search" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          1. Database Search
        </div>
        <div className={`px-3 py-1 rounded ${currentStep === "progress" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          2. Progress Monitoring
        </div>
        <div className={`px-3 py-1 rounded ${currentStep === "manual" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          3. Manual Search
        </div>
      </div>

      {/* Search step */}
      {currentStep === "search" && (
        <ReviewerSearch
          processId={processId}
          primaryKeywords={primaryKeywords}
          secondaryKeywords={secondaryKeywords}
          onKeywordsChange={handleKeywordsChange}
          onSearchComplete={handleSearchComplete}
        />
      )}

      {/* Progress monitoring step */}
      {currentStep === "progress" && (
        <div className="space-y-6">
          <SearchProgress
            processId={processId}
            onComplete={handleSearchComplete}
          />
          
          {/* Allow going back to search */}
          {!isSearching && (
            <button
              onClick={() => setCurrentStep("search")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to search configuration
            </button>
          )}
        </div>
      )}

      {/* Manual search step */}
      {currentStep === "manual" && (
        <div className="space-y-6">
          <ManualSearch
            processId={processId}
            onSearchComplete={handleManualSearchComplete}
          />
          
          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep("progress")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to progress
            </button>
            <button
              onClick={() => console.log("Proceed to validation step")}
              className="text-sm text-primary hover:text-primary/80"
            >
              Continue to validation →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Example: Error handling
export const SearchErrorHandlingExample = () => {
  const [processId] = useState("example-process-error");
  const { error, isFailed } = useSearchProgress(processId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Search Error Handling</h2>
      
      {isFailed && error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="font-medium text-red-800">Search Error</h3>
          <p className="text-red-600 mt-1">{error.message}</p>
          <div className="mt-3">
            <button className="text-sm text-red-700 hover:text-red-800">
              Retry Search
            </button>
          </div>
        </div>
      )}
      
      <SearchProgress processId={processId} />
    </div>
  );
};

export default {
  BasicSearchExample,
  SearchWithProgressExample,
  ManualSearchExample,
  CompleteSearchWorkflowExample,
  SearchErrorHandlingExample,
};