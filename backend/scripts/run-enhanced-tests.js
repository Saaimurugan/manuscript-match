#!/usr/bin/env node

/**
 * Enhanced Test Runner Script
 * 
 * This script uses the new TypeScript-based enhanced test runner with
 * sophisticated test result aggregation and reporting capabilities.
 */

const { execSync } = require('child_process');
const path = require('path');

// Ensure TypeScript is compiled
try {
  console.log('📦 Compiling TypeScript...');
  execSync('npm run build', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
  console.log('✅ TypeScript compilation completed');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Import and run the enhanced test runner
try {
  const { createEnhancedTestRunner } = require('../dist/test-reporting/EnhancedTestRunner');
  
  // Parse command line arguments (skip node and script name)
  const args = process.argv.slice(2);
  
  // Create and run the enhanced test runner
  const runner = createEnhancedTestRunner(args);
  runner.run().catch(error => {
    console.error('Enhanced test runner failed:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Failed to load enhanced test runner:', error.message);
  console.log('📋 Falling back to original test runner...');
  
  // Fallback to original test runner
  try {
    require('./run-comprehensive-tests.js');
  } catch (fallbackError) {
    console.error('❌ Fallback test runner also failed:', fallbackError.message);
    process.exit(1);
  }
}