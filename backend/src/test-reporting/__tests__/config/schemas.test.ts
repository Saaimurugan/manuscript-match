/**
 * Unit tests for configuration schemas
 */

import { 
  TestReportingConfigSchema,
  HtmlConfigSchema,
  MarkdownConfigSchema,
  JsonConfigSchema,
  PerformanceConfigSchema,
  ErrorHandlingConfigSchema,
  CoverageConfigSchema,
  NotificationConfigSchema,
  TestCategorySchema,
  ReportFormatSchema,
  ThemeSchema
} from '../../config/schemas';

describe('Configuration Schemas', () => {
  describe('ThemeSchema', () => {
    it('should accept valid themes', () => {
      expect(ThemeSchema.parse('light')).toBe('light');
      expect(ThemeSchema.parse('dark')).toBe('dark');
      expect(ThemeSchema.parse('auto')).toBe('auto');
    });

    it('should reject invalid themes', () => {
      expect(() => ThemeSchema.parse('invalid')).toThrow();
      expect(() => ThemeSchema.parse('')).toThrow();
      expect(() => ThemeSchema.parse(123)).toThrow();
    });
  });

  describe('ReportFormatSchema', () => {
    it('should accept valid formats', () => {
      expect(ReportFormatSchema.parse('html')).toBe('html');
      expect(ReportFormatSchema.parse('markdown')).toBe('markdown');
      expect(ReportFormatSchema.parse('json')).toBe('json');
    });

    it('should reject invalid formats', () => {
      expect(() => ReportFormatSchema.parse('xml')).toThrow();
      expect(() => ReportFormatSchema.parse('')).toThrow();
    });
  });

  describe('TestCategorySchema', () => {
    it('should accept valid test category', () => {
      const validCategory = {
        pattern: 'unit',
        displayName: 'Unit Tests',
        color: '#10b981'
      };

      const result = TestCategorySchema.parse(validCategory);
      expect(result).toEqual(validCategory);
    });

    it('should reject invalid color format', () => {
      const invalidCategory = {
        pattern: 'unit',
        displayName: 'Unit Tests',
        color: 'red' // Invalid hex color
      };

      expect(() => TestCategorySchema.parse(invalidCategory)).toThrow();
    });

    it('should reject empty pattern or displayName', () => {
      expect(() => TestCategorySchema.parse({
        pattern: '',
        displayName: 'Unit Tests',
        color: '#10b981'
      })).toThrow();

      expect(() => TestCategorySchema.parse({
        pattern: 'unit',
        displayName: '',
        color: '#10b981'
      })).toThrow();
    });
  });

  describe('HtmlConfigSchema', () => {
    it('should accept valid HTML config', () => {
      const validConfig = {
        title: 'Test Report',
        includeCharts: true,
        includeInteractiveFeatures: false,
        theme: 'dark',
        customCss: '/path/to/custom.css',
        customJs: '/path/to/custom.js',
        templatePath: '/path/to/template.hbs'
      };

      const result = HtmlConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults for missing values', () => {
      const result = HtmlConfigSchema.parse({});
      
      expect(result.title).toBe('Test Report');
      expect(result.includeCharts).toBe(true);
      expect(result.includeInteractiveFeatures).toBe(true);
      expect(result.theme).toBe('light');
      expect(result.customCss).toBeNull();
      expect(result.customJs).toBeNull();
      expect(result.templatePath).toBeNull();
    });

    it('should reject empty title', () => {
      expect(() => HtmlConfigSchema.parse({ title: '' })).toThrow();
    });
  });

  describe('MarkdownConfigSchema', () => {
    it('should accept valid Markdown config', () => {
      const validConfig = {
        includeEmojis: false,
        includeStackTraces: true,
        maxFailureDetails: 5,
        includeEnvironmentInfo: false,
        templatePath: '/path/to/template.md'
      };

      const result = MarkdownConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = MarkdownConfigSchema.parse({});
      
      expect(result.includeEmojis).toBe(true);
      expect(result.includeStackTraces).toBe(true);
      expect(result.maxFailureDetails).toBe(10);
      expect(result.includeEnvironmentInfo).toBe(true);
      expect(result.templatePath).toBeNull();
    });

    it('should reject negative maxFailureDetails', () => {
      expect(() => MarkdownConfigSchema.parse({ maxFailureDetails: -1 })).toThrow();
    });
  });

  describe('JsonConfigSchema', () => {
    it('should accept valid JSON config', () => {
      const validConfig = {
        pretty: false,
        includeRawData: true,
        includeMetadata: false
      };

      const result = JsonConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = JsonConfigSchema.parse({});
      
      expect(result.pretty).toBe(true);
      expect(result.includeRawData).toBe(false);
      expect(result.includeMetadata).toBe(true);
    });
  });

  describe('PerformanceConfigSchema', () => {
    it('should accept valid performance config', () => {
      const validConfig = {
        maxGenerationTime: 60000,
        parallelGeneration: false,
        maxMemoryUsage: '200MB'
      };

      const result = PerformanceConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = PerformanceConfigSchema.parse({});
      
      expect(result.maxGenerationTime).toBe(30000);
      expect(result.parallelGeneration).toBe(true);
      expect(result.maxMemoryUsage).toBe('100MB');
    });

    it('should reject maxGenerationTime less than 1000ms', () => {
      expect(() => PerformanceConfigSchema.parse({ maxGenerationTime: 500 })).toThrow();
    });
  });

  describe('ErrorHandlingConfigSchema', () => {
    it('should accept valid error handling config', () => {
      const validConfig = {
        retryOnFailure: false,
        maxRetries: 5,
        generatePartialReports: false,
        verboseErrors: true
      };

      const result = ErrorHandlingConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = ErrorHandlingConfigSchema.parse({});
      
      expect(result.retryOnFailure).toBe(true);
      expect(result.maxRetries).toBe(2);
      expect(result.generatePartialReports).toBe(true);
      expect(result.verboseErrors).toBe(false);
    });

    it('should reject invalid maxRetries', () => {
      expect(() => ErrorHandlingConfigSchema.parse({ maxRetries: -1 })).toThrow();
      expect(() => ErrorHandlingConfigSchema.parse({ maxRetries: 11 })).toThrow();
    });
  });

  describe('CoverageConfigSchema', () => {
    it('should accept valid coverage config', () => {
      const validConfig = {
        thresholds: {
          excellent: 95,
          good: 85,
          acceptable: 70
        },
        includeInReports: false,
        types: ['lines', 'functions']
      };

      const result = CoverageConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = CoverageConfigSchema.parse({});
      
      expect(result.thresholds.excellent).toBe(90);
      expect(result.thresholds.good).toBe(80);
      expect(result.thresholds.acceptable).toBe(60);
      expect(result.includeInReports).toBe(true);
      expect(result.types).toEqual(['lines', 'functions', 'branches', 'statements']);
    });

    it('should reject invalid threshold values', () => {
      expect(() => CoverageConfigSchema.parse({
        thresholds: { excellent: 101 }
      })).toThrow();

      expect(() => CoverageConfigSchema.parse({
        thresholds: { good: -1 }
      })).toThrow();
    });
  });

  describe('NotificationConfigSchema', () => {
    it('should accept valid notification config', () => {
      const validConfig = {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhook: 'https://hooks.slack.com/services/test'
          },
          email: {
            enabled: true,
            recipients: ['test@example.com', 'admin@example.com']
          }
        }
      };

      const result = NotificationConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults', () => {
      const result = NotificationConfigSchema.parse({});
      
      expect(result.enabled).toBe(false);
      expect(result.channels.slack.enabled).toBe(false);
      expect(result.channels.slack.webhook).toBeNull();
      expect(result.channels.email.enabled).toBe(false);
      expect(result.channels.email.recipients).toEqual([]);
    });

    it('should reject invalid email addresses', () => {
      expect(() => NotificationConfigSchema.parse({
        channels: {
          email: {
            recipients: ['invalid-email']
          }
        }
      })).toThrow();
    });

    it('should reject invalid webhook URL', () => {
      expect(() => NotificationConfigSchema.parse({
        channels: {
          slack: {
            webhook: 'not-a-url'
          }
        }
      })).toThrow();
    });
  });

  describe('TestReportingConfigSchema', () => {
    it('should accept complete valid configuration', () => {
      const validConfig = {
        enabled: true,
        outputDirectory: 'custom-reports',
        formats: {
          html: true,
          markdown: false,
          json: true
        },
        html: {
          title: 'Custom Report',
          theme: 'dark'
        },
        markdown: {
          includeEmojis: false
        },
        json: {
          pretty: false
        },
        buildIntegration: {
          autoGenerate: false,
          ci: {
            enabled: true
          }
        },
        performance: {
          maxGenerationTime: 45000
        },
        errorHandling: {
          maxRetries: 3
        },
        coverage: {
          thresholds: {
            excellent: 95,
            good: 85,
            acceptable: 70
          }
        },
        testCategories: {
          unit: {
            pattern: 'unit',
            displayName: 'Unit Tests',
            color: '#10b981'
          }
        },
        notifications: {
          enabled: false
        }
      };

      const result = TestReportingConfigSchema.parse(validConfig);
      expect(result.enabled).toBe(true);
      expect(result.outputDirectory).toBe('custom-reports');
      expect(result.html.title).toBe('Custom Report');
      expect(result.html.theme).toBe('dark');
    });

    it('should apply all defaults for empty configuration', () => {
      const result = TestReportingConfigSchema.parse({});
      
      expect(result.enabled).toBe(true);
      expect(result.outputDirectory).toBe('test-reports');
      expect(result.formats.html).toBe(true);
      expect(result.formats.markdown).toBe(true);
      expect(result.formats.json).toBe(false);
      expect(result.html.title).toBe('Test Report');
      expect(result.markdown.includeEmojis).toBe(true);
      expect(result.json.pretty).toBe(true);
      expect(result.buildIntegration.autoGenerate).toBe(true);
      expect(result.performance.maxGenerationTime).toBe(30000);
      expect(result.errorHandling.retryOnFailure).toBe(true);
      expect(result.coverage.includeInReports).toBe(true);
      expect(result.notifications.enabled).toBe(false);
      
      // Check default test categories
      expect(result.testCategories['unit']).toBeDefined();
      expect(result.testCategories['integration']).toBeDefined();
      expect(result.testCategories['e2e']).toBeDefined();
      expect(result.testCategories['performance']).toBeDefined();
    });

    it('should reject invalid top-level configuration', () => {
      expect(() => TestReportingConfigSchema.parse({
        enabled: 'not-boolean'
      })).toThrow();

      expect(() => TestReportingConfigSchema.parse({
        outputDirectory: ''
      })).toThrow();
    });
  });
});