/**
 * ErrorLogger Verification Script
 * Simple verification that ErrorLogger functionality works correctly
 */

import { ErrorLogger, LogLevel, ExternalServices } from '../services/errorLogger';

// Test basic functionality
console.log('🧪 Testing ErrorLogger functionality...');

// Create a test logger instance
const testLogger = new ErrorLogger({
  minLevel: LogLevel.DEBUG,
  enableConsoleLogging: true,
  enableLocalStorage: true,
  enableRemoteLogging: false,
});

// Test basic logging methods
console.log('\n📝 Testing basic logging methods...');
testLogger.debug('Debug message test', { test: 'debug' });
testLogger.info('Info message test', { test: 'info' });
testLogger.warn('Warning message test', { test: 'warning' });

// Test error logging
console.log('\n🚨 Testing error logging...');
const testError = new Error('Test error for verification');
testError.stack = `Error: Test error for verification
    at testFunction (verification.ts:25:20)
    at main (verification.ts:50:5)`;

testLogger.error('Error message test', testError, undefined, { test: 'error' });
testLogger.critical('Critical message test', testError, undefined, { test: 'critical' });

// Test configuration
console.log('\n⚙️ Testing configuration...');
const config = testLogger.getConfig();
console.log('Current config:', {
  minLevel: LogLevel[config.minLevel],
  enableConsoleLogging: config.enableConsoleLogging,
  enableLocalStorage: config.enableLocalStorage,
});

// Test statistics
console.log('\n📊 Testing statistics...');
const stats = testLogger.getLogStatistics();
console.log('Log statistics:', stats);

// Test local storage
console.log('\n💾 Testing local storage...');
const entries = testLogger.getLocalLogEntries();
console.log(`Found ${entries.length} log entries in local storage`);

if (entries.length > 0) {
  console.log('Sample entry:', {
    level: LogLevel[entries[0].level],
    message: entries[0].message,
    timestamp: entries[0].timestamp,
  });
}

// Test external service configuration
console.log('\n🌐 Testing external service configuration...');
const sentryService = ExternalServices.Sentry('test-dsn');
console.log('Sentry service config:', {
  name: sentryService.name,
  endpoint: sentryService.endpoint,
  enabled: sentryService.enabled,
});

const customService = ExternalServices.CustomAPI('https://api.test.com/logs', 'test-key');
console.log('Custom API service config:', {
  name: customService.name,
  endpoint: customService.endpoint,
  apiKey: customService.apiKey,
});

// Test configuration update
console.log('\n🔄 Testing configuration update...');
testLogger.updateConfig({
  minLevel: LogLevel.WARN,
  maxLocalStorageEntries: 50,
});

const updatedConfig = testLogger.getConfig();
console.log('Updated config:', {
  minLevel: LogLevel[updatedConfig.minLevel],
  maxLocalStorageEntries: updatedConfig.maxLocalStorageEntries,
});

// Test data sanitization
console.log('\n🔒 Testing data sanitization...');
testLogger.info('Testing sensitive data sanitization', {
  email: 'user@example.com',
  password: 'secret123',
  token: 'abc123token',
  creditCard: '1234-5678-9012-3456',
  normalData: 'this should not be sanitized',
});

// Cleanup
console.log('\n🧹 Cleaning up...');
testLogger.clearLocalLogEntries();
testLogger.destroy();

console.log('\n✅ ErrorLogger verification completed successfully!');

export default testLogger;