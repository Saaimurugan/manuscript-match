/**
 * Configuration validation schemas for test reporting system
 * Uses Zod for runtime validation with TypeScript integration
 */

import { z } from 'zod';

// Theme options
export const ThemeSchema = z.enum(['light', 'dark', 'auto']);

// Report format options
export const ReportFormatSchema = z.enum(['html', 'markdown', 'json']);

// Test category schema
export const TestCategorySchema = z.object({
  pattern: z.string().min(1),
  displayName: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
});

// HTML configuration schema
export const HtmlConfigSchema = z.object({
  title: z.string().min(1).default('Test Report'),
  includeCharts: z.boolean().default(true),
  includeInteractiveFeatures: z.boolean().default(true),
  theme: ThemeSchema.default('light'),
  customCss: z.string().nullable().default(null),
  customJs: z.string().nullable().default(null),
  templatePath: z.string().nullable().default(null)
});

// Markdown configuration schema
export const MarkdownConfigSchema = z.object({
  includeEmojis: z.boolean().default(true),
  includeStackTraces: z.boolean().default(true),
  maxFailureDetails: z.number().int().min(0).default(10),
  includeEnvironmentInfo: z.boolean().default(true),
  templatePath: z.string().nullable().default(null)
});

// JSON configuration schema
export const JsonConfigSchema = z.object({
  pretty: z.boolean().default(true),
  includeRawData: z.boolean().default(false),
  includeMetadata: z.boolean().default(true)
});

// CI configuration schema
export const CiConfigSchema = z.object({
  enabled: z.boolean().default(false),
  generateReports: z.boolean().default(true),
  uploadArtifacts: z.boolean().default(false),
  exitCodes: z.object({
    success: z.number().int().default(0),
    testFailure: z.number().int().default(1),
    reportFailure: z.number().int().default(0)
  }).default(() => ({
    success: 0,
    testFailure: 1,
    reportFailure: 0
  }))
});

// Build integration configuration schema
export const BuildIntegrationConfigSchema = z.object({
  autoGenerate: z.boolean().default(true),
  failOnReportError: z.boolean().default(false),
  ci: CiConfigSchema.default(() => ({
    enabled: false,
    generateReports: true,
    uploadArtifacts: false,
    exitCodes: {
      success: 0,
      testFailure: 1,
      reportFailure: 0
    }
  }))
});

// Performance configuration schema
export const PerformanceConfigSchema = z.object({
  maxGenerationTime: z.number().int().min(1000).default(30000),
  parallelGeneration: z.boolean().default(true),
  maxMemoryUsage: z.string().default('100MB')
});

// Error handling configuration schema
export const ErrorHandlingConfigSchema = z.object({
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(2),
  generatePartialReports: z.boolean().default(true),
  verboseErrors: z.boolean().default(false)
});

// Coverage configuration schema
export const CoverageConfigSchema = z.object({
  thresholds: z.object({
    excellent: z.number().min(0).max(100).default(90),
    good: z.number().min(0).max(100).default(80),
    acceptable: z.number().min(0).max(100).default(60)
  }).default(() => ({
    excellent: 90,
    good: 80,
    acceptable: 60
  })),
  includeInReports: z.boolean().default(true),
  types: z.array(z.enum(['lines', 'functions', 'branches', 'statements'])).default(['lines', 'functions', 'branches', 'statements'])
});

// Notification configuration schema
export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.object({
    slack: z.object({
      enabled: z.boolean().default(false),
      webhook: z.string().url().nullable().default(null)
    }).default(() => ({
      enabled: false,
      webhook: null
    })),
    email: z.object({
      enabled: z.boolean().default(false),
      recipients: z.array(z.string().email()).default([])
    }).default(() => ({
      enabled: false,
      recipients: []
    }))
  }).default(() => ({
    slack: {
      enabled: false,
      webhook: null
    },
    email: {
      enabled: false,
      recipients: []
    }
  }))
});

// Format configuration schema
export const FormatsConfigSchema = z.object({
  html: z.boolean().default(true),
  markdown: z.boolean().default(true),
  json: z.boolean().default(false)
});

// Main configuration schema
export const TestReportingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  outputDirectory: z.string().min(1).default('test-reports'),
  formats: FormatsConfigSchema.default(() => ({
    html: true,
    markdown: true,
    json: false
  })),
  html: HtmlConfigSchema.default(() => ({
    title: 'Test Report',
    includeCharts: true,
    includeInteractiveFeatures: true,
    theme: 'light' as const,
    customCss: null,
    customJs: null,
    templatePath: null
  })),
  markdown: MarkdownConfigSchema.default(() => ({
    includeEmojis: true,
    includeStackTraces: true,
    maxFailureDetails: 10,
    includeEnvironmentInfo: true,
    templatePath: null
  })),
  json: JsonConfigSchema.default(() => ({
    pretty: true,
    includeRawData: false,
    includeMetadata: true
  })),
  buildIntegration: BuildIntegrationConfigSchema.default(() => ({
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
  })),
  performance: PerformanceConfigSchema.default(() => ({
    maxGenerationTime: 30000,
    parallelGeneration: true,
    maxMemoryUsage: '100MB'
  })),
  errorHandling: ErrorHandlingConfigSchema.default(() => ({
    retryOnFailure: true,
    maxRetries: 2,
    generatePartialReports: true,
    verboseErrors: false
  })),
  coverage: CoverageConfigSchema.default(() => ({
    thresholds: {
      excellent: 90,
      good: 80,
      acceptable: 60
    },
    includeInReports: true,
    types: ['lines', 'functions', 'branches', 'statements'] as ('lines' | 'functions' | 'branches' | 'statements')[]
  })),
  testCategories: z.record(z.string(), TestCategorySchema).default(() => ({
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
  })),
  notifications: NotificationConfigSchema.default(() => ({
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
  }))
});

// Export types
export type TestReportingConfig = z.infer<typeof TestReportingConfigSchema>;
export type HtmlConfig = z.infer<typeof HtmlConfigSchema>;
export type MarkdownConfig = z.infer<typeof MarkdownConfigSchema>;
export type JsonConfig = z.infer<typeof JsonConfigSchema>;
export type BuildIntegrationConfig = z.infer<typeof BuildIntegrationConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type ErrorHandlingConfig = z.infer<typeof ErrorHandlingConfigSchema>;
export type CoverageConfig = z.infer<typeof CoverageConfigSchema>;
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>;
export type TestCategory = z.infer<typeof TestCategorySchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type Theme = z.infer<typeof ThemeSchema>;