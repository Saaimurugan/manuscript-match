/**
 * Performance Optimization Usage Examples
 * Demonstrates how to use the performance optimization features
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

// Import skeleton components
import {
  ProcessDashboardSkeleton,
  ReviewerResultsSkeleton,
  FileUploadSkeleton,
  DataExtractionSkeleton,
  KeywordEnhancementSkeleton,
  SearchProgressSkeleton,
  ValidationResultsSkeleton,
  ShortlistManagerSkeleton,
  ActivityLogSkeleton,
  AdminDashboardSkeleton
} from '@/components/ui/skeleton-components';

// Import progress indicators
import {
  FileUploadProgress,
  DatabaseSearchProgress,
  ValidationProgress,
  ExportProgress,
  OperationProgress
} from '@/components/ui/progress-indicators';

// Import virtual scrolling
import {
  VirtualScroll,
  VirtualReviewerList,
  VirtualProcessList,
  VirtualActivityList
} from '@/components/ui/virtual-scroll';

// Import performance hooks
import {
  useDebounce,
  useThrottle,
  useRenderPerformance,
  useMemoryCache,
  useLocalStorageCache,
  useOptimizedQuery,
  usePrefetch,
  useIntersectionObserver,
  useVirtualScroll,
  usePerformanceMonitor,
  useLazyImage,
  useBatchOperations,
  useOptimisticUpdate
} from '@/hooks/usePerformance';

// Example component demonstrating skeleton loading states
export const SkeletonExamples: React.FC = () => {
  const [activeExample, setActiveExample] = useState<string>('process');

  const examples = {
    process: <ProcessDashboardSkeleton />,
    reviewer: <ReviewerResultsSkeleton />,
    upload: <FileUploadSkeleton />,
    extraction: <DataExtractionSkeleton />,
    keywords: <KeywordEnhancementSkeleton />,
    search: <SearchProgressSkeleton />,
    validation: <ValidationResultsSkeleton />,
    shortlist: <ShortlistManagerSkeleton />,
    activity: <ActivityLogSkeleton />,
    admin: <AdminDashboardSkeleton />
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loading Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(examples).map((key) => (
              <Button
                key={key}
                variant={activeExample === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveExample(key)}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Button>
            ))}
          </div>
          <div className="border rounded-lg p-4">
            {examples[activeExample as keyof typeof examples]}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};