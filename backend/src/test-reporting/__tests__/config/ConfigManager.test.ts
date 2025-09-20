/**
 * Unit tests for ConfigManager
 */

import { ConfigManager, ConfigurationError } from '../../config/ConfigManager';
import { ConfigLoader } from '../../config/ConfigLoader';
import { TestReportingConfig } from '../../config/schemas';

// Mock ConfigLoader
jest.mock('../../config/ConfigLoader');
const mockConfigLoader = ConfigLoader as jest.Mocked<typeof ConfigLoader>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockConfig: TestReportingConfig = {
    enabled: true,
    outputDirectory: 'test-reports',
    formats: {
      html: true,
      markdown: true,
      json: false
    },
    html: {
      title: 'Test Report',
      includeCharts: true,
      includeInteractiveFeatures: true,
      theme: 'light',
      customCss: null,
      customJs: null,
      templatePath: null
    },
    markdown: {
      includeEmojis: true,
      includeStackTraces: true,
      maxFailureDetails: 10,
      includeEnvironmentInfo: true,
      templatePath: null
    },
    json: {
      pretty: true,
      includeRawData: false,
      includeMetadata: true
    },
    buildIntegration: {
      autoGenerate: true,
      failOnReportError: false,
      ci: {
        enabled: false,
        generateReports: true,
        uploadArtifacts: false,
        exitCodes: {
          success: 0,
          testFailure: 1,
          reportFailure: 0
        }
      }
    },
    performance: {
      maxGenerationTime: 30000,
      parallelGeneration: true,
      maxMemoryUsage: '100MB'
    },
    errorHandling: {
      retryOnFailure: true,
      maxRetries: 2,
      generatePartialReports: true,
      verboseErrors: false
    },
    coverage: {
      thresholds: {
        excellent: 90,
        good: 80,
        acceptable: 60
      },
      includeInReports: true,
      types: ['lines', 'functions', 'branches', 'statements']
    },
    testCategories: {
      unit: {
        pattern: 'unit',
        displayName: 'Unit Tests',
        color: '#10b981'
      }
    },
    notifications: {
      enabled: false,
      channels: {
        slack: {
          enabled: false,
          webhook: null
        },
        email: {
          enabled: false,
          recipients: []
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance for each test
    configManager = ConfigManager.getInstance();
    configManager.clearConfig();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration successfully', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      const config = await configManager.loadConfig();

      expect(config).toEqual(mockConfig);
      expect(configManager.isLoaded()).toBe(true);
      expect(mockConfigLoader.loadConfig).toHaveBeenCalledWith(undefined);
    });

    it('should load configuration with project root', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      const projectRoot = '/test/project';
      await configManager.loadConfig(projectRoot);

      expect(mockConfigLoader.loadConfig).toHaveBeenCalledWith(projectRoot);
    });

    it('should return cached config on subsequent calls', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      const config1 = await configManager.loadConfig();
      const config2 = await configManager.loadConfig();

      expect(config1).toBe(config2);
      expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(1);
    });

    it('should force reload when requested', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      await configManager.loadConfig();
      await configManager.loadConfig('/test', true);

      expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent load requests', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      const promise1 = configManager.loadConfig();
      const promise2 = configManager.loadConfig();

      const [config1, config2] = await Promise.all([promise1, promise2]);

      expect(config1).toBe(config2);
      expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(1);
    });

    it('should throw ConfigurationError on load failure', async () => {
      const errors = [
        { field: 'enabled', message: 'Invalid value' }
      ];
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: false,
        errors
      });
      mockConfigLoader.formatValidationErrors.mockReturnValue('Formatted error message');

      await expect(configManager.loadConfig()).rejects.toThrow(ConfigurationError);
      expect(configManager.isLoaded()).toBe(false);
    });

    it('should store warnings from successful load', async () => {
      const warnings = ['Warning 1', 'Warning 2'];
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig,
        warnings
      });

      await configManager.loadConfig();

      expect(configManager.getWarnings()).toEqual(warnings);
    });
  });

  describe('getConfig', () => {
    it('should return config when loaded', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      await configManager.loadConfig();
      const config = configManager.getConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should throw error when config not loaded', () => {
      expect(() => configManager.getConfig()).toThrow('Configuration not loaded');
    });
  });

  describe('getConfigSafe', () => {
    it('should return config when loaded', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      await configManager.loadConfig();
      const config = configManager.getConfigSafe();

      expect(config).toEqual(mockConfig);
    });

    it('should return null when config not loaded', () => {
      const config = configManager.getConfigSafe();
      expect(config).toBeNull();
    });
  });

  describe('configuration section getters', () => {
    beforeEach(async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });
      await configManager.loadConfig();
    });

    it('should get HTML config', () => {
      expect(configManager.getHtmlConfig()).toEqual(mockConfig.html);
    });

    it('should get Markdown config', () => {
      expect(configManager.getMarkdownConfig()).toEqual(mockConfig.markdown);
    });

    it('should get JSON config', () => {
      expect(configManager.getJsonConfig()).toEqual(mockConfig.json);
    });

    it('should get build integration config', () => {
      expect(configManager.getBuildIntegrationConfig()).toEqual(mockConfig.buildIntegration);
    });

    it('should get performance config', () => {
      expect(configManager.getPerformanceConfig()).toEqual(mockConfig.performance);
    });

    it('should get error handling config', () => {
      expect(configManager.getErrorHandlingConfig()).toEqual(mockConfig.errorHandling);
    });

    it('should get coverage config', () => {
      expect(configManager.getCoverageConfig()).toEqual(mockConfig.coverage);
    });

    it('should get test categories', () => {
      expect(configManager.getTestCategories()).toEqual(mockConfig.testCategories);
    });

    it('should get notification config', () => {
      expect(configManager.getNotificationConfig()).toEqual(mockConfig.notifications);
    });
  });

  describe('utility methods', () => {
    beforeEach(async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });
      await configManager.loadConfig();
    });

    it('should check if reporting is enabled', () => {
      expect(configManager.isReportingEnabled()).toBe(true);
    });

    it('should get output directory', () => {
      expect(configManager.getOutputDirectory()).toBe('test-reports');
    });

    it('should get enabled formats', () => {
      const formats = configManager.getEnabledFormats();
      expect(formats).toEqual(['html', 'markdown']);
    });

    it('should check if specific format is enabled', () => {
      expect(configManager.isFormatEnabled('html')).toBe(true);
      expect(configManager.isFormatEnabled('markdown')).toBe(true);
      expect(configManager.isFormatEnabled('json')).toBe(false);
    });

    it('should check CI mode', () => {
      expect(configManager.isCiMode()).toBe(false);
    });
  });

  describe('utility methods without loaded config', () => {
    it('should return default for isReportingEnabled when config not loaded', () => {
      expect(configManager.isReportingEnabled()).toBe(true);
    });
  });

  describe('clearConfig', () => {
    it('should clear loaded configuration', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      await configManager.loadConfig();
      expect(configManager.isLoaded()).toBe(true);

      configManager.clearConfig();
      expect(configManager.isLoaded()).toBe(false);
      expect(configManager.getWarnings()).toEqual([]);
    });
  });

  describe('reloadConfig', () => {
    it('should force reload configuration', async () => {
      mockConfigLoader.loadConfig.mockResolvedValue({
        success: true,
        config: mockConfig
      });

      await configManager.loadConfig();
      await configManager.reloadConfig();

      expect(mockConfigLoader.loadConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('static methods', () => {
    it('should validate config without loading', async () => {
      const result = { success: true, config: mockConfig };
      mockConfigLoader.loadConfig.mockResolvedValue(result);

      const validationResult = await ConfigManager.validateConfig('/test');

      expect(validationResult).toEqual(result);
      expect(mockConfigLoader.loadConfig).toHaveBeenCalledWith('/test');
    });

    it('should get config file path', () => {
      mockConfigLoader.getConfigFilePath.mockReturnValue('/test/test-reporting.config.js');

      const path = ConfigManager.getConfigFilePath('/test');

      expect(path).toBe('/test/test-reporting.config.js');
      expect(mockConfigLoader.getConfigFilePath).toHaveBeenCalledWith('/test');
    });

    it('should check if config file exists', async () => {
      mockConfigLoader.configFileExists.mockResolvedValue(true);

      const exists = await ConfigManager.configFileExists('/test');

      expect(exists).toBe(true);
      expect(mockConfigLoader.configFileExists).toHaveBeenCalledWith('/test');
    });
  });
});