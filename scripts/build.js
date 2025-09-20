#!/usr/bin/env node

/**
 * Enhanced build script with environment configuration validation
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { validateConfig, parseEnvFile } from './validate-config.js';
import { getDeploymentConfig, validateDeploymentConfig } from '../deployment.config.js';

/**
 * Get build environment from command line arguments
 */
function getBuildEnvironment() {
    const args = process.argv.slice(2);
    const envArg = args.find(arg => arg.startsWith('--env='));
    
    if (envArg) {
        return envArg.split('=')[1];
    }
    
    // Default to production for builds
    return 'production';
}

/**
 * Validate environment file exists
 */
function validateEnvironmentFile(environment) {
    const envFile = `.env.${environment}`;
    
    if (!existsSync(envFile)) {
        console.error(`❌ Environment file not found: ${envFile}`);
        console.log('Available environment files:');
        
        const envFiles = ['.env.development', '.env.staging', '.env.production'];
        envFiles.forEach(file => {
            if (existsSync(file)) {
                console.log(`   ✅ ${file}`);
            } else {
                console.log(`   ❌ ${file}`);
            }
        });
        
        process.exit(1);
    }
    
    return envFile;
}

/**
 * Generate build info
 */
function generateBuildInfo(environment) {
    const buildInfo = {
        environment,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        nodeVersion: process.version,
        buildId: Math.random().toString(36).substring(2, 15),
    };
    
    // Write build info to public directory
    const buildInfoPath = resolve('public/build-info.json');
    writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    
    console.log('📋 Build Info Generated:');
    console.log(`   Environment: ${buildInfo.environment}`);
    console.log(`   Version: ${buildInfo.version}`);
    console.log(`   Build ID: ${buildInfo.buildId}`);
    console.log(`   Timestamp: ${buildInfo.timestamp}`);
    
    return buildInfo;
}

/**
 * Run pre-build checks
 */
function runPreBuildChecks(environment) {
    console.log('🔍 Running pre-build checks...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        console.error(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
        process.exit(1);
    }
    
    console.log(`✅ Node.js version: ${nodeVersion}`);
    
    // Check if package.json exists
    if (!existsSync('package.json')) {
        console.error('❌ package.json not found');
        process.exit(1);
    }
    
    console.log('✅ package.json found');
    
    // Validate TypeScript configuration
    if (existsSync('tsconfig.json')) {
        try {
            execSync('npm run type-check', { stdio: 'pipe' });
            console.log('✅ TypeScript type checking passed');
        } catch (error) {
            console.error('❌ TypeScript type checking failed');
            console.error(error.stdout?.toString() || error.message);
            process.exit(1);
        }
    }
    
    // Run linting
    try {
        execSync('npm run lint', { stdio: 'pipe' });
        console.log('✅ ESLint checks passed');
    } catch (error) {
        console.warn('⚠️  ESLint warnings found (continuing build)');
        console.warn(error.stdout?.toString() || error.message);
    }
}

/**
 * Clean build directory
 */
function cleanBuildDirectory() {
    console.log('🧹 Cleaning build directory...');
    
    try {
        execSync('npm run clean', { stdio: 'pipe' });
        console.log('✅ Build directory cleaned');
    } catch (error) {
        console.warn('⚠️  Could not clean build directory (continuing)');
    }
}

/**
 * Run build command
 */
function runBuild(environment) {
    console.log(`🏗️  Building for ${environment} environment...`);
    
    const deploymentConfig = getDeploymentConfig(environment);
    const buildCommand = deploymentConfig.buildCommand;
    
    console.log(`Running: ${buildCommand}`);
    
    try {
        execSync(buildCommand, { stdio: 'inherit' });
        console.log('✅ Build completed successfully');
    } catch (error) {
        console.error('❌ Build failed');
        process.exit(1);
    }
}

/**
 * Post-build validation
 */
function runPostBuildChecks(environment) {
    console.log('🔍 Running post-build checks...');
    
    const deploymentConfig = getDeploymentConfig(environment);
    const outputDir = deploymentConfig.outputDir;
    
    // Check if build output exists
    if (!existsSync(outputDir)) {
        console.error(`❌ Build output directory not found: ${outputDir}`);
        process.exit(1);
    }
    
    // Check for essential files
    const essentialFiles = ['index.html'];
    for (const file of essentialFiles) {
        const filePath = resolve(outputDir, file);
        if (!existsSync(filePath)) {
            console.error(`❌ Essential file missing: ${file}`);
            process.exit(1);
        }
    }
    
    console.log('✅ Post-build checks passed');
}

/**
 * Generate deployment summary
 */
function generateDeploymentSummary(environment, buildInfo) {
    const deploymentConfig = getDeploymentConfig(environment);
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Environment: ${environment}`);
    console.log(`Build ID: ${buildInfo.buildId}`);
    console.log(`Version: ${buildInfo.version}`);
    console.log(`API Base URL: ${deploymentConfig.apiBaseUrl}`);
    console.log(`Output Directory: ${deploymentConfig.outputDir}`);
    console.log(`Build Command: ${deploymentConfig.buildCommand}`);
    console.log(`Timestamp: ${buildInfo.timestamp}`);
    
    if (deploymentConfig.deployment) {
        console.log('\nDeployment Configuration:');
        console.log(`Target: ${deploymentConfig.deployment.target}`);
        console.log(`Health Check: ${deploymentConfig.deployment.healthCheck}`);
        console.log(`Timeout: ${deploymentConfig.deployment.timeout}s`);
    }
    
    console.log('\nFeature Flags:');
    Object.entries(deploymentConfig.features).forEach(([key, value]) => {
        console.log(`${key}: ${value ? '✅' : '❌'}`);
    });
    
    console.log('='.repeat(60));
}

/**
 * Main build function
 */
function main() {
    console.log('🔧 ScholarFinder Build Script');
    console.log('==============================\n');
    
    const environment = getBuildEnvironment();
    console.log(`🎯 Target Environment: ${environment}\n`);
    
    try {
        // Validate deployment configuration
        validateDeploymentConfig(environment);
        console.log('✅ Deployment configuration is valid\n');
        
        // Validate environment file
        const envFile = validateEnvironmentFile(environment);
        console.log(`✅ Environment file found: ${envFile}\n`);
        
        // Validate environment configuration
        const envConfig = parseEnvFile(envFile);
        const configValid = validateConfig(envConfig, environment);
        
        if (!configValid) {
            console.error('❌ Environment configuration validation failed');
            process.exit(1);
        }
        
        // Run pre-build checks
        runPreBuildChecks(environment);
        console.log('');
        
        // Generate build info
        const buildInfo = generateBuildInfo(environment);
        console.log('');
        
        // Clean build directory
        cleanBuildDirectory();
        console.log('');
        
        // Run build
        runBuild(environment);
        console.log('');
        
        // Post-build validation
        runPostBuildChecks(environment);
        console.log('');
        
        // Generate deployment summary
        generateDeploymentSummary(environment, buildInfo);
        
        console.log('\n🎉 Build completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Build failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}