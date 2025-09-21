/**
 * Error Boundary Composition Utilities
 * Provides composition patterns for complex component hierarchies
 */

import React, { ReactNode, ComponentType } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { 
  PageErrorBoundary, 
  ComponentErrorBoundary, 
  FormErrorBoundary,
  ModalErrorBoundary 
} from './ErrorBoundaryWrappers';
import { ErrorBoundaryConfig } from '@/config/errorBoundary.config';

// Nested error boundary configuration
interface NestedBoundaryConfig {
  level: 'app' | 'page' | 'section' | 'component';
  config: Partial<ErrorBoundaryConfig>;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Multi-level error boundary composer
export interface ComposedErrorBoundaryProps {
  children: ReactNode;
  boundaries: NestedBoundaryConfig[];
  isolationStrategy?: 'cascade' | 'isolate' | 'bubble';
}

export const ComposedErrorBoundary: React.FC<ComposedErrorBoundaryProps> = ({
  children,
  boundaries,
  isolationStrategy = 'cascade'
}) => {
  // Sort boundaries by level hierarchy
  const sortedBoundaries = [...boundaries].sort((a, b) => {
    const levelOrder = { app: 0, page: 1, section: 2, component: 3 };
    return levelOrder[a.level] - levelOrder[b.level];
  });

  // Apply isolation strategy
  const processedBoundaries = applyIsolationStrategy(sortedBoundaries, isolationStrategy);

  // Compose nested error boundaries
  return processedBoundaries.reduceRight((acc, boundary) => {
    const BoundaryComponent = getBoundaryComponent(boundary.level);
    
    return (
      <BoundaryComponent
        config={boundary.config}
        onError={boundary.onError}
      >
        {boundary.fallback || acc}
      </BoundaryComponent>
    );
  }, children as ReactNode);
};

// Apply isolation strategy to boundary configurations
function applyIsolationStrategy(
  boundaries: NestedBoundaryConfig[],
  strategy: 'cascade' | 'isolate' | 'bubble'
): NestedBoundaryConfig[] {
  switch (strategy) {
    case 'isolate':
      // Each boundary isolates errors completely
      return boundaries.map(boundary => ({
        ...boundary,
        config: {
          ...boundary.config,
          enableIsolation: true,
          enableAutoRecovery: false
        }
      }));

    case 'bubble':
      // Errors bubble up to parent boundaries
      return boundaries.map((boundary, index) => ({
        ...boundary,
        config: {
          ...boundary.config,
          enableIsolation: false,
          enableAutoRecovery: index === boundaries.length - 1 // Only top level recovers
        }
      }));

    case 'cascade':
    default:
      // Balanced approach - inner boundaries try recovery, outer boundaries isolate
      return boundaries.map((boundary, index) => ({
        ...boundary,
        config: {
          ...boundary.config,
          enableIsolation: index < boundaries.length - 1,
          enableAutoRecovery: index >= boundaries.length - 2
        }
      }));
  }
}

// Get appropriate boundary component for level
function getBoundaryComponent(level: string): ComponentType<any> {
  switch (level) {
    case 'app':
    case 'page':
      return PageErrorBoundary;
    case 'section':
      return ComponentErrorBoundary;
    case 'component':
      return ComponentErrorBoundary;
    default:
      return ComponentErrorBoundary;
  }
}

// Hierarchical error boundary provider
export interface ErrorBoundaryHierarchyProps {
  children: ReactNode;
  appConfig?: Partial<ErrorBoundaryConfig>;
  pageConfig?: Partial<ErrorBoundaryConfig>;
  sectionConfig?: Partial<ErrorBoundaryConfig>;
  componentConfig?: Partial<ErrorBoundaryConfig>;
}

export const ErrorBoundaryHierarchy: React.FC<ErrorBoundaryHierarchyProps> = ({
  children,
  appConfig = {},
  pageConfig = {},
  sectionConfig = {},
  componentConfig = {}
}) => {
  return (
    <PageErrorBoundary config={appConfig}>
      <PageErrorBoundary config={pageConfig}>
        <ComponentErrorBoundary config={sectionConfig}>
          <ComponentErrorBoundary config={componentConfig}>
            {children}
          </ComponentErrorBoundary>
        </ComponentErrorBoundary>
      </PageErrorBoundary>
    </PageErrorBoundary>
  );
};

// Route-based error boundary composer
export interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeConfigs: Record<string, Partial<ErrorBoundaryConfig>>;
  defaultConfig?: Partial<ErrorBoundaryConfig>;
}

export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  children,
  routeConfigs,
  defaultConfig = {}
}) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Find matching route config
  const routeConfig = Object.entries(routeConfigs).find(([route]) => 
    currentPath.startsWith(route)
  )?.[1] || defaultConfig;

  return (
    <PageErrorBoundary config={routeConfig}>
      {children}
    </PageErrorBoundary>
  );
};

// Feature-based error boundary composer
export interface FeatureErrorBoundaryProps {
  children: ReactNode;
  feature: string;
  featureConfigs: Record<string, Partial<ErrorBoundaryConfig>>;
  fallbackConfig?: Partial<ErrorBoundaryConfig>;
}

export const FeatureErrorBoundary: React.FC<FeatureErrorBoundaryProps> = ({
  children,
  feature,
  featureConfigs,
  fallbackConfig = {}
}) => {
  const config = featureConfigs[feature] || fallbackConfig;

  return (
    <ComponentErrorBoundary config={config}>
      {children}
    </ComponentErrorBoundary>
  );
};

// Conditional error boundary composer
export interface ConditionalComposerProps {
  children: ReactNode;
  conditions: Array<{
    condition: boolean;
    config: Partial<ErrorBoundaryConfig>;
    wrapper?: 'page' | 'component' | 'form' | 'modal';
  }>;
  defaultConfig?: Partial<ErrorBoundaryConfig>;
}

export const ConditionalErrorBoundaryComposer: React.FC<ConditionalComposerProps> = ({
  children,
  conditions,
  defaultConfig = {}
}) => {
  // Find first matching condition
  const activeCondition = conditions.find(c => c.condition);
  const config = activeCondition?.config || defaultConfig;
  const wrapperType = activeCondition?.wrapper || 'component';

  const WrapperComponent = {
    page: PageErrorBoundary,
    component: ComponentErrorBoundary,
    form: FormErrorBoundary,
    modal: ModalErrorBoundary
  }[wrapperType];

  return (
    <WrapperComponent config={config}>
      {children}
    </WrapperComponent>
  );
};

// Error boundary factory for dynamic composition
export class ErrorBoundaryFactory {
  private static defaultConfig: Partial<ErrorBoundaryConfig> = {};

  static setDefaultConfig(config: Partial<ErrorBoundaryConfig>) {
    this.defaultConfig = config;
  }

  static createPageBoundary(config?: Partial<ErrorBoundaryConfig>) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return ({ children }: { children: ReactNode }) => (
      <PageErrorBoundary config={mergedConfig}>
        {children}
      </PageErrorBoundary>
    );
  }

  static createComponentBoundary(config?: Partial<ErrorBoundaryConfig>) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return ({ children }: { children: ReactNode }) => (
      <ComponentErrorBoundary config={mergedConfig}>
        {children}
      </ComponentErrorBoundary>
    );
  }

  static createFormBoundary(config?: Partial<ErrorBoundaryConfig>) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return ({ children }: { children: ReactNode }) => (
      <FormErrorBoundary config={mergedConfig}>
        {children}
      </FormErrorBoundary>
    );
  }

  static createModalBoundary(config?: Partial<ErrorBoundaryConfig>) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return ({ children }: { children: ReactNode }) => (
      <ModalErrorBoundary config={mergedConfig}>
        {children}
      </ModalErrorBoundary>
    );
  }

  static createComposedBoundary(boundaries: NestedBoundaryConfig[]) {
    return ({ children }: { children: ReactNode }) => (
      <ComposedErrorBoundary boundaries={boundaries}>
        {children}
      </ComposedErrorBoundary>
    );
  }
}

// Error boundary registry for managing multiple boundaries
export class ErrorBoundaryRegistry {
  private static boundaries = new Map<string, ComponentType<{ children: ReactNode }>>();

  static register(name: string, boundary: ComponentType<{ children: ReactNode }>) {
    this.boundaries.set(name, boundary);
  }

  static get(name: string): ComponentType<{ children: ReactNode }> | undefined {
    return this.boundaries.get(name);
  }

  static createNamed(name: string, config: Partial<ErrorBoundaryConfig>, type: 'page' | 'component' | 'form' | 'modal' = 'component') {
    const boundary = {
      page: ErrorBoundaryFactory.createPageBoundary(config),
      component: ErrorBoundaryFactory.createComponentBoundary(config),
      form: ErrorBoundaryFactory.createFormBoundary(config),
      modal: ErrorBoundaryFactory.createModalBoundary(config)
    }[type];

    this.register(name, boundary);
    return boundary;
  }

  static use(name: string) {
    const boundary = this.get(name);
    if (!boundary) {
      console.warn(`Error boundary '${name}' not found in registry`);
      return ComponentErrorBoundary;
    }
    return boundary;
  }

  static list(): string[] {
    return Array.from(this.boundaries.keys());
  }

  static clear() {
    this.boundaries.clear();
  }
}