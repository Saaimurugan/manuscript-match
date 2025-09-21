/**
 * Safe environment variable access for browser compatibility
 * Handles both Node.js and browser environments
 */

export const getEnvVar = (key: string, defaultValue?: string): string => {
  // Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue || '';
  }
  
  // Browser environment with injected env vars
  if (typeof window !== 'undefined' && (window as any).__ENV__) {
    return (window as any).__ENV__[key] || defaultValue || '';
  }
  
  return defaultValue || '';
};

export const isNodeEnv = (env: string): boolean => {
  return getEnvVar('NODE_ENV') === env;
};

export const isDevelopment = (): boolean => {
  return isNodeEnv('development');
};

export const isProduction = (): boolean => {
  return isNodeEnv('production');
};

export const isTest = (): boolean => {
  return isNodeEnv('test');
};