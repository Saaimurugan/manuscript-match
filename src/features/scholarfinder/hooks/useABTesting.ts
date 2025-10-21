import { useCallback, useEffect, useState } from 'react';
import { abTestingService, ABTestVariant } from '../services/ABTestingService';
import { useAuth } from '../../../contexts/AuthContext';

export interface UseABTestingOptions {
  testId: string;
  defaultConfig?: Record<string, any>;
}

export const useABTesting = (options: UseABTestingOptions) => {
  const { testId, defaultConfig = {} } = options;
  const { user } = useAuth();
  const [variant, setVariant] = useState<ABTestVariant | null>(null);
  const [config, setConfig] = useState<Record<string, any>>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize A/B test assignment
  useEffect(() => {
    if (user?.id) {
      abTestingService.setUser(user.id);
    }

    const assignedVariant = abTestingService.getVariant(testId);
    setVariant(assignedVariant);
    
    if (assignedVariant) {
      setConfig({ ...defaultConfig, ...assignedVariant.config });
    } else {
      setConfig(defaultConfig);
    }
    
    setIsLoading(false);
  }, [testId, user?.id, defaultConfig]);

  // Check if user is in a specific variant
  const isInVariant = useCallback((variantId: string): boolean => {
    return abTestingService.isInVariant(testId, variantId);
  }, [testId]);

  // Track conversion events
  const trackConversion = useCallback((metadata?: Record<string, any>) => {
    abTestingService.trackConversion(testId, metadata);
  }, [testId]);

  // Track interaction events
  const trackInteraction = useCallback((interaction: string, metadata?: Record<string, any>) => {
    abTestingService.trackInteraction(testId, interaction, metadata);
  }, [testId]);

  // Get configuration value with fallback
  const getConfig = useCallback(<T>(key: string, fallback?: T): T => {
    return config[key] !== undefined ? config[key] : fallback;
  }, [config]);

  return {
    variant,
    config,
    isLoading,
    isInVariant,
    trackConversion,
    trackInteraction,
    getConfig,
  };
};

// Hook for feature flags (simplified A/B testing)
export const useFeatureFlag = (featureId: string, defaultEnabled: boolean = false) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      abTestingService.setUser(user.id);
    }

    const enabled = abTestingService.isFeatureEnabled(featureId);
    const featureConfig = abTestingService.getFeatureConfig(featureId) || {};
    
    setIsEnabled(enabled);
    setConfig(featureConfig);
    setIsLoading(false);
  }, [featureId, user?.id]);

  const trackUsage = useCallback((metadata?: Record<string, any>) => {
    if (isEnabled) {
      abTestingService.trackInteraction(featureId, 'feature_usage', metadata);
    }
  }, [featureId, isEnabled]);

  return {
    isEnabled,
    config,
    isLoading,
    trackUsage,
  };
};

// Predefined A/B test hooks for common tests
export const useWizardLayoutTest = () => {
  return useABTesting({
    testId: 'wizard_layout_test',
    defaultConfig: {
      layout: 'vertical',
      progressPosition: 'top',
    },
  });
};

export const useUploadInterfaceTest = () => {
  return useABTesting({
    testId: 'upload_interface_test',
    defaultConfig: {
      showPreview: false,
      guidanceLevel: 'minimal',
    },
  });
};

export const useRecommendationDisplayTest = () => {
  return useABTesting({
    testId: 'recommendation_display_test',
    defaultConfig: {
      displayMode: 'table',
      cardsPerRow: 1,
    },
  });
};

// Hook for multiple A/B tests
export const useMultipleABTests = (testIds: string[]) => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Record<string, ABTestVariant | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      abTestingService.setUser(user.id);
    }

    const testResults: Record<string, ABTestVariant | null> = {};
    testIds.forEach(testId => {
      testResults[testId] = abTestingService.getVariant(testId);
    });

    setTests(testResults);
    setIsLoading(false);
  }, [testIds, user?.id]);

  const trackConversion = useCallback((testId: string, metadata?: Record<string, any>) => {
    abTestingService.trackConversion(testId, metadata);
  }, []);

  const trackInteraction = useCallback((testId: string, interaction: string, metadata?: Record<string, any>) => {
    abTestingService.trackInteraction(testId, interaction, metadata);
  }, []);

  const isInVariant = useCallback((testId: string, variantId: string): boolean => {
    return abTestingService.isInVariant(testId, variantId);
  }, []);

  const getConfig = useCallback((testId: string): Record<string, any> | null => {
    return abTestingService.getVariantConfig(testId);
  }, []);

  return {
    tests,
    isLoading,
    trackConversion,
    trackInteraction,
    isInVariant,
    getConfig,
  };
};

// Hook for A/B test analytics
export const useABTestAnalytics = () => {
  const [activeTests, setActiveTests] = useState(abTestingService.getActiveTests());
  const [assignments, setAssignments] = useState(abTestingService.getAssignments());

  useEffect(() => {
    // Refresh test data periodically
    const interval = setInterval(() => {
      setActiveTests(abTestingService.getActiveTests());
      setAssignments(abTestingService.getAssignments());
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const getTestSummary = useCallback(() => {
    return {
      totalActiveTests: activeTests.length,
      totalAssignments: assignments.length,
      testsWithAssignments: activeTests.filter(test => 
        assignments.some(assignment => assignment.testId === test.id)
      ).length,
    };
  }, [activeTests, assignments]);

  return {
    activeTests,
    assignments,
    getTestSummary,
  };
};