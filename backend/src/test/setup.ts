// Jest setup file for global test configuration

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'file:./test.db';
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters-long';

// Set up test database
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

const testDbPath = path.join(__dirname, '../../prisma/test.db');

// Clean up test database before tests
if (existsSync(testDbPath)) {
  unlinkSync(testDbPath);
}

// Run migrations for test database
try {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
    cwd: path.join(__dirname, '../..'),
    stdio: 'pipe'
  });
} catch (error) {
  console.error('Failed to set up test database:', error);
}

// Global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});