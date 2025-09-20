/**
 * Configuration manager for test reporting system
 * Provides a singleton interface for accessing validated configuration
 */

import { ConfigLoader, ConfigLoadResult, ConfigValidationError } from './ConfigLoader';
import { TestReportingConfig } from './schemas';

export class ConfigurationError extends Error {
  public readonly errors: ConfigValidationError[];

  constructor(message: string, errors: ConfigValidationError[]) {
    super(message);
    this.name = 'ConfigurationError';
    this.errors = errors;
  }
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: TestReportingConfig | null = null;
  private loadPromise: Promise<TestReportingConfig> | null = null;
  private warnings: string[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration
   */
  public async loadConfig(projectRoot?: string, force = false): Promise<TestReportingConfig> {
    // Return existing config if already loaded and not forcing reload
    if (this.config && !force) {
      return this.config;
    }

    // Return existing load promise if already loading
    if (this.loadPromise && !force) {
      return this.loadPromise;
    }

    // Start loading configuration
    this.loadPromise = this.doLoadConfig(projectRoot);
    
    try {
      this.config = await this.loadPromise;
      return this.config;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Internal configuration loading logic
   */
  private async doLoadConfig(projectRoot?: string): Promise<TestReportingConfig> {
    const result: ConfigLoadResult = await ConfigLoader.loadConfig(projectRoot);

    if (!result.success || !result.config) {
      const errorMessage = result.errors 
        ? ConfigLoader.formatValidationErrors(result.errors)
        : 'Unknown configuration error';
      
      throw new ConfigurationError(errorMessage, result.errors || []);
    }

    // Store warnings
    this.warnings = result.warnings || [];

    return result.config;
  }

  /**
   * Get current configuration (throws if not loaded)
   */
  public getConfig(): TestReportingConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get configuration safely (returns null if not loaded)
   */
  public getConfigSafe(): TestReportingConfig | null {
    return this.config;
  }

  /**
   * Check if configuration is loaded
   */
  public isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Get configuration warnings
   */
  public getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Clear loaded configuration (useful for testing)
   */
  public clearConfig(): void {
    this.config = null;
    this.loadPromise = null;
    this.warnings = [];
  }

  /**
   * Reload configuration
   */
  public async reloadConfig(projectRoot?: string): Promise<TestReportingConfig> {
    return this.loadConfig(projectRoot, true);
  }

  /**
   * Get specific configuration section
   */
  public getHtmlConfig() {
    return this.getConfig().html;
  }

  public getMarkdownConfig() {
    return this.getConfig().markdown;
  }

  public getJsonConfig() {
    return this.getConfig().json;
  }

  public getBuildIntegrationConfig() {
    return this.getConfig().buildIntegration;
  }

  public getPerformanceConfig() {
    return this.getConfig().performance;
  }

  public getErrorHandlingConfig() {
    return this.getConfig().errorHandling;
  }

  public getCoverageConfig() {
    return this.getConfig().coverage;
  }

  public getTestCategories() {
    return this.getConfig().testCategories;
  }

  public getNotificationConfig() {
    return this.getConfig().notifications;
  }

  /**
   * Check if reporting is enabled
   */
  public isReportingEnabled(): boolean {
    return this.getConfigSafe()?.enabled ?? true;
  }

  /**
   * Get output directory
   */
  public getOutputDirectory(): string {
    return this.getConfig().outputDirectory;
  }

  /**
   * Get enabled report formats
   */
  public getEnabledFormats(): string[] {
    const formats = this.getConfig().formats;
    const enabled: string[] = [];
    
    if (formats.html) enabled.push('html');
    if (formats.markdown) enabled.push('markdown');
    if (formats.json) enabled.push('json');
    
    return enabled;
  }

  /**
   * Check if specific format is enabled
   */
  public isFormatEnabled(format: 'html' | 'markdown' | 'json'): boolean {
    return this.getConfig().formats[format];
  }

  /**
   * Check if running in CI mode
   */
  public isCiMode(): boolean {
    return this.getConfig().buildIntegration.ci.enabled;
  }

  /**
   * Validate configuration without loading
   */
  public static async validateConfig(projectRoot?: string): Promise<ConfigLoadResult> {
    return ConfigLoader.loadConfig(projectRoot);
  }

  /**
   * Get configuration file path
   */
  public static getConfigFilePath(projectRoot?: string): string {
    return ConfigLoader.getConfigFilePath(projectRoot);
  }

  /**
   * Check if configuration file exists
   */
  public static async configFileExists(projectRoot?: string): Promise<boolean> {
    return ConfigLoader.configFileExists(projectRoot);
  }
}