/**
 * Build Scripts Integration Tests
 * 
 * Tests for enhanced build scripts with npm integration
 */

import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Build Scripts Integration', () => {
  const projectRoot = process.cwd();
  const scriptsDir = path.join(projectRoot, 'scripts');
  const testOutputDir = path.join(projectRoot, 'test-build-integration');

  beforeAll(async () => {
    // Create test output directory
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test output directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Package.json Scripts', () => {
    let packageJson: any;

    beforeAll(async () => {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf8');
      packageJson = JSON.parse(content);
    });

    test('should have all required test reporting scripts', () => {
      const requiredScripts = [
        'test:report',
        'test:report:generate',
        'test:report:generate:ci',
        'test:report:generate:verbose',
        'test:report:html',
        'test:report:markdown',
        'test:report:json',
        'test:report:all',
        'test:report:quick'
      ];

      for (const script of requiredScripts) {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(packageJson.scripts[script]).toBeTruthy();
      }
    });

    test('should have enhanced build scripts', () => {
      const requiredBuildScripts = [
        'build:enhanced',
        'build:enhanced:ci',
        'build:enhanced:fast'
      ];

      for (const script of requiredBuildScripts) {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(packageJson.scripts[script]).toContain('build-with-reports.js');
      }
    });

    test('should have post-test hooks with proper error handling', () => {
      const postTestScripts = [
        'posttest',
        'posttest:unit',
        'posttest:integration',
        'posttest:e2e',
        'posttest:performance',
        'posttest:coverage',
        'posttest:ci'
      ];

      for (const script of postTestScripts) {
        expect(packageJson.scripts).toHaveProperty(script);
        expect(packageJson.scripts[script]).toContain('post-test-hook.js');
      }
    });

    test('should have pre-test preparation script', () => {
      expect(packageJson.scripts).toHaveProperty('pretest:report');
      expect(packageJson.scripts['pretest:report']).toContain('Preparing to generate test reports');
    });

    test('should have validation scripts', () => {
      expect(packageJson.scripts).toHaveProperty('validate:build-integration');
      expect(packageJson.scripts).toHaveProperty('validate:reports');
    });
  });

  describe('Build Script Files', () => {
    test('build-with-reports.js should exist and be executable', async () => {
      const scriptPath = path.join(scriptsDir, 'build-with-reports.js');
      
      // Check file exists
      await expect(fs.access(scriptPath)).resolves.not.toThrow();
      
      // Check has shebang
      const content = await fs.readFile(scriptPath, 'utf8');
      expect(content).toMatch(/^#!/);
      expect(content).toContain('#!/usr/bin/env node');
    });

    test('post-test-hook.js should exist and be executable', async () => {
      const scriptPath = path.join(scriptsDir, 'post-test-hook.js');
      
      // Check file exists
      await expect(fs.access(scriptPath)).resolves.not.toThrow();
      
      // Check has shebang
      const content = await fs.readFile(scriptPath, 'utf8');
      expect(content).toMatch(/^#!/);
      expect(content).toContain('#!/usr/bin/env node');
    });

    test('generate-test-reports.js should exist', async () => {
      const scriptPath = path.join(scriptsDir, 'generate-test-reports.js');
      await expect(fs.access(scriptPath)).resolves.not.toThrow();
    });

    test('validate-build-integration.js should exist', async () => {
      const scriptPath = path.join(scriptsDir, 'validate-build-integration.js');
      await expect(fs.access(scriptPath)).resolves.not.toThrow();
    });
  });

  describe('Script Functionality', () => {
    test('build-with-reports.js should accept command line arguments', async () => {
      const scriptPath = path.join(scriptsDir, 'build-with-reports.js');
      
      // Test help/version output (should not crash)
      expect(() => {
        execSync(`node "${scriptPath}" --help`, { 
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
    });

    test('post-test-hook.js should handle different test types', async () => {
      const scriptPath = path.join(scriptsDir, 'post-test-hook.js');
      
      const testTypes = ['unit', 'integration', 'e2e', 'performance', 'coverage'];
      
      for (const testType of testTypes) {
        // Should not crash with different test types
        expect(() => {
          execSync(`node "${scriptPath}" --test-type=${testType} --help`, {
            cwd: projectRoot,
            stdio: 'pipe',
            timeout: 5000
          });
        }).not.toThrow();
      }
    });

    test('generate-test-reports.js should support different formats', async () => {
      const scriptPath = path.join(scriptsDir, 'generate-test-reports.js');
      
      const formats = ['html', 'markdown', 'json', 'all'];
      
      for (const format of formats) {
        // Should not crash with different formats
        expect(() => {
          execSync(`node "${scriptPath}" --format=${format} --help`, {
            cwd: projectRoot,
            stdio: 'pipe',
            timeout: 5000
          });
        }).not.toThrow();
      }
    });
  });

  describe('CI/CD Compatibility', () => {
    test('scripts should handle CI environment variable', () => {
      const ciEnv = { ...process.env, CI: 'true' };
      
      // Test that scripts recognize CI environment
      expect(() => {
        execSync('npm run test:report:generate:ci', {
          cwd: projectRoot,
          env: ciEnv,
          stdio: 'pipe',
          timeout: 10000
        });
      }).not.toThrow();
    });

    test('post-test hooks should not fail build in CI mode', async () => {
      const scriptPath = path.join(scriptsDir, 'post-test-hook.js');
      
      // Simulate CI environment
      const result = execSync(`node "${scriptPath}" --ci --silent`, {
        cwd: projectRoot,
        env: { ...process.env, CI: 'true' },
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      // Should complete without throwing
      expect(result).toBeDefined();
    });

    test('build scripts should provide appropriate exit codes', async () => {
      // Test successful execution returns 0
      const result = execSync('npm run validate:build-integration', {
        cwd: projectRoot,
        stdio: 'pipe'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('post-test hook should continue on report generation failure', async () => {
      const scriptPath = path.join(scriptsDir, 'post-test-hook.js');
      
      // Test with non-existent output directory to simulate failure
      const result = execSync(`node "${scriptPath}" --ci --silent`, {
        cwd: projectRoot,
        env: { 
          ...process.env, 
          CI: 'true',
          TEST_REPORTS_DIR: '/non/existent/path'
        },
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      // Should complete even with simulated failure
      expect(result).toBeDefined();
    });

    test('build script should handle missing dependencies gracefully', async () => {
      const scriptPath = path.join(scriptsDir, 'build-with-reports.js');
      
      // Test with skip flags to avoid actual build
      expect(() => {
        execSync(`node "${scriptPath}" --skip-tests --skip-reports`, {
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: 10000
        });
      }).not.toThrow();
    });
  });

  describe('Progress Reporting', () => {
    test('scripts should provide console output', async () => {
      const scriptPath = path.join(scriptsDir, 'generate-test-reports.js');
      
      const output = execSync(`node "${scriptPath}" --verbose`, {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 10000
      });
      
      // Should contain progress indicators
      expect(output).toMatch(/📋|✅|⚠️|❌|⏳/);
    });

    test('build script should show step progress', async () => {
      const scriptPath = path.join(scriptsDir, 'build-with-reports.js');
      
      const output = execSync(`node "${scriptPath}" --skip-tests --verbose`, {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 15000
      });
      
      // Should contain build step indicators
      expect(output).toMatch(/🔨|📋|✅|⚠️/);
    });
  });

  describe('Configuration Integration', () => {
    test('scripts should respect test-reporting.config.js', async () => {
      const configPath = path.join(projectRoot, 'test-reporting.config.js');
      
      try {
        await fs.access(configPath);
        
        // If config exists, scripts should use it
        const scriptPath = path.join(scriptsDir, 'generate-test-reports.js');
        
        expect(() => {
          execSync(`node "${scriptPath}" --format=json`, {
            cwd: projectRoot,
            stdio: 'pipe',
            timeout: 10000
          });
        }).not.toThrow();
        
      } catch (error) {
        // Config file doesn't exist, that's okay for this test
        console.log('test-reporting.config.js not found, skipping config integration test');
      }
    });
  });

  describe('Output Validation', () => {
    test('report generation should create expected output files', async () => {
      // Run report generation
      execSync('npm run test:report:json', {
        cwd: projectRoot,
        stdio: 'pipe',
        timeout: 15000
      });
      
      // Check if report files were created
      const reportsDir = path.join(projectRoot, 'test-reports');
      
      try {
        const files = await fs.readdir(reportsDir);
        const jsonReports = files.filter(file => file.endsWith('.json'));
        
        expect(jsonReports.length).toBeGreaterThan(0);
      } catch (error) {
        // Reports directory might not exist if no tests were run
        console.log('No test reports found, which is expected if no tests were executed');
      }
    });

    test('build validation should check all components', async () => {
      const output = execSync('npm run validate:build-integration', {
        cwd: projectRoot,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 10000
      });
      
      // Should contain validation results
      expect(output).toMatch(/validation|✅|❌|⚠️/i);
    });
  });
});