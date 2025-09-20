/**
 * Template manager for test reporting system
 * Handles loading and compilation of custom templates
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as MarkdownIt from 'markdown-it';

export interface TemplateContext {
  projectName: string;
  timestamp: string;
  buildInfo: any;
  summary: any;
  testSuites: any[];
  coverage: any;
  performance: any;
  environment: any;
}

export class TemplateManager {
  private static htmlTemplateCache = new Map<string, HandlebarsTemplateDelegate>();
  private static markdownTemplateCache = new Map<string, HandlebarsTemplateDelegate>();
  private static markdownIt: MarkdownIt;

  static {
    // Initialize markdown-it
    this.markdownIt = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });

    // Register Handlebars helpers
    this.registerHandlebarsHelpers();
  }

  /**
   * Get compiled HTML template
   */
  public static async getHtmlTemplate(templatePath?: string): Promise<HandlebarsTemplateDelegate> {
    const path = templatePath || this.getDefaultHtmlTemplatePath();
    
    if (this.htmlTemplateCache.has(path)) {
      return this.htmlTemplateCache.get(path)!;
    }

    const templateContent = await this.loadTemplate(path);
    const compiled = Handlebars.compile(templateContent);
    this.htmlTemplateCache.set(path, compiled);
    
    return compiled;
  }

  /**
   * Get compiled Markdown template
   */
  public static async getMarkdownTemplate(templatePath?: string): Promise<HandlebarsTemplateDelegate> {
    const path = templatePath || this.getDefaultMarkdownTemplatePath();
    
    if (this.markdownTemplateCache.has(path)) {
      return this.markdownTemplateCache.get(path)!;
    }

    const templateContent = await this.loadTemplate(path);
    const compiled = Handlebars.compile(templateContent);
    this.markdownTemplateCache.set(path, compiled);
    
    return compiled;
  }

  /**
   * Load template content from file
   */
  private static async loadTemplate(templatePath: string): Promise<string> {
    try {
      if (await fs.pathExists(templatePath)) {
        return await fs.readFile(templatePath, 'utf-8');
      } else {
        // Return default template if custom template doesn't exist
        return this.getDefaultTemplate(templatePath);
      }
    } catch (error) {
      throw new Error(`Failed to load template from ${templatePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default template based on file extension
   */
  private static getDefaultTemplate(templatePath: string): string {
    const ext = path.extname(templatePath).toLowerCase();
    
    if (ext === '.html' || ext === '.hbs') {
      return this.getDefaultHtmlTemplateContent();
    } else if (ext === '.md' || ext === '.markdown') {
      return this.getDefaultMarkdownTemplateContent();
    } else {
      throw new Error(`Unsupported template type: ${ext}`);
    }
  }

  /**
   * Get default HTML template path
   */
  private static getDefaultHtmlTemplatePath(): string {
    return path.join(__dirname, 'default-html-template.hbs');
  }

  /**
   * Get default Markdown template path
   */
  private static getDefaultMarkdownTemplatePath(): string {
    return path.join(__dirname, 'default-markdown-template.hbs');
  }

  /**
   * Get default HTML template content
   */
  private static getDefaultHtmlTemplateContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{projectName}} - Test Report</title>
    <style>
        /* Default CSS styles */
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .metadata { opacity: 0.9; margin-top: 10px; }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 30px; }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #ddd; }
        .card.passed { border-left-color: #10b981; }
        .card.failed { border-left-color: #ef4444; }
        .card.coverage { border-left-color: #3b82f6; }
        .card h3 { margin: 0 0 10px 0; color: #374151; }
        .metric { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: #10b981; transition: width 0.3s ease; }
        .test-suites { padding: 0 30px 30px; }
        .test-suite { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .suite-header { background: #f9fafb; padding: 15px; border-bottom: 1px solid #e5e7eb; cursor: pointer; }
        .suite-header:hover { background: #f3f4f6; }
        .suite-content { padding: 15px; }
        .test-table { width: 100%; border-collapse: collapse; }
        .test-table th, .test-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .test-table th { background: #f9fafb; font-weight: 600; }
        .status-passed { color: #10b981; }
        .status-failed { color: #ef4444; }
        .status-skipped { color: #f59e0b; }
        .collapsible .content { display: none; }
        .collapsible.expanded .content { display: block; }
        .toggle { float: right; transition: transform 0.2s; }
        .expanded .toggle { transform: rotate(180deg); }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>{{projectName}}</h1>
            <div class="metadata">
                Generated: {{timestamp}}<br>
                {{#if buildInfo.version}}Version: {{buildInfo.version}}<br>{{/if}}
                {{#if buildInfo.environment}}Environment: {{buildInfo.environment}}{{/if}}
            </div>
        </header>

        <section class="summary-cards">
            <div class="card {{#if (gt summary.failedTests 0)}}failed{{else}}passed{{/if}}">
                <h3>Test Results</h3>
                <div class="metric">{{summary.passedTests}}/{{summary.totalTests}}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {{summary.passRate}}%"></div>
                </div>
                <small>{{formatNumber summary.passRate 1}}% pass rate</small>
            </div>

            {{#if coverage}}
            <div class="card coverage">
                <h3>Code Coverage</h3>
                <div class="metric">{{formatNumber coverage.overall.lines.percentage 1}}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {{coverage.overall.lines.percentage}}%"></div>
                </div>
                <small>Lines covered</small>
            </div>
            {{/if}}

            <div class="card">
                <h3>Execution Time</h3>
                <div class="metric">{{formatDuration summary.executionTime}}</div>
                <small>Total duration</small>
            </div>
        </section>

        <section class="test-suites">
            <h2>Test Results by Suite</h2>
            {{#each testSuites}}
            <div class="test-suite collapsible">
                <div class="suite-header" onclick="toggleSuite(this)">
                    <strong>{{name}}</strong>
                    <span class="toggle">▼</span>
                    <div style="float: right; margin-right: 20px;">
                        <span class="status-{{status}}">{{tests.length}} tests</span>
                        {{#if duration}} • {{formatDuration duration}}{{/if}}
                    </div>
                </div>
                <div class="content">
                    <div class="suite-content">
                        <table class="test-table">
                            <thead>
                                <tr>
                                    <th>Test Name</th>
                                    <th>Status</th>
                                    <th>Duration</th>
                                    <th>Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each tests}}
                                <tr>
                                    <td>{{name}}</td>
                                    <td><span class="status-{{status}}">{{capitalize status}}</span></td>
                                    <td>{{#if duration}}{{formatDuration duration}}{{else}}-{{/if}}</td>
                                    <td>{{#if errorMessage}}{{truncate errorMessage 100}}{{else}}-{{/if}}</td>
                                </tr>
                                {{/each}}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {{/each}}
        </section>
    </div>

    <script>
        function toggleSuite(header) {
            const suite = header.parentElement;
            suite.classList.toggle('expanded');
        }

        // Auto-expand failed suites
        document.addEventListener('DOMContentLoaded', function() {
            const failedSuites = document.querySelectorAll('.test-suite');
            failedSuites.forEach(suite => {
                const hasFailures = suite.querySelector('.status-failed');
                if (hasFailures) {
                    suite.classList.add('expanded');
                }
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * Get default Markdown template content
   */
  private static getDefaultMarkdownTemplateContent(): string {
    return `# {{projectName}} Test Report

**Generated:** {{timestamp}}  
{{#if buildInfo.version}}**Version:** {{buildInfo.version}}  {{/if}}
{{#if buildInfo.environment}}**Environment:** {{buildInfo.environment}}  {{/if}}

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | {{summary.totalTests}} | - |
| Passed | {{summary.passedTests}} | {{#if (gt summary.passedTests 0)}}✅{{else}}➖{{/if}} |
| Failed | {{summary.failedTests}} | {{#if (gt summary.failedTests 0)}}❌{{else}}✅{{/if}} |
| Skipped | {{summary.skippedTests}} | {{#if (gt summary.skippedTests 0)}}⚠️{{else}}➖{{/if}} |
| Pass Rate | {{formatNumber summary.passRate 1}}% | {{#if (gte summary.passRate 90)}}✅{{else if (gte summary.passRate 70)}}⚠️{{else}}❌{{/if}} |
| Duration | {{formatDuration summary.executionTime}} | - |

{{#if coverage}}
## Coverage

| Type | Coverage | Status |
|------|----------|--------|
| Lines | {{formatNumber coverage.overall.lines.percentage 1}}% | {{coverageStatus coverage.overall.lines.percentage}} |
| Functions | {{formatNumber coverage.overall.functions.percentage 1}}% | {{coverageStatus coverage.overall.functions.percentage}} |
| Branches | {{formatNumber coverage.overall.branches.percentage 1}}% | {{coverageStatus coverage.overall.branches.percentage}} |
| Statements | {{formatNumber coverage.overall.statements.percentage 1}}% | {{coverageStatus coverage.overall.statements.percentage}} |

{{/if}}

## Test Results by Category

{{#each testSuitesByCategory}}
### {{@key}} Tests

- **Total:** {{total}}
- **Passed:** {{passed}} {{#if (gt passed 0)}}✅{{/if}}
- **Failed:** {{failed}} {{#if (gt failed 0)}}❌{{/if}}
- **Duration:** {{formatDuration duration}}

{{#if failures}}
#### Failures
{{#each failures}}
- **{{name}}:** {{errorMessage}}
{{/each}}
{{/if}}

{{/each}}

{{#if (gt summary.failedTests 0)}}
## Failed Tests Details

{{#each testSuites}}
{{#if (hasFailedTests this)}}
### {{name}}

{{#each tests}}
{{#if (eq status 'failed')}}
#### ❌ {{name}}

**Error:** {{errorMessage}}

{{#if stackTrace}}
**Stack Trace:**
\`\`\`
{{stackTrace}}
\`\`\`
{{/if}}

{{/if}}
{{/each}}

{{/if}}
{{/each}}
{{/if}}

---
*Report generated by ScholarFinder Test Reporting System*`;
  }

  /**
   * Register Handlebars helpers
   */
  private static registerHandlebarsHelpers(): void {
    // Format number helper
    Handlebars.registerHelper('formatNumber', (value: number, decimals: number = 2) => {
      return Number(value).toFixed(decimals);
    });

    // Format duration helper
    Handlebars.registerHelper('formatDuration', (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Truncate helper
    Handlebars.registerHelper('truncate', (str: string, length: number) => {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // Coverage status helper
    Handlebars.registerHelper('coverageStatus', (percentage: number) => {
      if (percentage >= 90) return '✅';
      if (percentage >= 80) return '⚠️';
      if (percentage >= 60) return '🔶';
      return '❌';
    });

    // Greater than helper
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);

    // Greater than or equal helper
    Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);

    // Equality helper
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Has failed tests helper
    Handlebars.registerHelper('hasFailedTests', (suite: any) => {
      return suite.tests && suite.tests.some((test: any) => test.status === 'failed');
    });

    // If helper with condition
    Handlebars.registerHelper('if', function(conditional: any, options: any) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });
  }

  /**
   * Clear template cache
   */
  public static clearCache(): void {
    this.htmlTemplateCache.clear();
    this.markdownTemplateCache.clear();
  }

  /**
   * Render HTML template with context
   */
  public static async renderHtml(context: TemplateContext, templatePath?: string): Promise<string> {
    const template = await this.getHtmlTemplate(templatePath);
    return template(context);
  }

  /**
   * Render Markdown template with context
   */
  public static async renderMarkdown(context: TemplateContext, templatePath?: string): Promise<string> {
    const template = await this.getMarkdownTemplate(templatePath);
    return template(context);
  }

  /**
   * Process markdown content to HTML
   */
  public static processMarkdown(markdown: string): string {
    return this.markdownIt.render(markdown);
  }
}