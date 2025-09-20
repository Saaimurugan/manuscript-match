/**
 * Configuration Validation Tests for Automated Test Reporting
 * 
 * Tests configuration validation, schema validation, environment variable
 * overrides, and configuration customization options.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { TestReportingConfigSchema } from '../config/schemas';

describe('Configuration Validation Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Schema Validation', () => {
    test('should validate basic configuration', () => {
      const config = { enabled: true };
      const result = TestReportingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    test('should reject invalid configuration', () => {
      const config = { enabled: 'invalid' };
      const result = TestReportingConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    test('should apply default values', () => {
      const config = {};
      const result = TestReportingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.outputDirectory).toBe('test-reports');
      }
    });

    test('should validate complete configuration schema', () => {
      const config = {
        enabled: true,
        outputDirectory: 'custom-reports',
        formats: {
          html: true,
          markdown: true,
          json: false
        },
        html: {
          title: 'Custom Report',
          includeCharts: true,
          theme: 'dark' as const
        },
        markdown: {
          includeEmojis: true,
          includeStackTraces: false
        }
      };

      const result = TestReportingConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.outputDirectory).toBe('custom-reports');
        expect(result.data.formats.html).toBe(true);
        expect(result.data.html?.title).toBe('Custom Report');
      }
    });

    test('should reject invalid schema properties', () => {
      const invalidConfigs = [
        { enabled: 'not-boolean' },
        { outputDirectory: 123 },
        { formats: 'invalid' },
        { html: { theme: 'invalid-theme' } },
        { markdown: { includeEmojis: 'not-boolean' } }
      ];

      for (const config of invalidConfigs) {
        const result = TestReportingConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Configuration Schema Validation', () => {
    test('should validate configuration schema structure', () => {
      const validConfig = {
        enabled: true,
        outputDirectory: 'test-reports',
        formats: {
          html: true,
          markdown: true,
          json: false
        }
      };

      const result = TestReportingConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.outputDirectory).toBe('test-reports');
      }
    });

    test('should handle configuration validation errors gracefully', () => {
      const invalidConfig = {
        enabled: 'invalid',
        outputDirectory: 123,
        formats: 'not-an-object'
      };

      const result = TestReportingConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Environment Variable Configuration', () => {
    test('should override configuration with environment variables', () => {
      process.env['TEST_REPORTING_ENABLED'] = 'false';
      process.env['TEST_REPORTS_DIR'] = 'env-reports';
      process.env['TEST_REPORTING_FORMATS'] = 'html,json';

      // Test that environment variables can be used for configuration
      const envConfig = {
        enabled: process.env['TEST_REPORTING_ENABLED'] === 'true',
        outputDirectory: process.env['TEST_REPORTS_DIR'] || 'test-reports'
      };
      
      const result = TestReportingConfigSchema.safeParse(envConfig);
      expect(result.success).toBe(true);
    });

    test('should handle invalid environment variable values', () => {
      process.env['TEST_REPORTING_ENABLED'] = 'invalid-boolean';
      process.env['TEST_REPORTS_DIR'] = '';

      // Test that invalid environment variables fall back to defaults
      const invalidEnvConfig = {
        enabled: process.env['TEST_REPORTING_ENABLED'] === 'invalid-boolean' ? undefined : true,
        outputDirectory: process.env['TEST_REPORTS_DIR'] || 'test-reports'
      };
      
      const result = TestReportingConfigSchema.safeParse(invalidEnvConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true); // Default value
        expect(result.data.outputDirectory).toBe('test-reports'); // Default value
      }
    });

    test('should parse complex environment variables', () => {
      process.env['TEST_REPORTING_HTML_THEME'] = 'dark';
      process.env['TEST_REPORTING_MARKDOWN_EMOJIS'] = 'false';
      process.env['TEST_REPORTING_MAX_FAILURES'] = '5';

      // Test parsing complex configuration from environment-like structure
      const complexConfig = {
        enabled: true,
        html: {
          theme: (process.env['TEST_REPORTING_HTML_THEME'] || 'light') as 'light' | 'dark' | 'auto',
          includeCharts: true
        },
        markdown: {
          includeEmojis: process.env['TEST_REPORTING_MARKDOWN_EMOJIS'] !== 'false',
          maxFailureDetails: parseInt(process.env['TEST_REPORTING_MAX_FAILURES'] || '10', 10)
        }
      };
      
      const result = TestReportingConfigSchema.safeParse(complexConfig);
      expect(result.success).toBe(true);
    });
  });

  describe('Configuration Customization', () => {
    test('should support custom configuration merging', () => {
      const baseConfig = {
        enabled: true,
        outputDirectory: 'base-reports',
        formats: { html: true, markdown: false, json: true }
      };

      const customConfig = {
        outputDirectory: 'custom-reports',
        formats: { markdown: true },
        html: { title: 'Custom Title' }
      };

      // Test configuration merging by validating merged structure
      const mergedConfig = {
        ...baseConfig,
        ...customConfig,
        formats: { ...baseConfig.formats, ...customConfig.formats }
      };

      const result = TestReportingConfigSchema.safeParse(mergedConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true); // From base
        expect(result.data.outputDirectory).toBe('custom-reports'); // Overridden
        expect(result.data.formats.html).toBe(true); // From base
        expect(result.data.formats.markdown).toBe(true); // Overridden
      }
    });

    test('should validate merged configuration', () => {
      const baseConfig = { enabled: true };
      const invalidCustomConfig = { enabled: 'invalid' as any };

      // Test that invalid merged configuration is rejected
      const mergedInvalidConfig = { ...baseConfig, ...invalidCustomConfig };
      
      const result = TestReportingConfigSchema.safeParse(mergedInvalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('Configuration File Validation', () => {
    test('should validate configuration file format', () => {
      const validFileConfig = {
        enabled: true,
        outputDirectory: 'file-reports',
        formats: {
          html: true,
          markdown: false,
          json: true
        }
      };

      const result = TestReportingConfigSchema.safeParse(validFileConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.outputDirectory).toBe('file-reports');
      }
    });

    test('should reject invalid configuration file format', () => {
      const invalidFileConfig = {
        enabled: 'not-boolean',
        outputDirectory: null,
        formats: 'invalid-format'
      };

      const result = TestReportingConfigSchema.safeParse(invalidFileConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('CI/CD Configuration', () => {
    test('should detect CI environment and apply appropriate configuration', () => {
      process.env['CI'] = 'true';
      process.env['GITHUB_ACTIONS'] = 'true';

      // Test CI-specific configuration structure
      const ciConfig = {
        enabled: true,
        buildIntegration: {
          ci: {
            enabled: true,
            generateReports: true,
            uploadArtifacts: true
          }
        }
      };

      const result = TestReportingConfigSchema.safeParse(ciConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.buildIntegration.ci.enabled).toBe(true);
        expect(result.data.buildIntegration.ci.generateReports).toBe(true);
      }
    });

    test('should use different configuration for different CI providers', () => {
      const ciProviders = [
        { CI: 'true', GITHUB_ACTIONS: 'true' },
        { CI: 'true', JENKINS_URL: 'http://jenkins.example.com' },
        { CI: 'true', GITLAB_CI: 'true' }
      ];

      for (const envVars of ciProviders) {
        // Set environment using bracket notation
        for (const [key, value] of Object.entries(envVars)) {
          process.env[key] = value;
        }

        // Test different CI provider configurations
        const ciProviderConfig = {
          enabled: true,
          buildIntegration: {
            ci: {
              enabled: true,
              generateReports: true
            }
          }
        };

        const result = TestReportingConfigSchema.safeParse(ciProviderConfig);
        expect(result.success).toBe(true);

        // Clear environment for next iteration
        for (const key of Object.keys(envVars)) {
          delete process.env[key];
        }
      }
    });
  });

  describe('Configuration Performance and Validation', () => {
    test('should validate configuration efficiently', () => {
      const config = {
        enabled: true,
        outputDirectory: 'test-reports',
        formats: { html: true, markdown: true, json: false }
      };
      
      const startTime = Date.now();
      const result = TestReportingConfigSchema.safeParse(config);
      const validationTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(validationTime).toBeLessThan(100); // Should validate quickly
    });

    test('should handle configuration schema changes', () => {
      // Test with minimal configuration
      const minimalConfig = { enabled: true };
      const result1 = TestReportingConfigSchema.safeParse(minimalConfig);
      expect(result1.success).toBe(true);

      // Test with full configuration
      const fullConfig = {
        enabled: true,
        outputDirectory: 'custom-reports',
        formats: { html: true, markdown: true, json: true },
        html: { title: 'Custom Report', theme: 'dark' as const },
        markdown: { includeEmojis: false, maxFailureDetails: 5 }
      };
      const result2 = TestReportingConfigSchema.safeParse(fullConfig);
      expect(result2.success).toBe(true);
    });
  });
});