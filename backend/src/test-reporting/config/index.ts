/**
 * Configuration system exports
 */

export * from './schemas';
export * from './ConfigLoader';
export * from './ConfigManager';
export { TemplateManager } from '../templates/TemplateManager';

// Re-export commonly used types
export type {
  TestReportingConfig,
  HtmlConfig,
  MarkdownConfig,
  JsonConfig,
  BuildIntegrationConfig,
  PerformanceConfig,
  ErrorHandlingConfig,
  CoverageConfig,
  NotificationConfig,
  TestCategory,
  ReportFormat,
  Theme
} from './schemas';

export type {
  ConfigValidationError,
  ConfigLoadResult
} from './ConfigLoader';

export {
  ConfigurationError
} from './ConfigManager';