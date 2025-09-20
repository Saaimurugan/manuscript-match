/**
 * Configuration loader for test reporting system
 * Handles loading, validation, and merging of configuration from multiple sources
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { TestReportingConfigSchema, TestReportingConfig } from './schemas';
import { ZodError, ZodIssue } from 'zod';

export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ConfigLoadResult {
  success: boolean;
  config?: TestReportingConfig;
  errors?: ConfigValidationError[];
  warnings?: string[];
}

export class ConfigLoader {
  private static readonly DEFAULT_CONFIG_FILENAME = 'test-reporting.config.js';
  private static readonly PACKAGE_JSON_CONFIG_KEY = 'testReporting';

  /**
   * Load and validate configuration from all sources
   */
  public static async loadConfig(projectRoot?: string): Promise<ConfigLoadResult> {
    const root = projectRoot || process.cwd();
    const warnings: string[] = [];

    try {
      // 1. Load default configuration
      const defaultConfig = this.getDefaultConfig();

      // 2. Load project configuration from file
      const projectConfig = await this.loadProjectConfig(root);
      if (projectConfig.warnings) {
        warnings.push(...projectConfig.warnings);
      }

      // 3. Load configuration from package.json
      const packageConfig = await this.loadPackageJsonConfig(root);
      if (packageConfig.warnings) {
        warnings.push(...packageConfig.warnings);
      }

      // 4. Load environment variable overrides
      const envConfig = this.loadEnvironmentConfig();

      // 5. Merge configurations (defaults < project < package.json < environment)
      const mergedConfig = this.mergeConfigurations([
        defaultConfig,
        projectConfig.config || {},
        packageConfig.config || {},
        envConfig
      ]);

      // 6. Validate final configuration
      const validationResult = this.validateConfiguration(mergedConfig);
      if (!validationResult.success) {
        const result: ConfigLoadResult = {
          success: false,
          errors: validationResult.errors || []
        };
        if (warnings.length > 0) {
          result.warnings = warnings;
        }
        return result;
      }

      const result: ConfigLoadResult = {
        success: true,
        config: validationResult.config
      };
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      return result;

    } catch (error) {
      const result: ConfigLoadResult = {
        success: false,
        errors: [{
          field: 'general',
          message: `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
      if (warnings.length > 0) {
        result.warnings = warnings;
      }
      return result;
    }
  }

  /**
   * Get default configuration
   */
  private static getDefaultConfig(): Partial<TestReportingConfig> {
    return {
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
        },
        integration: {
          pattern: 'integration',
          displayName: 'Integration Tests',
          color: '#3b82f6'
        },
        e2e: {
          pattern: 'e2e',
          displayName: 'End-to-End Tests',
          color: '#8b5cf6'
        },
        performance: {
          pattern: 'performance',
          displayName: 'Performance Tests',
          color: '#f59e0b'
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
  }

  /**
   * Load project configuration from config file
   */
  private static async loadProjectConfig(projectRoot: string): Promise<{ config?: any; warnings?: string[] }> {
    const configPath = path.join(projectRoot, this.DEFAULT_CONFIG_FILENAME);
    const warnings: string[] = [];

    try {
      if (await fs.pathExists(configPath)) {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        return { config: typeof config === 'function' ? config() : config };
      } else {
        warnings.push(`Configuration file not found at ${configPath}, using defaults`);
        return { warnings };
      }
    } catch (error) {
      warnings.push(`Failed to load configuration file at ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { warnings };
    }
  }

  /**
   * Load configuration from package.json
   */
  private static async loadPackageJsonConfig(projectRoot: string): Promise<{ config?: any; warnings?: string[] }> {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const warnings: string[] = [];

    try {
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        if (packageJson[this.PACKAGE_JSON_CONFIG_KEY]) {
          return { config: packageJson[this.PACKAGE_JSON_CONFIG_KEY] };
        }
      }
      return {};
    } catch (error) {
      warnings.push(`Failed to load package.json configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { warnings };
    }
  }

  /**
   * Load environment variable overrides
   */
  private static loadEnvironmentConfig(): Partial<TestReportingConfig> {
    const env = process.env;
    const config: any = {};

    // Helper function to safely access environment variables
    const getEnv = (key: string): string | undefined => env[key];

    // General settings
    if (getEnv('TEST_REPORTING_ENABLED') !== undefined) {
      config.enabled = getEnv('TEST_REPORTING_ENABLED') !== 'false';
    }
    if (getEnv('TEST_REPORTS_DIR')) {
      config.outputDirectory = getEnv('TEST_REPORTS_DIR');
    }

    // Format settings
    if (getEnv('GENERATE_HTML_REPORTS') !== undefined || getEnv('GENERATE_MARKDOWN_REPORTS') !== undefined || getEnv('GENERATE_JSON_REPORTS') !== undefined) {
      config.formats = {};
      if (getEnv('GENERATE_HTML_REPORTS') !== undefined) {
        config.formats.html = getEnv('GENERATE_HTML_REPORTS') !== 'false';
      }
      if (getEnv('GENERATE_MARKDOWN_REPORTS') !== undefined) {
        config.formats.markdown = getEnv('GENERATE_MARKDOWN_REPORTS') !== 'false';
      }
      if (getEnv('GENERATE_JSON_REPORTS') !== undefined) {
        config.formats.json = getEnv('GENERATE_JSON_REPORTS') !== 'false';
      }
    }

    // HTML settings
    if (getEnv('PROJECT_NAME') || getEnv('HTML_THEME') || getEnv('HTML_CUSTOM_CSS') || getEnv('HTML_CUSTOM_JS')) {
      config.html = {};
      if (getEnv('PROJECT_NAME')) config.html.title = getEnv('PROJECT_NAME');
      if (getEnv('HTML_THEME')) config.html.theme = getEnv('HTML_THEME');
      if (getEnv('HTML_CUSTOM_CSS')) config.html.customCss = getEnv('HTML_CUSTOM_CSS');
      if (getEnv('HTML_CUSTOM_JS')) config.html.customJs = getEnv('HTML_CUSTOM_JS');
      if (getEnv('HTML_INCLUDE_CHARTS') !== undefined) {
        config.html.includeCharts = getEnv('HTML_INCLUDE_CHARTS') !== 'false';
      }
      if (getEnv('HTML_INCLUDE_INTERACTIVE') !== undefined) {
        config.html.includeInteractiveFeatures = getEnv('HTML_INCLUDE_INTERACTIVE') !== 'false';
      }
    }

    // Markdown settings
    if (getEnv('MARKDOWN_INCLUDE_EMOJIS') !== undefined || getEnv('MARKDOWN_INCLUDE_STACK_TRACES') !== undefined || getEnv('MARKDOWN_MAX_FAILURE_DETAILS')) {
      config.markdown = {};
      if (getEnv('MARKDOWN_INCLUDE_EMOJIS') !== undefined) {
        config.markdown.includeEmojis = getEnv('MARKDOWN_INCLUDE_EMOJIS') !== 'false';
      }
      if (getEnv('MARKDOWN_INCLUDE_STACK_TRACES') !== undefined) {
        config.markdown.includeStackTraces = getEnv('MARKDOWN_INCLUDE_STACK_TRACES') !== 'false';
      }
      if (getEnv('MARKDOWN_MAX_FAILURE_DETAILS')) {
        const maxDetails = parseInt(getEnv('MARKDOWN_MAX_FAILURE_DETAILS') || '10');
        if (!isNaN(maxDetails)) {
          config.markdown.maxFailureDetails = maxDetails;
        }
      }
    }

    // Build integration settings
    if (getEnv('AUTO_GENERATE_REPORTS') !== undefined || getEnv('FAIL_ON_REPORT_ERROR') !== undefined || getEnv('CI') !== undefined) {
      config.buildIntegration = {};
      if (getEnv('AUTO_GENERATE_REPORTS') !== undefined) {
        config.buildIntegration.autoGenerate = getEnv('AUTO_GENERATE_REPORTS') !== 'false';
      }
      if (getEnv('FAIL_ON_REPORT_ERROR') !== undefined) {
        config.buildIntegration.failOnReportError = getEnv('FAIL_ON_REPORT_ERROR') === 'true';
      }

      // CI settings
      if (getEnv('CI') !== undefined || getEnv('CI_GENERATE_REPORTS') !== undefined || getEnv('CI_UPLOAD_REPORTS') !== undefined) {
        config.buildIntegration.ci = {};
        if (getEnv('CI') !== undefined) {
          config.buildIntegration.ci.enabled = getEnv('CI') === 'true';
        }
        if (getEnv('CI_GENERATE_REPORTS') !== undefined) {
          config.buildIntegration.ci.generateReports = getEnv('CI_GENERATE_REPORTS') !== 'false';
        }
        if (getEnv('CI_UPLOAD_REPORTS') !== undefined) {
          config.buildIntegration.ci.uploadArtifacts = getEnv('CI_UPLOAD_REPORTS') === 'true';
        }
        if (getEnv('CI_FAIL_ON_REPORT_ERROR') !== undefined) {
          config.buildIntegration.ci.exitCodes = {
            reportFailure: getEnv('CI_FAIL_ON_REPORT_ERROR') === 'true' ? 1 : 0
          };
        }
      }
    }

    // Performance settings
    if (getEnv('MAX_REPORT_GENERATION_TIME') || getEnv('PARALLEL_REPORT_GENERATION') !== undefined || getEnv('MAX_REPORT_MEMORY')) {
      config.performance = {};
      if (getEnv('MAX_REPORT_GENERATION_TIME')) {
        const maxTime = parseInt(getEnv('MAX_REPORT_GENERATION_TIME') || '30000');
        if (!isNaN(maxTime)) {
          config.performance.maxGenerationTime = maxTime;
        }
      }
      if (getEnv('PARALLEL_REPORT_GENERATION') !== undefined) {
        config.performance.parallelGeneration = getEnv('PARALLEL_REPORT_GENERATION') !== 'false';
      }
      if (getEnv('MAX_REPORT_MEMORY')) {
        config.performance.maxMemoryUsage = getEnv('MAX_REPORT_MEMORY');
      }
    }

    // Error handling settings
    if (getEnv('REPORT_RETRY_ON_FAILURE') !== undefined || getEnv('REPORT_MAX_RETRIES') || getEnv('REPORT_VERBOSE_ERRORS') !== undefined) {
      config.errorHandling = {};
      if (getEnv('REPORT_RETRY_ON_FAILURE') !== undefined) {
        config.errorHandling.retryOnFailure = getEnv('REPORT_RETRY_ON_FAILURE') !== 'false';
      }
      if (getEnv('REPORT_MAX_RETRIES')) {
        const maxRetries = parseInt(getEnv('REPORT_MAX_RETRIES') || '2');
        if (!isNaN(maxRetries)) {
          config.errorHandling.maxRetries = maxRetries;
        }
      }
      if (getEnv('REPORT_VERBOSE_ERRORS') !== undefined) {
        config.errorHandling.verboseErrors = getEnv('REPORT_VERBOSE_ERRORS') === 'true';
      }
    }

    return config;
  }

  /**
   * Merge multiple configuration objects with deep merging
   */
  private static mergeConfigurations(configs: Array<Partial<TestReportingConfig>>): any {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  /**
   * Deep merge two objects
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate configuration using Zod schema
   */
  private static validateConfiguration(config: any): { success: boolean; config?: TestReportingConfig; errors?: ConfigValidationError[] } {
    try {
      const validatedConfig = TestReportingConfigSchema.parse(config);
      return {
        success: true,
        config: validatedConfig
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ConfigValidationError[] = error.issues.map((err: ZodIssue) => ({
          field: err.path.join('.'),
          message: err.message,
          value: (err as any).input
        }));
        return {
          success: false,
          errors
        };
      }

      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Format validation errors for display
   */
  public static formatValidationErrors(errors: ConfigValidationError[]): string {
    const errorMessages = errors.map(error => {
      let message = `• ${error.field}: ${error.message}`;
      if (error.value !== undefined) {
        message += ` (received: ${JSON.stringify(error.value)})`;
      }
      return message;
    });

    return `Configuration validation failed:\n${errorMessages.join('\n')}`;
  }

  /**
   * Get configuration file path
   */
  public static getConfigFilePath(projectRoot?: string): string {
    return path.join(projectRoot || process.cwd(), this.DEFAULT_CONFIG_FILENAME);
  }

  /**
   * Check if configuration file exists
   */
  public static async configFileExists(projectRoot?: string): Promise<boolean> {
    const configPath = this.getConfigFilePath(projectRoot);
    return fs.pathExists(configPath);
  }
}