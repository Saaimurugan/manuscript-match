#!/usr/bin/env node

/**
 * Build Integration Validation Script
 * 
 * This script validates that all build integration components are properly configured
 * and working as expected.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class BuildIntegrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.projectRoot = process.cwd();
  }

  log(message, level = 'info') {
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '📋';
    
    console.log(`${prefix} ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  async validatePackageJsonScripts() {
    this.log('Validating package.json scripts...', 'info');
    
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      const requiredScripts = [
        'test:report',
        'test:report:generate',
        'test:report:generate:ci',
        'test:report:generate:verbose',
        'test:report:html',
        'test:report:markdown',
        'test:report:json',
        'test:report:all',
        'test:report:quick',
        'test:with-reports',
        'build:with-tests',
        'build:enhanced',
        'build:enhanced:ci',
        'build:enhanced:fast',
        'posttest',
        'posttest:unit',
        'posttest:integration',
        'posttest:e2e',
        'posttest:performance',
        'posttest:coverage',
        'posttest:ci',
        'pretest:report',
        'validate:reports'
      ];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          this.addError(`Missing required script: ${script}`);
        }
      }
      
      // Validate post-test hooks use the new post-test-hook.js script
      const postTestScript = packageJson.scripts['posttest'];
      if (postTestScript && !postTestScript.includes('post-test-hook.js')) {
        this.addWarning('Post-test hook should use post-test-hook.js script');
      }
      
      // Validate enhanced build scripts exist
      const buildEnhancedScript = packageJson.scripts['build:enhanced'];
      if (buildEnhancedScript && !buildEnhancedScript.includes('build-with-reports.js')) {
        this.addWarning('Enhanced build script should use build-with-reports.js');
      }
      
      this.log('Package.json scripts validation completed', 'success');
      
    } catch (error) {
      this.addError(`Failed to validate package.json: ${error.message}`);
    }
  }

  async validateScriptFiles() {
    this.log('Validating script files...', 'info');
    
    const requiredScripts = [
      'scripts/generate-test-reports.js',
      'scripts/run-tests-with-reports.js',
      'scripts/build-with-reports.js',
      'scripts/post-test-hook.js',
      'scripts/validate-build-integration.js'
    ];
    
    for (const scriptPath of requiredScripts) {
      const fullPath = path.join(this.projectRoot, scriptPath);
      try {
        await fs.access(fullPath);
        
        // Check if file is executable (has shebang)
        const content = await fs.readFile(fullPath, 'utf8');
        if (!content.startsWith('#!/usr/bin/env node')) {
          this.addWarning(`Script ${scriptPath} should have shebang line`);
        }
        
      } catch (error) {
        this.addError(`Missing required script file: ${scriptPath}`);
      }
    }
    
    this.log('Script files validation completed', 'success');
  }

  async validateConfiguration() {
    this.log('Validating configuration...', 'info');
    
    try {
      const configPath = path.join(this.projectRoot, 'test-reporting.config.js');
      await fs.access(configPath);
      
      const config = require(configPath);
      
      const requiredProperties = [
        'enabled',
        'outputDirectory',
        'formats',
        'buildIntegration'
      ];
      
      for (const prop of requiredProperties) {
        if (!(prop in config)) {
          this.addError(`Missing configuration property: ${prop}`);
        }
      }
      
      this.log('Configuration validation completed', 'success');
      
    } catch (error) {
      this.addError(`Configuration validation failed: ${error.message}`);
    }
  }

  async validateReportGeneration() {
    this.log('Testing report generation...', 'info');
    
    try {
      // Create a test output directory
      const testOutputDir = path.join(this.projectRoot, 'test-validation-reports');
      await fs.mkdir(testOutputDir, { recursive: true });
      
      // Run the report generation script
      const scriptPath = path.join(this.projectRoot, 'scripts', 'generate-test-reports.js');
      
      try {
        execSync(`node "${scriptPath}" --format=json --output=test-validation-reports`, {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        
        // Check if report was generated
        const reportPath = path.join(testOutputDir, 'test-report.json');
        await fs.access(reportPath);
        
        this.log('Report generation test passed', 'success');
        
      } catch (error) {
        this.addWarning(`Report generation test failed: ${error.message}`);
      } finally {
        // Clean up test directory
        try {
          await fs.rm(testOutputDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
    } catch (error) {
      this.addError(`Report generation validation failed: ${error.message}`);
    }
  }

  async validateJestIntegration() {
    this.log('Validating Jest integration...', 'info');
    
    try {
      const jestConfigPath = path.join(this.projectRoot, 'jest.config.js');
      const jestConfig = require(jestConfigPath);
      
      if (!jestConfig.reporters) {
        this.addWarning('Jest configuration should include custom reporters');
      } else {
        const hasCustomReporter = jestConfig.reporters.some(reporter => 
          Array.isArray(reporter) && reporter[0].includes('JestReporter')
        );
        
        if (!hasCustomReporter) {
          this.addWarning('Jest configuration should include custom test reporter');
        }
      }
      
      this.log('Jest integration validation completed', 'success');
      
    } catch (error) {
      this.addWarning(`Jest integration validation failed: ${error.message}`);
    }
  }

  async validateDirectoryStructure() {
    this.log('Validating directory structure...', 'info');
    
    const requiredDirectories = [
      'scripts',
      'src/test-reporting'
    ];
    
    for (const dir of requiredDirectories) {
      const dirPath = path.join(this.projectRoot, dir);
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          this.addError(`${dir} should be a directory`);
        }
      } catch (error) {
        this.addError(`Missing required directory: ${dir}`);
      }
    }
    
    this.log('Directory structure validation completed', 'success');
  }

  async validateEnvironmentVariables() {
    this.log('Validating environment variable support...', 'info');
    
    const configPath = path.join(this.projectRoot, 'test-reporting.config.js');
    
    try {
      const content = await fs.readFile(configPath, 'utf8');
      
      const expectedEnvVars = [
        'TEST_REPORTING_ENABLED',
        'TEST_REPORTS_DIR',
        'CI'
      ];
      
      for (const envVar of expectedEnvVars) {
        if (!content.includes(`process.env.${envVar}`)) {
          this.addWarning(`Configuration should support ${envVar} environment variable`);
        }
      }
      
      this.log('Environment variable validation completed', 'success');
      
    } catch (error) {
      this.addError(`Environment variable validation failed: ${error.message}`);
    }
  }

  async run() {
    this.log('🚀 Starting build integration validation', 'info');
    
    await this.validatePackageJsonScripts();
    await this.validateScriptFiles();
    await this.validateConfiguration();
    await this.validateDirectoryStructure();
    await this.validateJestIntegration();
    await this.validateEnvironmentVariables();
    await this.validateReportGeneration();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BUILD INTEGRATION VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('All validations passed successfully! 🎉', 'success');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ Errors (${this.errors.length}):`);
        this.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
        this.warnings.forEach((warning, index) => {
          console.log(`  ${index + 1}. ${warning}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    if (this.errors.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

// Main execution
if (require.main === module) {
  const validator = new BuildIntegrationValidator();
  validator.run().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { BuildIntegrationValidator };