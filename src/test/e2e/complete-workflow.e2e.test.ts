/**
 * End-to-end tests for complete manuscript analysis workflow
 * Tests the full user journey from login to shortlist creation
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Complete Manuscript Analysis Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full workflow from login to shortlist creation', async ({ page }) => {
    // Step 1: Login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Step 2: Create new process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'E2E Test Process');
    await page.fill('[data-testid="process-description-input"]', 'End-to-end test process');
    await page.click('[data-testid="create-process-submit"]');

    // Wait for process to be created
    await expect(page.locator('text=E2E Test Process')).toBeVisible();

    // Step 3: Upload manuscript file
    await page.click('[data-testid="start-process-button"]');
    
    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);

    // Wait for upload to complete
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');

    // Step 4: Review and edit metadata
    await expect(page.locator('[data-testid="metadata-form"]')).toBeVisible();
    
    // Edit title if needed
    const titleInput = page.locator('[data-testid="title-input"]');
    await titleInput.fill('Updated Manuscript Title');
    
    // Continue to next step
    await page.click('[data-testid="continue-button"]');

    // Step 5: Enhance keywords
    await expect(page.locator('[data-testid="keyword-enhancement"]')).toBeVisible();
    
    // Start keyword enhancement
    await page.click('[data-testid="enhance-keywords-button"]');
    
    // Wait for enhancement to complete
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();
    
    // Select keywords
    await page.check('[data-testid="keyword-checkbox-0"]');
    await page.check('[data-testid="keyword-checkbox-1"]');
    
    // Continue to next step
    await page.click('[data-testid="continue-button"]');

    // Step 6: Database search
    await expect(page.locator('[data-testid="database-search"]')).toBeVisible();
    
    // Select databases
    await page.check('[data-testid="database-pubmed"]');
    await page.check('[data-testid="database-elsevier"]');
    
    // Start search
    await page.click('[data-testid="start-search-button"]');
    
    // Wait for search to complete
    await expect(page.locator('[data-testid="search-completed"]')).toBeVisible({ timeout: 30000 });
    
    // Continue to next step
    await page.click('[data-testid="continue-button"]');

    // Step 7: Author validation
    await expect(page.locator('[data-testid="author-validation"]')).toBeVisible();
    
    // Configure validation rules
    await page.fill('[data-testid="min-publications-input"]', '5');
    
    // Start validation
    await page.click('[data-testid="validate-authors-button"]');
    
    // Wait for validation to complete
    await expect(page.locator('[data-testid="validation-completed"]')).toBeVisible({ timeout: 30000 });
    
    // Continue to next step
    await page.click('[data-testid="continue-button"]');

    // Step 8: Review recommendations
    await expect(page.locator('[data-testid="reviewer-results"]')).toBeVisible();
    
    // Apply filters
    await page.selectOption('[data-testid="country-filter"]', 'US');
    await page.fill('[data-testid="min-score-filter"]', '0.8');
    
    // Wait for filtered results
    await expect(page.locator('[data-testid="reviewer-card"]').first()).toBeVisible();
    
    // Select reviewers for shortlist
    await page.check('[data-testid="reviewer-select-0"]');
    await page.check('[data-testid="reviewer-select-1"]');
    await page.check('[data-testid="reviewer-select-2"]');

    // Step 9: Create shortlist
    await page.click('[data-testid="create-shortlist-button"]');
    await page.fill('[data-testid="shortlist-name-input"]', 'E2E Test Shortlist');
    await page.click('[data-testid="save-shortlist-button"]');
    
    // Wait for shortlist to be created
    await expect(page.locator('text=E2E Test Shortlist')).toBeVisible();

    // Step 10: Export shortlist
    await page.click('[data-testid="export-shortlist-button"]');
    await page.click('[data-testid="export-csv-button"]');
    
    // Wait for download to start
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');

    // Verify workflow completion
    await expect(page.locator('[data-testid="workflow-completed"]')).toBeVisible();
  });

  test('should handle errors gracefully during workflow', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Create process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Error Test Process');
    await page.fill('[data-testid="process-description-input"]', 'Testing error handling');
    await page.click('[data-testid="create-process-submit"]');

    await page.click('[data-testid="start-process-button"]');

    // Try to upload invalid file
    const fileInput = page.locator('[data-testid="file-input"]');
    const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt');
    await fileInput.setInputFiles(invalidFilePath);

    // Should show error message
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('text=Unsupported file type')).toBeVisible();

    // Should allow retry
    await expect(page.locator('[data-testid="retry-upload-button"]')).toBeVisible();
  });

  test('should save progress and allow resuming workflow', async ({ page }) => {
    // Login and start workflow
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Create and start process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Resume Test Process');
    await page.fill('[data-testid="process-description-input"]', 'Testing workflow resume');
    await page.click('[data-testid="create-process-submit"]');

    await page.click('[data-testid="start-process-button"]');

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');

    // Complete metadata step
    await expect(page.locator('[data-testid="metadata-form"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');

    // Now simulate page refresh
    await page.reload();

    // Should resume from keyword enhancement step
    await expect(page.locator('[data-testid="keyword-enhancement"]')).toBeVisible();
    
    // Process should still be accessible
    await expect(page.locator('text=Resume Test Process')).toBeVisible();
  });

  test('should handle network errors and retry mechanisms', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Simulate network error by intercepting requests
    await page.route('**/api/processes/*/keywords/enhance', route => {
      route.abort('failed');
    });

    // Create and start process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Network Error Test');
    await page.fill('[data-testid="process-description-input"]', 'Testing network error handling');
    await page.click('[data-testid="create-process-submit"]');

    await page.click('[data-testid="start-process-button"]');

    // Complete upload and metadata steps quickly
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');
    await page.click('[data-testid="continue-button"]');

    // Try keyword enhancement (should fail)
    await page.click('[data-testid="enhance-keywords-button"]');

    // Should show network error
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('text=Connection error')).toBeVisible();

    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Remove network error simulation
    await page.unroute('**/api/processes/*/keywords/enhance');

    // Retry should work
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();
  });

  test('should handle authentication expiration during workflow', async ({ page }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Start workflow
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Auth Expiry Test');
    await page.fill('[data-testid="process-description-input"]', 'Testing auth expiration');
    await page.click('[data-testid="create-process-submit"]');

    await page.click('[data-testid="start-process-button"]');

    // Simulate token expiration
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'AUTHENTICATION_ERROR',
          message: 'Token expired'
        })
      });
    });

    // Try to continue workflow
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);

    // Should redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('text=Your session has expired')).toBeVisible();
  });
});