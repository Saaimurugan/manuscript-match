/**
 * Unit tests for ConfigLoader
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigLoader } from '../../config/ConfigLoader';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = {
  pathExists: jest.fn(),
  readJson: jest.fn()
} as any;

describe('ConfigLoader', () => {
  const mockProjectRoot = '/test/project';
  const mockConfigPath = path.join(mockProjectRoot, 'test-reporting.config.js');
  const mockPackageJsonPath = path.join(mockProjectRoot, 'package.json');

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear require cache
    Object.keys(require.cache).forEach(key => {
      if (key.includes('test-reporting.config.js')) {
        delete require.cache[key];
      }
    });
    // Clear environment variables
    delete process.env['TEST_REPORTING_ENABLED'];
    delete process.env['TEST_REPORTS_DIR'];
    delete process.env['GENERATE_HTML_REPORTS'];
    delete process.env['PROJECT_NAME'];
    delete process.env['CI'];
  });

  describe('loadConfig', () => {
    it('should load default configuration when no config file exists', async () => {
      mockFs.pathExists.mockResolvedValue(false);

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config!.enabled).toBe(true);
      expect(result.config!.outputDirectory).toBe('test-reports');
      expect(result.config!.formats.html).toBe(true);
      expect(result.config!.formats.markdown).toBe(true);
      expect(result.config!.formats.json).toBe(false);
    });

    it('should load and merge project configuration', async () => {
      const projectConfig = {
        enabled: false,
        outputDirectory: 'custom-reports',
        html: {
          title: 'Custom Title'
        }
      };

      mockFs.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath === mockConfigPath);
      });

      // Mock require to return our test config
      jest.doMock(mockConfigPath, () => projectConfig, { virtual: true });

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.config!.enabled).toBe(false);
      expect(result.config!.outputDirectory).toBe('custom-reports');
      expect(result.config!.html.title).toBe('Custom Title');
      // Should still have defaults for unspecified values
      expect(result.config!.html.includeCharts).toBe(true);
    });

    it('should load configuration from package.json', async () => {
      const packageJson = {
        name: 'test-project',
        testReporting: {
          enabled: false,
          formats: {
            json: true
          }
        }
      };

      mockFs.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath === mockPackageJsonPath);
      });
      mockFs.readJson.mockResolvedValue(packageJson);

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.config!.enabled).toBe(false);
      expect(result.config!.formats.json).toBe(true);
    });

    it('should apply environment variable overrides', async () => {
      process.env['TEST_REPORTING_ENABLED'] = 'false';
      process.env['TEST_REPORTS_DIR'] = 'env-reports';
      process.env['PROJECT_NAME'] = 'Env Project';
      process.env['GENERATE_HTML_REPORTS'] = 'false';
      process.env['CI'] = 'true';

      mockFs.pathExists.mockResolvedValue(false);

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.config!.enabled).toBe(false);
      expect(result.config!.outputDirectory).toBe('env-reports');
      expect(result.config!.html.title).toBe('Env Project');
      expect(result.config!.formats.html).toBe(false);
      expect(result.config!.buildIntegration.ci.enabled).toBe(true);
    });

    it('should merge configurations in correct order', async () => {
      // Project config
      const projectConfig = {
        outputDirectory: 'project-reports',
        html: {
          title: 'Project Title',
          theme: 'dark'
        }
      };

      // Package.json config
      const packageJson = {
        testReporting: {
          outputDirectory: 'package-reports',
          html: {
            title: 'Package Title'
          },
          formats: {
            json: true
          }
        }
      };

      // Environment variables
      process.env['TEST_REPORTS_DIR'] = 'env-reports';

      mockFs.pathExists.mockImplementation(() => {
        return Promise.resolve(true);
      });
      mockFs.readJson.mockResolvedValue(packageJson);
      jest.doMock(mockConfigPath, () => projectConfig, { virtual: true });

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      // Environment should override everything
      expect(result.config!.outputDirectory).toBe('env-reports');
      // Package.json should override project config
      expect(result.config!.html.title).toBe('Package Title');
      expect(result.config!.formats.json).toBe(true);
      // Project config should override defaults
      expect(result.config!.html.theme).toBe('dark');
    });

    it('should handle configuration file loading errors gracefully', async () => {
      mockFs.pathExists.mockImplementation((filePath: string) => {
        if (filePath === mockConfigPath) {
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      });

      // Mock require to throw an error
      jest.doMock(mockConfigPath, () => {
        throw new Error('Syntax error in config file');
      }, { virtual: true });

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('Failed to load configuration file'));
    });

    it('should handle package.json loading errors gracefully', async () => {
      mockFs.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath === mockPackageJsonPath);
      });
      mockFs.readJson.mockRejectedValue(new Error('Invalid JSON'));

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('Failed to load package.json configuration'));
    });

    it('should validate configuration and return errors for invalid config', async () => {
      const invalidConfig = {
        enabled: 'not-a-boolean',
        outputDirectory: '',
        html: {
          theme: 'invalid-theme'
        }
      };

      mockFs.pathExists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath === mockConfigPath);
      });
      jest.doMock(mockConfigPath, () => invalidConfig, { virtual: true });

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle numeric environment variables correctly', async () => {
      process.env['MARKDOWN_MAX_FAILURE_DETAILS'] = '5';
      process.env['MAX_REPORT_GENERATION_TIME'] = '60000';
      process.env['REPORT_MAX_RETRIES'] = '3';

      mockFs.pathExists.mockResolvedValue(false);

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      expect(result.config!.markdown.maxFailureDetails).toBe(5);
      expect(result.config!.performance.maxGenerationTime).toBe(60000);
      expect(result.config!.errorHandling.maxRetries).toBe(3);
    });

    it('should handle invalid numeric environment variables gracefully', async () => {
      process.env['MARKDOWN_MAX_FAILURE_DETAILS'] = 'not-a-number';
      process.env['MAX_REPORT_GENERATION_TIME'] = 'invalid';

      mockFs.pathExists.mockResolvedValue(false);

      const result = await ConfigLoader.loadConfig(mockProjectRoot);

      expect(result.success).toBe(true);
      // Should use defaults for invalid numeric values
      expect(result.config!.markdown.maxFailureDetails).toBe(10);
      expect(result.config!.performance.maxGenerationTime).toBe(30000);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        {
          field: 'enabled',
          message: 'Expected boolean, received string',
          value: 'not-a-boolean'
        },
        {
          field: 'outputDirectory',
          message: 'String must contain at least 1 character(s)'
        }
      ];

      const formatted = ConfigLoader.formatValidationErrors(errors);

      expect(formatted).toContain('Configuration validation failed:');
      expect(formatted).toContain('• enabled: Expected boolean, received string (received: "not-a-boolean")');
      expect(formatted).toContain('• outputDirectory: String must contain at least 1 character(s)');
    });
  });

  describe('getConfigFilePath', () => {
    it('should return correct config file path', () => {
      const filePath = ConfigLoader.getConfigFilePath('/test/project');
      expect(filePath).toBe('/test/project/test-reporting.config.js');
    });

    it('should use current working directory when no project root provided', () => {
      const originalCwd = process.cwd();
      const mockCwd = '/current/dir';
      jest.spyOn(process, 'cwd').mockReturnValue(mockCwd);

      const filePath = ConfigLoader.getConfigFilePath();
      expect(filePath).toBe(path.join(mockCwd, 'test-reporting.config.js'));

      process.cwd = jest.fn().mockReturnValue(originalCwd);
    });
  });

  describe('configFileExists', () => {
    it('should check if config file exists', async () => {
      mockFs.pathExists.mockResolvedValue(true);

      const exists = await ConfigLoader.configFileExists(mockProjectRoot);

      expect(exists).toBe(true);
      expect(mockFs.pathExists).toHaveBeenCalledWith(mockConfigPath);
    });
  });
});