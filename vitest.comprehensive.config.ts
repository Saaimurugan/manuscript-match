/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './test-reports/coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/examples/**',
        '**/README.md'
      ],
      include: [
        'src/features/scholarfinder/**/*.{ts,tsx}',
        '!src/features/scholarfinder/**/__tests__/**',
        '!src/features/scholarfinder/**/examples/**'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Specific thresholds for critical components
        'src/features/scholarfinder/services/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/features/scholarfinder/hooks/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'src/features/scholarfinder/utils/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        }
      },
    },
    include: [
      'src/features/scholarfinder/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'src/test/e2e/**',
      'src/features/scholarfinder/examples/**'
    ],
    testTimeout: 30000, // 30 seconds for individual tests
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 5000, // 5 seconds for teardown
    // Retry failed tests once
    retry: 1,
    // Run tests in sequence for more predictable results
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    // Reporter configuration for comprehensive testing
    reporter: [
      'verbose',
      'json',
      'html',
      ['junit', { outputFile: './test-reports/junit-report.xml' }]
    ],
    outputFile: {
      json: './test-reports/test-results.json',
      html: './test-reports/test-results.html'
    },
    // Mock configuration
    deps: {
      inline: [
        '@testing-library/react',
        '@testing-library/user-event'
      ]
    },
    // Environment variables for testing
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3002',
      VITE_ENABLE_DEBUG_LOGGING: 'false'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@scholarfinder': path.resolve(__dirname, './src/features/scholarfinder')
    },
  },
  // Optimize for testing
  esbuild: {
    target: 'node14'
  }
});