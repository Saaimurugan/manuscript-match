/**
 * Unit tests for TemplateManager
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { TemplateManager, TemplateContext } from '../../templates/TemplateManager';

// Mock fs-extra
jest.mock('fs-extra');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('TemplateManager', () => {
  const mockContext: TemplateContext = {
    projectName: 'Test Project',
    timestamp: '2024-01-01T12:00:00Z',
    buildInfo: {
      version: '1.0.0',
      environment: 'test'
    },
    summary: {
      totalTests: 100,
      passedTests: 95,
      failedTests: 5,
      skippedTests: 0,
      passRate: 95,
      executionTime: 5000
    },
    testSuites: [
      {
        name: 'Unit Tests',
        status: 'passed',
        duration: 2000,
        tests: [
          {
            name: 'should pass',
            status: 'passed',
            duration: 100
          },
          {
            name: 'should fail',
            status: 'failed',
            duration: 150,
            errorMessage: 'Test failed',
            stackTrace: 'Error stack trace'
          }
        ]
      }
    ],
    coverage: {
      overall: {
        lines: { percentage: 85, total: 100, covered: 85 },
        functions: { percentage: 90, total: 50, covered: 45 },
        branches: { percentage: 80, total: 40, covered: 32 },
        statements: { percentage: 88, total: 120, covered: 106 }
      }
    },
    performance: {
      averageResponseTime: 150,
      maxResponseTime: 500
    },
    environment: {
      nodeVersion: '18.0.0',
      platform: 'linux'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TemplateManager.clearCache();
  });

  describe('getHtmlTemplate', () => {
    it('should return cached template on subsequent calls', async () => {
      const customTemplatePath = '/custom/template.hbs';
      const templateContent = '<html>{{projectName}}</html>';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template1 = await TemplateManager.getHtmlTemplate(customTemplatePath);
      const template2 = await TemplateManager.getHtmlTemplate(customTemplatePath);

      expect(template1).toBe(template2);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should load custom template when file exists', async () => {
      const customTemplatePath = '/custom/template.hbs';
      const templateContent = '<html>{{projectName}}</html>';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate(customTemplatePath);
      const result = template(mockContext);

      expect(result).toContain('Test Project');
      expect(mockFs.pathExists).toHaveBeenCalledWith(customTemplatePath);
      expect(mockFs.readFile).toHaveBeenCalledWith(customTemplatePath, 'utf-8');
    });

    it('should use default template when custom file does not exist', async () => {
      const customTemplatePath = '/custom/template.hbs';

      mockFs.pathExists.mockResolvedValue(false);

      const template = await TemplateManager.getHtmlTemplate(customTemplatePath);
      const result = template(mockContext);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Project');
    });

    it('should use default template when no path provided', async () => {
      const template = await TemplateManager.getHtmlTemplate();
      const result = template(mockContext);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Project');
    });

    it('should throw error when template loading fails', async () => {
      const customTemplatePath = '/custom/template.hbs';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockRejectedValue(new Error('File read error'));

      await expect(TemplateManager.getHtmlTemplate(customTemplatePath))
        .rejects.toThrow('Failed to load template from /custom/template.hbs: File read error');
    });
  });

  describe('getMarkdownTemplate', () => {
    it('should return cached template on subsequent calls', async () => {
      const customTemplatePath = '/custom/template.md';
      const templateContent = '# {{projectName}}';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template1 = await TemplateManager.getMarkdownTemplate(customTemplatePath);
      const template2 = await TemplateManager.getMarkdownTemplate(customTemplatePath);

      expect(template1).toBe(template2);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should load custom template when file exists', async () => {
      const customTemplatePath = '/custom/template.md';
      const templateContent = '# {{projectName}}\n\nTests: {{summary.totalTests}}';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getMarkdownTemplate(customTemplatePath);
      const result = template(mockContext);

      expect(result).toContain('# Test Project');
      expect(result).toContain('Tests: 100');
    });

    it('should use default template when custom file does not exist', async () => {
      const customTemplatePath = '/custom/template.md';

      mockFs.pathExists.mockResolvedValue(false);

      const template = await TemplateManager.getMarkdownTemplate(customTemplatePath);
      const result = template(mockContext);

      expect(result).toContain('# Test Project Test Report');
      expect(result).toContain('## Summary');
    });
  });

  describe('renderHtml', () => {
    it('should render HTML template with context', async () => {
      const result = await TemplateManager.renderHtml(mockContext);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Project');
      expect(result).toContain('95/100');
      expect(result).toContain('95%');
    });

    it('should render custom HTML template', async () => {
      const customTemplatePath = '/custom/template.hbs';
      const templateContent = '<h1>{{projectName}}</h1><p>{{summary.totalTests}} tests</p>';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const result = await TemplateManager.renderHtml(mockContext, customTemplatePath);

      expect(result).toBe('<h1>Test Project</h1><p>100 tests</p>');
    });
  });

  describe('renderMarkdown', () => {
    it('should render Markdown template with context', async () => {
      const result = await TemplateManager.renderMarkdown(mockContext);

      expect(result).toContain('# Test Project Test Report');
      expect(result).toContain('| Total Tests | 100 |');
      expect(result).toContain('| Passed | 95 |');
      expect(result).toContain('| Failed | 5 |');
    });

    it('should render custom Markdown template', async () => {
      const customTemplatePath = '/custom/template.md';
      const templateContent = '# {{projectName}}\n\n**Tests:** {{summary.totalTests}}';

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const result = await TemplateManager.renderMarkdown(mockContext, customTemplatePath);

      expect(result).toBe('# Test Project\n\n**Tests:** 100');
    });
  });

  describe('Handlebars helpers', () => {
    it('should format numbers correctly', async () => {
      const templateContent = '{{formatNumber 95.123 1}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('95.1');
    });

    it('should format duration correctly', async () => {
      const templateContent = '{{formatDuration 5000}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('5.0s');
    });

    it('should format duration in milliseconds for small values', async () => {
      const templateContent = '{{formatDuration 500}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('500ms');
    });

    it('should format duration in minutes for large values', async () => {
      const templateContent = '{{formatDuration 125000}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('2m 5s');
    });

    it('should capitalize strings correctly', async () => {
      const templateContent = '{{capitalize "failed"}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('Failed');
    });

    it('should truncate strings correctly', async () => {
      const templateContent = '{{truncate "This is a very long error message" 10}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('This is a ...');
    });

    it('should return coverage status correctly', async () => {
      const templateContent = '{{coverageStatus 95}} {{coverageStatus 85}} {{coverageStatus 65}} {{coverageStatus 45}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('✅ ⚠️ 🔶 ❌');
    });

    it('should handle comparison helpers correctly', async () => {
      const templateContent = '{{#if (gt 10 5)}}greater{{/if}} {{#if (gte 5 5)}}equal{{/if}} {{#if (eq "test" "test")}}same{{/if}}';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      const result = template({});

      expect(result).toBe('greater equal same');
    });
  });

  describe('processMarkdown', () => {
    it('should process markdown to HTML', () => {
      const markdown = '# Title\n\n**Bold text** and *italic text*';
      const html = TemplateManager.processMarkdown(markdown);

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<strong>Bold text</strong>');
      expect(html).toContain('<em>italic text</em>');
    });

    it('should handle links in markdown', () => {
      const markdown = '[Link text](https://example.com)';
      const html = TemplateManager.processMarkdown(markdown);

      expect(html).toContain('<a href="https://example.com">Link text</a>');
    });
  });

  describe('clearCache', () => {
    it('should clear template cache', async () => {
      const templateContent = '<html>{{projectName}}</html>';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      // Load template to cache it
      await TemplateManager.getHtmlTemplate('/test.hbs');
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);

      // Clear cache
      TemplateManager.clearCache();

      // Load template again - should read from file again
      await TemplateManager.getHtmlTemplate('/test.hbs');
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('template compilation', () => {
    it('should compile templates correctly', async () => {
      const templateContent = '<h1>{{projectName}}</h1><p>Tests: {{summary.totalTests}}</p>';
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(templateContent);

      const template = await TemplateManager.getHtmlTemplate('/test.hbs');
      
      // Template should be compiled and ready to use
      expect(typeof template).toBe('function');
      
      const result = template(mockContext);
      expect(result).toBe('<h1>Test Project</h1><p>Tests: 100</p>');
    });

    it('should handle template compilation errors', async () => {
      const invalidTemplateContent = '<h1>{{#if unclosed}}Invalid{{/if'; // Missing closing brace
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(invalidTemplateContent);

      await expect(TemplateManager.getHtmlTemplate('/invalid.hbs'))
        .rejects.toThrow();
    });

    it('should compile templates with complex expressions', async () => {
      const complexTemplate = `
        {{#each testSuites}}
          <div class="suite {{#if (eq status 'passed')}}success{{else}}error{{/if}}">
            <h3>{{name}}</h3>
            <p>Duration: {{formatDuration duration}}</p>
            {{#each tests}}
              <div class="test {{status}}">
                {{name}} - {{formatDuration duration}}
                {{#if errorMessage}}
                  <pre>{{errorMessage}}</pre>
                {{/if}}
              </div>
            {{/each}}
          </div>
        {{/each}}
      `;
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(complexTemplate);

      const template = await TemplateManager.getHtmlTemplate('/complex.hbs');
      const result = template(mockContext);

      expect(result).toContain('Unit Tests');
      expect(result).toContain('should pass');
      expect(result).toContain('should fail');
      expect(result).toContain('Test failed');
      expect(result).toContain('class="test passed"');
      expect(result).toContain('class="test failed"');
    });

    it('should compile markdown templates', async () => {
      const markdownTemplate = `
# {{projectName}} Test Report

## Summary
- Total Tests: {{summary.totalTests}}
- Passed: {{summary.passedTests}}
- Failed: {{summary.failedTests}}

{{#each testSuites}}
### {{name}}
Status: {{capitalize status}}
Duration: {{formatDuration duration}}

{{#each tests}}
- {{name}}: {{capitalize status}}{{#if errorMessage}} - {{errorMessage}}{{/if}}
{{/each}}

{{/each}}
      `;
      
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.readFile.mockResolvedValue(markdownTemplate);

      const template = await TemplateManager.getMarkdownTemplate('/test.md');
      const result = template(mockContext);

      expect(result).toContain('# Test Project Test Report');
      expect(result).toContain('- Total Tests: 100');
      expect(result).toContain('### Unit Tests');
      expect(result).toContain('- should pass: Passed');
      expect(result).toContain('- should fail: Failed - Test failed');
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported template type', async () => {
      const customTemplatePath = '/custom/template.xml';

      mockFs.pathExists.mockResolvedValue(false);

      await expect(TemplateManager.getHtmlTemplate(customTemplatePath))
        .rejects.toThrow('Unsupported template type: .xml');
    });
  });
});