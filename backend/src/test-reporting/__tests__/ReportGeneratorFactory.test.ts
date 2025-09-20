/**
 * Integration Tests for Report Generator Factory and Orchestration System
 * 
 * Tests the factory pattern implementation, parallel report generation,
 * error handling, progress tracking, and resource management.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  ReportGeneratorFactory, 
  ReportGenerationOptions, 
  ReportGenerationProgress
} from '../ReportGeneratorFactory';
import { ReportFormat } from '../ReportGenerator';
import { AggregatedTestData, TestStatus, TestCategory } from '../types';

describe('ReportGeneratorFactory Integration Tests', () => {
  let factory: ReportGeneratorFactory;
  let testOutputDir: string;
  let mockTestData: AggregatedTestData;

  beforeEach(async () => {
    factory = new ReportGeneratorFactory();
    testOutputDir = path.join(__dirname, 'test-output', `test-${Date.now()}`);
    await fs.mkdir(testOutputDir, { recursive: true });

    // Create comprehensive mock test data
    mockTestData = createMockTestData();
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await factory.cleanup();
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Factory Pattern Implementation', () => {
    test('should create generators for all supported formats', () => {
      const htmlGenerator = factory.createHtmlGenerator();
      const markdownGenerator = factory.createMarkdownGenerator();
      const jsonGenerator = factory.createJsonGenerator();

      expect(htmlGenerator).toBeDefined();
      expect(markdownGenerator).toBeDefined();
      expect(jsonGenerator).toBeDefined();

      expect(htmlGenerator.getFormat()).toBe(ReportFormat.HTML);
      expect(markdownGenerator.getFormat()).toBe(ReportFormat.MARKDOWN);
      expect(jsonGenerator.getFormat()).toBe(ReportFormat.JSON);
    });

    test('should return available formats', () => {
      const formats = factory.getAvailableFormats();
      
      expect(formats).toContain(ReportFormat.HTML);
      expect(formats).toContain(ReportFormat.MARKDOWN);
      expect(formats).toContain(ReportFormat.JSON);
      expect(formats.length).toBe(3);
    });

    test('should check format support correctly', () => {
      expect(factory.isFormatSupported(ReportFormat.HTML)).toBe(true);
      expect(factory.isFormatSupported(ReportFormat.MARKDOWN)).toBe(true);
      expect(factory.isFormatSupported(ReportFormat.JSON)).toBe(true);
    });

    test('should get generator by format', () => {
      const htmlGenerator = factory.getGenerator(ReportFormat.HTML);
      const markdownGenerator = factory.getGenerator(ReportFormat.MARKDOWN);
      const jsonGenerator = factory.getGenerator(ReportFormat.JSON);

      expect(htmlGenerator).toBeDefined();
      expect(markdownGenerator).toBeDefined();
      expect(jsonGenerator).toBeDefined();
    });
  });

  describe('Single Format Report Generation', () => {
    test('should generate HTML report successfully', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML],
        outputDirectory: testOutputDir,
        title: 'Test HTML Report'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0]?.format).toBe(ReportFormat.HTML);
      expect(result.reports[0]?.success).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify file exists and has content
      const filePath = result.reports[0]?.filePath;
      expect(filePath).toBeDefined();
      if (filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toContain('<!DOCTYPE html>');
        expect(content).toContain('Test HTML Report');
      }
    });

    test('should generate Markdown report successfully', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.MARKDOWN],
        outputDirectory: testOutputDir,
        title: 'Test Markdown Report'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0]?.format).toBe(ReportFormat.MARKDOWN);
      expect(result.reports[0]?.success).toBe(true);

      // Verify file exists and has content
      const filePath = result.reports[0]?.filePath;
      expect(filePath).toBeDefined();
      if (filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        expect(content).toContain('# 📊 Test Markdown Report');
        expect(content).toContain('## 📈 Summary');
      }
    });

    test('should generate JSON report successfully', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.JSON],
        outputDirectory: testOutputDir,
        title: 'Test JSON Report'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0]?.format).toBe(ReportFormat.JSON);
      expect(result.reports[0]?.success).toBe(true);

      // Verify file exists and has valid JSON
      const filePath = result.reports[0]?.filePath;
      expect(filePath).toBeDefined();
      if (filePath) {
        const content = await fs.readFile(filePath, 'utf8');
        const parsedData = JSON.parse(content);
        expect(parsedData.summary).toBeDefined();
        expect(parsedData.timestamp).toBeDefined();
      }
    });
  });

  describe('Multi-Format Report Generation', () => {
    test('should generate all formats sequentially', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN, ReportFormat.JSON],
        outputDirectory: testOutputDir,
        title: 'Multi-Format Test Report',
        parallel: false
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      // Verify all formats were generated
      const formats = result.reports.map(r => r.format);
      expect(formats).toContain(ReportFormat.HTML);
      expect(formats).toContain(ReportFormat.MARKDOWN);
      expect(formats).toContain(ReportFormat.JSON);

      // Verify all files exist
      for (const report of result.reports) {
        const stats = await fs.stat(report.filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });

    test('should generate all formats in parallel', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN, ReportFormat.JSON],
        outputDirectory: testOutputDir,
        title: 'Parallel Multi-Format Test Report',
        parallel: true
      };

      const startTime = Date.now();
      const result = await factory.generateReports(mockTestData, options);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(3);
      expect(result.errors).toHaveLength(0);

      // Parallel should be faster than sequential (though this is a rough test)
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify all files exist and have content
      for (const report of result.reports) {
        const stats = await fs.stat(report.filePath);
        expect(stats.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Progress Tracking', () => {
    test('should track progress with callback', async () => {
      const progressEvents: ReportGenerationProgress[] = [];
      
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN],
        outputDirectory: testOutputDir,
        title: 'Progress Tracking Test',
        progressCallback: (progress) => {
          progressEvents.push(progress);
        }
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);

      // Should have progress events for both formats
      const htmlEvents = progressEvents.filter(e => e.format === ReportFormat.HTML);
      const markdownEvents = progressEvents.filter(e => e.format === ReportFormat.MARKDOWN);

      expect(htmlEvents.length).toBeGreaterThan(0);
      expect(markdownEvents.length).toBeGreaterThan(0);

      // Should have different stages
      const stages = new Set(progressEvents.map(e => e.stage));
      expect(stages.has('starting')).toBe(true);
      expect(stages.has('completed')).toBe(true);
    });

    test('should emit progress events', async () => {
      const progressEvents: ReportGenerationProgress[] = [];
      
      factory.on('progress', (progress: ReportGenerationProgress) => {
        progressEvents.push(progress);
      });

      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML],
        outputDirectory: testOutputDir,
        title: 'Event Emission Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);

      // Should have starting and completed events
      const stages = progressEvents.map(e => e.stage);
      expect(stages).toContain('starting');
      expect(stages).toContain('completed');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle invalid output directory gracefully', async () => {
      // Use a path that would definitely be invalid on Windows
      const invalidDir = 'Z:\\invalid\\path\\that\\does\\not\\exist\\and\\cannot\\be\\created';
      
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML],
        outputDirectory: invalidDir,
        title: 'Error Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      // The test should either fail or succeed, but we should handle it gracefully
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      } else {
        // If it succeeds, that's also acceptable (directory creation might work)
        expect(result.reports.length).toBeGreaterThan(0);
      }
    });

    test('should continue with other formats when one fails', async () => {
      // Create a scenario where one format might fail but others succeed
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN, ReportFormat.JSON],
        outputDirectory: testOutputDir,
        title: 'Partial Failure Test',
        parallel: true
      };

      // Mock a scenario where the test data might cause issues
      const problematicData = {
        ...mockTestData,
        summary: null as any // This might cause issues in some generators
      };

      const result = await factory.generateReports(problematicData, options);

      // Even if some formats fail, the process should continue
      expect(result.reports.length + result.errors.length).toBe(3);
    });

    test('should validate options before generation', async () => {
      const invalidOptions: ReportGenerationOptions = {
        formats: [], // Empty formats array
        outputDirectory: testOutputDir
      };

      const result = await factory.generateReports(mockTestData, invalidOptions);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]?.error).toContain('At least one report format must be specified');
    });
  });

  describe('File System Operations and Cleanup', () => {
    test('should create output directory if it does not exist', async () => {
      const newDir = path.join(testOutputDir, 'new-subdir');
      
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML],
        outputDirectory: newDir,
        title: 'Directory Creation Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      
      // Verify directory was created
      const stats = await fs.stat(newDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should handle cleanup of temporary files', async () => {
      const tempFile = path.join(testOutputDir, 'temp-file.tmp');
      await fs.writeFile(tempFile, 'temporary content');
      
      factory.addTempFile(tempFile);
      
      // Verify file exists
      let fileExists = true;
      try {
        await fs.stat(tempFile);
      } catch {
        fileExists = false;
      }
      expect(fileExists).toBe(true);

      // Cleanup
      await factory.cleanup();

      // Verify file was removed
      fileExists = true;
      try {
        await fs.stat(tempFile);
      } catch {
        fileExists = false;
      }
      expect(fileExists).toBe(false);
    });

    test('should include temp files in result', async () => {
      const tempFile = path.join(testOutputDir, 'temp-file.tmp');
      await fs.writeFile(tempFile, 'temporary content');
      
      factory.addTempFile(tempFile);

      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML],
        outputDirectory: testOutputDir,
        title: 'Temp Files Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.tempFiles).toContain(tempFile);
    });
  });

  describe('Report Validation', () => {
    test('should validate generated report files', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN, ReportFormat.JSON],
        outputDirectory: testOutputDir,
        title: 'Validation Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);

      // All reports should be valid
      for (const report of result.reports) {
        expect(report.success).toBe(true);
        expect(report.size).toBeGreaterThan(0);
        
        // Verify file exists and has expected content
        const content = await fs.readFile(report.filePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
        
        switch (report.format) {
          case ReportFormat.HTML:
            expect(content).toContain('<!DOCTYPE html>');
            break;
          case ReportFormat.MARKDOWN:
            expect(content).toContain('#');
            break;
          case ReportFormat.JSON:
            expect(() => JSON.parse(content)).not.toThrow();
            break;
        }
      }
    });
  });

  describe('Custom Configuration', () => {
    test('should use custom filenames when provided', async () => {
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN],
        outputDirectory: testOutputDir,
        baseFilename: 'custom-report',
        title: 'Custom Filename Test'
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);
      expect(result.reports).toHaveLength(2);

      const htmlReport = result.reports.find(r => r.format === ReportFormat.HTML);
      const markdownReport = result.reports.find(r => r.format === ReportFormat.MARKDOWN);

      expect(htmlReport?.filePath).toContain('custom-report.html');
      expect(markdownReport?.filePath).toContain('custom-report.md');
    });

    test('should include custom title in reports', async () => {
      const customTitle = 'My Custom Test Report Title';
      
      const options: ReportGenerationOptions = {
        formats: [ReportFormat.HTML, ReportFormat.MARKDOWN],
        outputDirectory: testOutputDir,
        title: customTitle
      };

      const result = await factory.generateReports(mockTestData, options);

      expect(result.success).toBe(true);

      // Check HTML report contains title
      const htmlReport = result.reports.find(r => r.format === ReportFormat.HTML);
      if (htmlReport) {
        const htmlContent = await fs.readFile(htmlReport.filePath, 'utf8');
        expect(htmlContent).toContain(customTitle);
      }

      // Check Markdown report contains title
      const markdownReport = result.reports.find(r => r.format === ReportFormat.MARKDOWN);
      if (markdownReport) {
        const markdownContent = await fs.readFile(markdownReport.filePath, 'utf8');
        expect(markdownContent).toContain(customTitle);
      }
    });
  });
});

/**
 * Helper function to create comprehensive mock test data
 */
function createMockTestData(): AggregatedTestData {
  const timestamp = new Date();
  
  return {
    summary: {
      totalTests: 150,
      passedTests: 140,
      failedTests: 8,
      skippedTests: 2,
      todoTests: 0,
      passRate: 93.33,
      executionTime: 45000,
      testSuites: 25,
      passedSuites: 23,
      failedSuites: 2
    },
    suiteResults: [
      {
        name: 'UserService Tests',
        filePath: '/src/services/UserService.test.ts',
        status: TestStatus.PASSED,
        duration: 2500,
        tests: [
          {
            name: 'should create user successfully',
            status: TestStatus.PASSED,
            duration: 150,
            category: TestCategory.UNIT,
            fullName: 'UserService Tests should create user successfully',
            ancestorTitles: ['UserService Tests']
          },
          {
            name: 'should validate user input',
            status: TestStatus.FAILED,
            duration: 200,
            errorMessage: 'Expected validation to fail but it passed',
            stackTrace: 'Error: Expected validation to fail\n    at UserService.test.ts:45:12',
            category: TestCategory.UNIT,
            fullName: 'UserService Tests should validate user input',
            ancestorTitles: ['UserService Tests']
          }
        ],
        category: TestCategory.UNIT,
        numPassingTests: 1,
        numFailingTests: 1,
        numPendingTests: 0,
        numTodoTests: 0,
        startTime: new Date(timestamp.getTime() - 2500),
        endTime: timestamp
      }
    ],
    coverageData: {
      overall: {
        lines: { total: 1000, covered: 850, percentage: 85.0 },
        functions: { total: 200, covered: 180, percentage: 90.0 },
        branches: { total: 150, covered: 120, percentage: 80.0 },
        statements: { total: 1200, covered: 1020, percentage: 85.0 }
      },
      byFile: {},
      byCategory: {
        [TestCategory.UNIT]: {
          lines: { total: 600, covered: 540, percentage: 90.0 },
          functions: { total: 120, covered: 115, percentage: 95.8 },
          branches: { total: 80, covered: 75, percentage: 93.75 },
          statements: { total: 720, covered: 648, percentage: 90.0 }
        },
        [TestCategory.INTEGRATION]: {
          lines: { total: 200, covered: 160, percentage: 80.0 },
          functions: { total: 40, covered: 35, percentage: 87.5 },
          branches: { total: 30, covered: 25, percentage: 83.33 },
          statements: { total: 240, covered: 192, percentage: 80.0 }
        },
        [TestCategory.E2E]: {
          lines: { total: 150, covered: 120, percentage: 80.0 },
          functions: { total: 30, covered: 25, percentage: 83.33 },
          branches: { total: 25, covered: 15, percentage: 60.0 },
          statements: { total: 180, covered: 144, percentage: 80.0 }
        },
        [TestCategory.PERFORMANCE]: {
          lines: { total: 50, covered: 30, percentage: 60.0 },
          functions: { total: 10, covered: 5, percentage: 50.0 },
          branches: { total: 15, covered: 5, percentage: 33.33 },
          statements: { total: 60, covered: 36, percentage: 60.0 }
        }
      },
      threshold: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    performanceMetrics: {
      averageResponseTime: 125,
      p95ResponseTime: 250,
      p99ResponseTime: 500,
      throughput: 1500,
      errorRate: 0.02,
      memoryUsage: 256,
      cpuUsage: 45
    },
    timestamp,
    buildMetadata: {
      timestamp,
      buildVersion: '1.2.3',
      environment: 'test',
      gitInfo: {
        branch: 'feature/test-reporting',
        commit: 'abc123def456',
        commitMessage: 'Add comprehensive test reporting',
        author: 'Test Developer',
        isDirty: false
      },
      nodeVersion: '18.17.0',
      platform: 'linux',
      architecture: 'x64',
      ciInfo: {
        isCI: false,
        provider: 'github-actions',
        buildNumber: '123',
        jobId: 'job-456'
      }
    },
    metrics: {
      summary: {
        totalTests: 150,
        passedTests: 140,
        failedTests: 8,
        skippedTests: 2,
        todoTests: 0,
        passRate: 93.33,
        executionTime: 45000,
        testSuites: 25,
        passedSuites: 23,
        failedSuites: 2
      },
      categoryBreakdown: {
        [TestCategory.UNIT]: {
          totalTests: 80,
          passedTests: 75,
          failedTests: 4,
          skippedTests: 1,
          todoTests: 0,
          passRate: 93.75,
          executionTime: 20000,
          testSuites: 12,
          passedSuites: 11,
          failedSuites: 1
        },
        [TestCategory.INTEGRATION]: {
          totalTests: 40,
          passedTests: 38,
          failedTests: 2,
          skippedTests: 0,
          todoTests: 0,
          passRate: 95.0,
          executionTime: 15000,
          testSuites: 8,
          passedSuites: 7,
          failedSuites: 1
        },
        [TestCategory.E2E]: {
          totalTests: 20,
          passedTests: 18,
          failedTests: 1,
          skippedTests: 1,
          todoTests: 0,
          passRate: 90.0,
          executionTime: 8000,
          testSuites: 4,
          passedSuites: 4,
          failedSuites: 0
        },
        [TestCategory.PERFORMANCE]: {
          totalTests: 10,
          passedTests: 9,
          failedTests: 1,
          skippedTests: 0,
          todoTests: 0,
          passRate: 90.0,
          executionTime: 2000,
          testSuites: 1,
          passedSuites: 1,
          failedSuites: 0
        }
      },
      coverageMetrics: {
        overall: {
          lines: { total: 1000, covered: 850, percentage: 85.0 },
          functions: { total: 200, covered: 180, percentage: 90.0 },
          branches: { total: 150, covered: 120, percentage: 80.0 },
          statements: { total: 1200, covered: 1020, percentage: 85.0 }
        },
        byFile: {},
        byCategory: {
          [TestCategory.UNIT]: {
            lines: { total: 600, covered: 540, percentage: 90.0 },
            functions: { total: 120, covered: 115, percentage: 95.8 },
            branches: { total: 80, covered: 75, percentage: 93.75 },
            statements: { total: 720, covered: 648, percentage: 90.0 }
          },
          [TestCategory.INTEGRATION]: {
            lines: { total: 200, covered: 160, percentage: 80.0 },
            functions: { total: 40, covered: 35, percentage: 87.5 },
            branches: { total: 30, covered: 25, percentage: 83.33 },
            statements: { total: 240, covered: 192, percentage: 80.0 }
          },
          [TestCategory.E2E]: {
            lines: { total: 150, covered: 120, percentage: 80.0 },
            functions: { total: 30, covered: 25, percentage: 83.33 },
            branches: { total: 25, covered: 15, percentage: 60.0 },
            statements: { total: 180, covered: 144, percentage: 80.0 }
          },
          [TestCategory.PERFORMANCE]: {
            lines: { total: 50, covered: 30, percentage: 60.0 },
            functions: { total: 10, covered: 5, percentage: 50.0 },
            branches: { total: 15, covered: 5, percentage: 33.33 },
            statements: { total: 60, covered: 36, percentage: 60.0 }
          }
        },
        threshold: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80
        }
      },
      slowestTests: [
        {
          name: 'complex integration test',
          status: TestStatus.PASSED,
          duration: 5000,
          category: TestCategory.INTEGRATION,
          fullName: 'Integration Tests complex integration test',
          ancestorTitles: ['Integration Tests']
        }
      ],
      failedTests: [
        {
          name: 'should validate user input',
          status: TestStatus.FAILED,
          duration: 200,
          errorMessage: 'Expected validation to fail but it passed',
          stackTrace: 'Error: Expected validation to fail\n    at UserService.test.ts:45:12',
          category: TestCategory.UNIT,
          fullName: 'UserService Tests should validate user input',
          ancestorTitles: ['UserService Tests']
        }
      ]
    }
  };
}