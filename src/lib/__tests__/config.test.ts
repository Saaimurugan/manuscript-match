/**
 * Configuration tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigValidationError } from '../config';

// Mock import.meta.env
const mockEnv = {
  VITE_API_BASE_URL: 'http://localhost:3001',
  VITE_API_TIMEOUT: '30000',
  VITE_MAX_FILE_SIZE: '10485760',
  VITE_SUPPORTED_FILE_TYPES: 'pdf,docx,doc',
  VITE_JWT_STORAGE_KEY: 'test_token',
  MODE: 'test',
  DEV: false,
};

vi.stubGlobal('import', {
  meta: {
    env: mockEnv,
  },
});

describe('Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock environment
    Object.assign(mockEnv, {
      VITE_API_BASE_URL: 'http://localhost:3001',
      VITE_API_TIMEOUT: '30000',
      VITE_MAX_FILE_SIZE: '10485760',
      VITE_SUPPORTED_FILE_TYPES: 'pdf,docx,doc',
      VITE_JWT_STORAGE_KEY: 'test_token',
      MODE: 'test',
      DEV: false,
    });
  });

  describe('ConfigValidationError', () => {
    it('should create error with field information', () => {
      const error = new ConfigValidationError('Invalid value', 'TEST_FIELD');
      
      expect(error.message).toBe('Configuration validation failed for TEST_FIELD: Invalid value');
      expect(error.field).toBe('TEST_FIELD');
      expect(error.name).toBe('ConfigValidationError');
    });
  });

  describe('Configuration Loading', () => {
    it('should load configuration with valid environment variables', async () => {
      // Dynamically import to get fresh config
      const { config } = await import('../config');
      
      expect(config.apiBaseUrl).toBe('http://localhost:3001');
      expect(config.apiTimeout).toBe(30000);
      expect(config.maxFileSize).toBe(10485760);
      expect(config.supportedFileTypes).toEqual(['pdf', 'docx', 'doc']);
      expect(config.jwtStorageKey).toBe('test_token');
    });

    it('should use default values for optional variables', async () => {
      delete mockEnv.VITE_API_RETRY_ATTEMPTS;
      delete mockEnv.VITE_CACHE_STALE_TIME;
      
      // Clear module cache and reimport
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.apiRetryAttempts).toBe(3);
      expect(config.cacheStaleTime).toBe(300000);
    });

    it('should throw error for invalid API URL', async () => {
      mockEnv.VITE_API_BASE_URL = 'not-a-url';
      
      vi.resetModules();
      
      await expect(async () => {
        await import('../config');
      }).rejects.toThrow(ConfigValidationError);
    });

    it('should throw error for negative timeout', async () => {
      mockEnv.VITE_API_TIMEOUT = '-1000';
      
      vi.resetModules();
      
      await expect(async () => {
        await import('../config');
      }).rejects.toThrow(ConfigValidationError);
    });

    it('should throw error for empty file types', async () => {
      mockEnv.VITE_SUPPORTED_FILE_TYPES = '';
      
      vi.resetModules();
      
      await expect(async () => {
        await import('../config');
      }).rejects.toThrow(ConfigValidationError);
    });

    it('should throw error for empty JWT storage key', async () => {
      mockEnv.VITE_JWT_STORAGE_KEY = '';
      
      vi.resetModules();
      
      await expect(async () => {
        await import('../config');
      }).rejects.toThrow(ConfigValidationError);
    });
  });

  describe('Environment Detection', () => {
    it('should detect development environment', async () => {
      mockEnv.DEV = true;
      mockEnv.MODE = 'development';
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.environment).toBe('development');
      expect(config.enableDevTools).toBe(true);
    });

    it('should detect staging environment', async () => {
      mockEnv.MODE = 'staging';
      mockEnv.DEV = false;
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.environment).toBe('staging');
    });

    it('should detect production environment', async () => {
      mockEnv.MODE = 'production';
      mockEnv.DEV = false;
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.environment).toBe('production');
    });
  });

  describe('Configuration Helpers', () => {
    it('should return API configuration', async () => {
      const { getApiConfig } = await import('../config');
      
      const apiConfig = getApiConfig();
      
      expect(apiConfig).toEqual({
        baseUrl: 'http://localhost:3001',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
      });
    });

    it('should return file configuration', async () => {
      const { getFileConfig } = await import('../config');
      
      const fileConfig = getFileConfig();
      
      expect(fileConfig).toEqual({
        maxFileSize: 10485760,
        supportedFileTypes: ['pdf', 'docx', 'doc'],
        uploadChunkSize: 1048576,
      });
    });

    it('should return auth configuration', async () => {
      const { getAuthConfig } = await import('../config');
      
      const authConfig = getAuthConfig();
      
      expect(authConfig).toEqual({
        storageKey: 'test_token',
        refreshThreshold: 300000,
      });
    });

    it('should return cache configuration', async () => {
      const { getCacheConfig } = await import('../config');
      
      const cacheConfig = getCacheConfig();
      
      expect(cacheConfig).toEqual({
        staleTime: 300000,
        gcTime: 600000,
      });
    });

    it('should return UI configuration', async () => {
      const { getUIConfig } = await import('../config');
      
      const uiConfig = getUIConfig();
      
      expect(uiConfig).toEqual({
        paginationDefaultSize: 20,
        toastDuration: 5000,
        debounceDelay: 300,
      });
    });
  });

  describe('Boolean Parsing', () => {
    it('should parse "true" as true', async () => {
      mockEnv.VITE_ENABLE_DEV_TOOLS = 'true';
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.enableDevTools).toBe(true);
    });

    it('should parse "false" as false', async () => {
      mockEnv.VITE_ENABLE_DEV_TOOLS = 'false';
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.enableDevTools).toBe(false);
    });

    it('should parse "1" as true', async () => {
      mockEnv.VITE_ENABLE_DEV_TOOLS = '1';
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.enableDevTools).toBe(true);
    });

    it('should parse "0" as false', async () => {
      mockEnv.VITE_ENABLE_DEV_TOOLS = '0';
      
      vi.resetModules();
      const { config } = await import('../config');
      
      expect(config.enableDevTools).toBe(false);
    });
  });
});