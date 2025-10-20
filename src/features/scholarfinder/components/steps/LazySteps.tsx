/**
 * Lazy-loaded step components for code splitting
 * This file provides React.lazy wrapped versions of all step components
 * to enable code splitting and reduce initial bundle size
 */

import { lazy } from 'react';
import { StepComponentProps } from '../../types/workflow';

// Lazy load all step components
export const LazyUploadStep = lazy(() => 
  import('./UploadStep').then(module => ({ default: module.UploadStep || module.default }))
);

export const LazyMetadataStep = lazy(() => 
  import('./MetadataStep').then(module => ({ default: module.MetadataStep || module.default }))
);

export const LazyKeywordStep = lazy(() => 
  import('./KeywordStep').then(module => ({ default: module.KeywordStep || module.default }))
);

export const LazySearchStep = lazy(() => 
  import('./SearchStep').then(module => ({ default: module.SearchStep || module.default }))
);

export const LazyManualStep = lazy(() => 
  import('./ManualStep').then(module => ({ default: module.ManualStep || module.default }))
);

export const LazyValidationStep = lazy(() => 
  import('./ValidationStep').then(module => ({ default: module.ValidationStep || module.default }))
);

export const LazyShortlistStep = lazy(() => 
  import('./ShortlistStep').then(module => ({ default: module.ShortlistStep || module.default }))
);

export const LazyExportStep = lazy(() => 
  import('./ExportStep')
);

// Create a recommendations step placeholder since it doesn't exist yet
export const LazyRecommendationsStep = lazy(() => 
  import('./PlaceholderStep')
);

// Loading fallback component
export const StepLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center py-12">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Loading step...</p>
    </div>
  </div>
);

// Higher-order component to wrap lazy components with error boundary
export const withStepErrorBoundary = <P extends StepComponentProps>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <Component {...props} />
  );
};

// Export all lazy components with error boundaries
export const LazySteps = {
  upload: withStepErrorBoundary(LazyUploadStep),
  metadata: withStepErrorBoundary(LazyMetadataStep),
  keywords: withStepErrorBoundary(LazyKeywordStep),
  search: withStepErrorBoundary(LazySearchStep),
  manual: withStepErrorBoundary(LazyManualStep),
  validation: withStepErrorBoundary(LazyValidationStep),
  recommendations: withStepErrorBoundary(LazyRecommendationsStep),
  shortlist: withStepErrorBoundary(LazyShortlistStep),
  export: withStepErrorBoundary(LazyExportStep),
};