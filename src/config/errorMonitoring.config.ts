/**
 * Error Monitoring Configuration
 * Centralized configuration for error monitoring and analytics
 */

import { AlertConfig } from '../services/errorMonitoring';

export interface ErrorMonitoringConfig {
  // General settings
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  
  // Alert configuration
  alerts: AlertConfig;
  
  // Performance monitoring
  performanceMonitoring: {
    enabled: boolean;
    slowRenderThreshold: number; // milliseconds
    memoryLeakDetection: boolean;
  };
  
  // External integrations
  integrations: {
    sentry: {
      enabled: boolean;
      dsn?: string;
      environment?: string;
      release?: string;
    };
    logRocket: {
      enabled: boolean;
      appId?: string;
    };
    bugsnag: {
      enabled: boolean;
      apiKey?: string;
    };
    customWebhook: {
      enabled: boolean;
      url?: string;
      headers?: Record<string, string>;
    };
  };
  
  // Data retention
  dataRetention: {
    maxErrors: number;
    maxAgeHours: number;
    localStorageEnabled: boolean;
  };
  
  // Privacy settings
  privacy: {
    sanitizeUserData: boolean;
    excludeUrls: string[];
    excludeErrors: string[];
    collectUserAgent: boolean;
    collectUrl: boolean;
  };
  
  // Sampling
  sampling: {
    errorSampleRate: number; // 0.0 to 1.0
    performanceSampleRate: number; // 0.0 to 1.0
  };
}

// Development configuration
const developmentConfig: ErrorMonitoringConfig = {
  enabled: true,
  environment: 'development',
  
  alerts: {
    errorRateThreshold: 20, // Higher threshold for development
    criticalErrorThreshold: 5,
    timeWindowMinutes: 60,
    alertChannels: ['console'],
  },
  
  performanceMonitoring: {
    enabled: true,
    slowRenderThreshold: 16, // 60fps threshold
    memoryLeakDetection: true,
  },
  
  integrations: {
    sentry: {
      enabled: false, // Disabled in development
    },
    logRocket: {
      enabled: false,
    },
    bugsnag: {
      enabled: false,
    },
    customWebhook: {
      enabled: false,
    },
  },
  
  dataRetention: {
    maxErrors: 500,
    maxAgeHours: 24,
    localStorageEnabled: true,
  },
  
  privacy: {
    sanitizeUserData: false, // Show full data in development
    excludeUrls: [],
    excludeErrors: [],
    collectUserAgent: true,
    collectUrl: true,
  },
  
  sampling: {
    errorSampleRate: 1.0, // Capture all errors in development
    performanceSampleRate: 1.0,
  },
};

// Staging configuration
const stagingConfig: ErrorMonitoringConfig = {
  enabled: true,
  environment: 'staging',
  
  alerts: {
    errorRateThreshold: 10,
    criticalErrorThreshold: 3,
    timeWindowMinutes: 30,
    alertChannels: ['console', 'webhook'],
    webhookUrl: getEnvVar('REACT_APP_ERROR_WEBHOOK_URL'),
  },
  
  performanceMonitoring: {
    enabled: true,
    slowRenderThreshold: 50,
    memoryLeakDetection: true,
  },
  
  integrations: {
    sentry: {
      enabled: true,
      dsn: getEnvVar('REACT_APP_SENTRY_DSN'),
      environment: 'staging',
      release: getEnvVar('REACT_APP_VERSION'),
    },
    logRocket: {
      enabled: false,
    },
    bugsnag: {
      enabled: false,
    },
    customWebhook: {
      enabled: true,
      url: getEnvVar('REACT_APP_ERROR_WEBHOOK_URL'),
      headers: {
        'Authorization': `Bearer ${getEnvVar('REACT_APP_WEBHOOK_TOKEN')}`,
        'Content-Type': 'application/json',
      },
    },
  },
  
  dataRetention: {
    maxErrors: 1000,
    maxAgeHours: 48,
    localStorageEnabled: true,
  },
  
  privacy: {
    sanitizeUserData: true,
    excludeUrls: ['/admin', '/internal'],
    excludeErrors: ['Network request failed'],
    collectUserAgent: true,
    collectUrl: true,
  },
  
  sampling: {
    errorSampleRate: 1.0,
    performanceSampleRate: 0.5,
  },
};

// Production configuration
const productionConfig: ErrorMonitoringConfig = {
  enabled: true,
  environment: 'production',
  
  alerts: {
    errorRateThreshold: 5,
    criticalErrorThreshold: 2,
    timeWindowMinutes: 15,
    alertChannels: ['webhook', 'email'],
    webhookUrl: getEnvVar('REACT_APP_ERROR_WEBHOOK_URL'),
    emailRecipients: getEnvVar('REACT_APP_ERROR_EMAIL_RECIPIENTS')?.split(','),
  },
  
  performanceMonitoring: {
    enabled: true,
    slowRenderThreshold: 100,
    memoryLeakDetection: true,
  },
  
  integrations: {
    sentry: {
      enabled: true,
      dsn: getEnvVar('REACT_APP_SENTRY_DSN'),
      environment: 'production',
      release: getEnvVar('REACT_APP_VERSION'),
    },
    logRocket: {
      enabled: true,
      appId: getEnvVar('REACT_APP_LOGROCKET_APP_ID'),
    },
    bugsnag: {
      enabled: false,
    },
    customWebhook: {
      enabled: true,
      url: getEnvVar('REACT_APP_ERROR_WEBHOOK_URL'),
      headers: {
        'Authorization': `Bearer ${getEnvVar('REACT_APP_WEBHOOK_TOKEN')}`,
        'Content-Type': 'application/json',
      },
    },
  },
  
  dataRetention: {
    maxErrors: 2000,
    maxAgeHours: 168, // 1 week
    localStorageEnabled: false, // Disable local storage in production
  },
  
  privacy: {
    sanitizeUserData: true,
    excludeUrls: ['/admin', '/internal', '/debug'],
    excludeErrors: [
      'Network request failed',
      'Script error',
      'Non-Error promise rejection captured',
    ],
    collectUserAgent: true,
    collectUrl: true,
  },
  
  sampling: {
    errorSampleRate: 0.8, // Sample 80% of errors
    performanceSampleRate: 0.1, // Sample 10% of performance data
  },
};

// Safe environment variable access
const getEnvVar = (key: string, defaultValue?: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || defaultValue || '';
  }
  return defaultValue || '';
};

// Get configuration based on environment
export const getErrorMonitoringConfig = (): ErrorMonitoringConfig => {
  const env = getEnvVar('NODE_ENV', 'development');
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

// Export individual configurations for testing
export {
  developmentConfig,
  stagingConfig,
  productionConfig,
};

// Default export
export default getErrorMonitoringConfig;