/**
 * Error Boundary Configuration System
 * Provides configurable behavior for different environments and use cases
 */

export interface ErrorBoundaryConfig {
  // Environment-specific settings
  environment: 'development' | 'production' | 'test' | 'staging';
  
  // Error handling behavior
  enableReporting: boolean;
  enableAutoRecovery: boolean;
  enableIsolation: boolean;
  showErrorDetails: boolean;
  
  // Retry configuration
  maxRetries: number;
  retryDelay: number;
  autoRetryEnabled: boolean;
  
  // UI customization
  theme: 'default' | 'minimal' | 'detailed' | 'custom';
  showStackTrace: boolean;
  showComponentStack: boolean;
  showUserActions: boolean;
  
  // Logging configuration
  logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  
  // Recovery options
  enableRetryButton: boolean;
  enableHomeButton: boolean;
  enableReportButton: boolean;
  enableRefreshButton: boolean;
  
  // Error categorization
  errorSeverityThresholds: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  };
  
  // Custom messages
  messages: {
    title: string;
    description: string;
    retryButton: string;
    homeButton: string;
    reportButton: string;
    refreshButton: string;
  };
  
  // Monitoring integration
  monitoring: {
    enabled: boolean;
    service?: 'sentry' | 'bugsnag' | 'rollbar' | 'custom';
    apiKey?: string;
    projectId?: string;
  };
}

// Default configurations for different environments
export const defaultConfigs: Record<string, Partial<ErrorBoundaryConfig>> = {
  development: {
    environment: 'development',
    enableReporting: true,
    enableAutoRecovery: false,
    enableIsolation: false,
    showErrorDetails: true,
    maxRetries: 3,
    retryDelay: 1000,
    autoRetryEnabled: false,
    theme: 'detailed',
    showStackTrace: true,
    showComponentStack: true,
    showUserActions: true,
    logLevel: 'debug',
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    enableRetryButton: true,
    enableHomeButton: true,
    enableReportButton: true,
    enableRefreshButton: true,
    errorSeverityThresholds: {
      critical: ['syntax', 'chunk load', 'module not found'],
      high: ['network', 'system', 'memory'],
      medium: ['runtime', 'validation'],
      low: ['user input', 'format']
    },
    messages: {
      title: 'Development Error',
      description: 'An error occurred during development. Check the console for details.',
      retryButton: 'Try Again',
      homeButton: 'Go Home',
      reportButton: 'Report Bug',
      refreshButton: 'Refresh Page'
    },
    monitoring: {
      enabled: false
    }
  },
  
  production: {
    environment: 'production',
    enableReporting: true,
    enableAutoRecovery: true,
    enableIsolation: true,
    showErrorDetails: false,
    maxRetries: 2,
    retryDelay: 2000,
    autoRetryEnabled: true,
    theme: 'minimal',
    showStackTrace: false,
    showComponentStack: false,
    showUserActions: false,
    logLevel: 'error',
    enableConsoleLogging: false,
    enableRemoteLogging: true,
    enableRetryButton: true,
    enableHomeButton: true,
    enableReportButton: true,
    enableRefreshButton: false,
    errorSeverityThresholds: {
      critical: ['syntax', 'chunk load', 'module not found', 'cannot read properties'],
      high: ['network', 'system', 'memory', 'quota'],
      medium: ['runtime', 'validation', 'timeout'],
      low: ['user input', 'format', 'temporary']
    },
    messages: {
      title: 'Something went wrong',
      description: 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
      retryButton: 'Try Again',
      homeButton: 'Go Home',
      reportButton: 'Report Issue',
      refreshButton: 'Refresh'
    },
    monitoring: {
      enabled: true,
      service: 'sentry'
    }
  },
  
  test: {
    environment: 'test',
    enableReporting: false,
    enableAutoRecovery: false,
    enableIsolation: true,
    showErrorDetails: true,
    maxRetries: 1,
    retryDelay: 0,
    autoRetryEnabled: false,
    theme: 'minimal',
    showStackTrace: true,
    showComponentStack: true,
    showUserActions: false,
    logLevel: 'error',
    enableConsoleLogging: true,
    enableRemoteLogging: false,
    enableRetryButton: false,
    enableHomeButton: false,
    enableReportButton: false,
    enableRefreshButton: false,
    errorSeverityThresholds: {
      critical: ['syntax', 'test failure'],
      high: ['runtime', 'assertion'],
      medium: ['validation', 'mock'],
      low: ['warning', 'info']
    },
    messages: {
      title: 'Test Error',
      description: 'An error occurred during testing.',
      retryButton: 'Retry Test',
      homeButton: 'Skip Test',
      reportButton: 'Log Error',
      refreshButton: 'Reset'
    },
    monitoring: {
      enabled: false
    }
  }
};

// Configuration manager class
export class ErrorBoundaryConfigManager {
  private static instance: ErrorBoundaryConfigManager;
  private config: ErrorBoundaryConfig;
  private customConfigs: Map<string, Partial<ErrorBoundaryConfig>> = new Map();

  private constructor() {
    this.config = this.createDefaultConfig();
  }

  public static getInstance(): ErrorBoundaryConfigManager {
    if (!ErrorBoundaryConfigManager.instance) {
      ErrorBoundaryConfigManager.instance = new ErrorBoundaryConfigManager();
    }
    return ErrorBoundaryConfigManager.instance;
  }

  private createDefaultConfig(): ErrorBoundaryConfig {
    const env = this.detectEnvironment();
    const baseConfig = defaultConfigs[env] || defaultConfigs.development;
    
    return {
      environment: env as any,
      enableReporting: true,
      enableAutoRecovery: false,
      enableIsolation: false,
      showErrorDetails: env === 'development',
      maxRetries: 3,
      retryDelay: 1000,
      autoRetryEnabled: false,
      theme: 'default',
      showStackTrace: env === 'development',
      showComponentStack: env === 'development',
      showUserActions: true,
      logLevel: env === 'development' ? 'debug' : 'error',
      enableConsoleLogging: true,
      enableRemoteLogging: env === 'production',
      enableRetryButton: true,
      enableHomeButton: true,
      enableReportButton: true,
      enableRefreshButton: false,
      errorSeverityThresholds: {
        critical: ['syntax', 'chunk load', 'module not found'],
        high: ['network', 'system', 'memory'],
        medium: ['runtime', 'validation'],
        low: ['user input', 'format']
      },
      messages: {
        title: 'Something went wrong',
        description: 'An unexpected error occurred. Please try again.',
        retryButton: 'Try Again',
        homeButton: 'Go Home',
        reportButton: 'Report Bug',
        refreshButton: 'Refresh Page'
      },
      monitoring: {
        enabled: env === 'production'
      },
      ...baseConfig
    };
  }

  private detectEnvironment(): string {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV || 'development';
    }
    
    // Fallback detection
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'development';
      }
      if (window.location.hostname.includes('test') || window.location.hostname.includes('staging')) {
        return 'test';
      }
    }
    
    return 'production';
  }

  public getConfig(): ErrorBoundaryConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<ErrorBoundaryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public setEnvironmentConfig(environment: string, config: Partial<ErrorBoundaryConfig>): void {
    this.customConfigs.set(environment, config);
    
    if (this.config.environment === environment) {
      this.updateConfig(config);
    }
  }

  public getEnvironmentConfig(environment: string): Partial<ErrorBoundaryConfig> | undefined {
    return this.customConfigs.get(environment) || defaultConfigs[environment];
  }

  public resetToDefaults(): void {
    this.config = this.createDefaultConfig();
  }

  public validateConfig(config: Partial<ErrorBoundaryConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || config.maxRetries > 10)) {
      errors.push('maxRetries must be between 0 and 10');
    }

    if (config.retryDelay !== undefined && (config.retryDelay < 0 || config.retryDelay > 10000)) {
      errors.push('retryDelay must be between 0 and 10000ms');
    }

    if (config.logLevel !== undefined && !['none', 'error', 'warn', 'info', 'debug'].includes(config.logLevel)) {
      errors.push('logLevel must be one of: none, error, warn, info, debug');
    }

    if (config.theme !== undefined && !['default', 'minimal', 'detailed', 'custom'].includes(config.theme)) {
      errors.push('theme must be one of: default, minimal, detailed, custom');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
export const errorBoundaryConfig = ErrorBoundaryConfigManager.getInstance();

// Helper functions for common configuration tasks
export const configHelpers = {
  // Create configuration for specific use cases
  createMinimalConfig(): Partial<ErrorBoundaryConfig> {
    return {
      theme: 'minimal',
      showErrorDetails: false,
      showStackTrace: false,
      showComponentStack: false,
      enableReportButton: false,
      messages: {
        title: 'Error',
        description: 'Something went wrong.',
        retryButton: 'Retry',
        homeButton: 'Home',
        reportButton: 'Report',
        refreshButton: 'Refresh'
      }
    };
  },

  createDetailedConfig(): Partial<ErrorBoundaryConfig> {
    return {
      theme: 'detailed',
      showErrorDetails: true,
      showStackTrace: true,
      showComponentStack: true,
      enableReportButton: true,
      logLevel: 'debug',
      enableConsoleLogging: true
    };
  },

  createTestConfig(): Partial<ErrorBoundaryConfig> {
    return {
      environment: 'test',
      enableReporting: false,
      enableAutoRecovery: false,
      maxRetries: 0,
      enableRetryButton: false,
      enableHomeButton: false,
      enableReportButton: false,
      logLevel: 'error',
      enableRemoteLogging: false
    };
  },

  // Environment-specific configurations
  forDevelopment(): Partial<ErrorBoundaryConfig> {
    return defaultConfigs.development;
  },

  forProduction(): Partial<ErrorBoundaryConfig> {
    return defaultConfigs.production;
  },

  forTesting(): Partial<ErrorBoundaryConfig> {
    return defaultConfigs.test;
  }
};