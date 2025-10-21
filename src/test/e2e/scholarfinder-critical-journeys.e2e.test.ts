/**
 * End-to-end tests for critical ScholarFinder user journeys
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('ScholarFinder Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application and login
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('Complete manuscript analysis workflow - Happy path', async ({ page }) => {
    // Create new process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Critical Journey Test');
    await page.fill('[data-testid="process-description-input"]', 'Testing complete workflow');
    await page.click('[data-testid="create-process-submit"]');

    // Start the workflow
    await page.click('[data-testid="start-process-button"]');

    // Step 1: Upload manuscript
    await expect(page.locator('[data-testid="upload-step"]')).toBeVisible();
    
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');

    // Step 2: Review metadata
    await expect(page.locator('[data-testid="metadata-step"]')).toBeVisible();
    
    // Verify extracted metadata is displayed
    await expect(page.locator('[data-testid="title-input"]')).toHaveValue(/test/i);
    await expect(page.locator('[data-testid="abstract-textarea"]')).not.toBeEmpty();
    
    // Edit metadata if needed
    await page.fill('[data-testid="title-input"]', 'Updated Test Manuscript Title');
    await page.click('[data-testid="continue-button"]');

    // Step 3: Keyword enhancement
    await expect(page.locator('[data-testid="keyword-step"]')).toBeVisible();
    
    await page.click('[data-testid="enhance-keywords-button"]');
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();
    
    // Select keywords
    await page.check('[data-testid="primary-keyword-0"]');
    await page.check('[data-testid="primary-keyword-1"]');
    await page.check('[data-testid="secondary-keyword-0"]');
    
    await page.click('[data-testid="continue-button"]');

    // Step 4: Database search
    await expect(page.locator('[data-testid="search-step"]')).toBeVisible();
    
    // Select databases
    await page.check('[data-testid="database-pubmed"]');
    await page.check('[data-testid="database-elsevier"]');
    
    await page.click('[data-testid="start-search-button"]');
    await expect(page.locator('[data-testid="search-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-completed"]')).toBeVisible({ timeout: 60000 });
    
    // Verify search results
    await expect(page.locator('[data-testid="search-results-summary"]')).toContainText(/found/i);
    await page.click('[data-testid="continue-button"]');

    // Step 5: Manual reviewer addition (optional)
    await expect(page.locator('[data-testid="manual-step"]')).toBeVisible();
    
    // Add a manual reviewer
    await page.fill('[data-testid="author-search-input"]', 'John Smith');
    await page.click('[data-testid="search-author-button"]');
    await expect(page.locator('[data-testid="author-search-results"]')).toBeVisible();
    
    // Select first result
    await page.click('[data-testid="select-author-0"]');
    await expect(page.locator('[data-testid="author-added-success"]')).toBeVisible();
    
    await page.click('[data-testid="continue-button"]');

    // Step 6: Author validation
    await expect(page.locator('[data-testid="validation-step"]')).toBeVisible();
    
    await page.click('[data-testid="validate-authors-button"]');
    await expect(page.locator('[data-testid="validation-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-completed"]')).toBeVisible({ timeout: 90000 });
    
    // Verify validation results
    await expect(page.locator('[data-testid="validation-summary"]')).toContainText(/validated/i);
    await page.click('[data-testid="continue-button"]');

    // Step 7: Review recommendations
    await expect(page.locator('[data-testid="recommendations-step"]')).toBeVisible();
    
    // Verify reviewer table is displayed
    await expect(page.locator('[data-testid="reviewer-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="reviewer-row"]').first()).toBeVisible();
    
    // Apply filters
    await page.click('[data-testid="filter-button"]');
    await page.selectOption('[data-testid="country-filter"]', 'US');
    await page.fill('[data-testid="min-publications-filter"]', '10');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Select reviewers for shortlist
    await page.check('[data-testid="reviewer-select-0"]');
    await page.check('[data-testid="reviewer-select-1"]');
    await page.check('[data-testid="reviewer-select-2"]');
    
    await expect(page.locator('[data-testid="selection-count"]')).toContainText('3');
    await page.click('[data-testid="continue-button"]');

    // Step 8: Shortlist management
    await expect(page.locator('[data-testid="shortlist-step"]')).toBeVisible();
    
    // Verify selected reviewers are shown
    await expect(page.locator('[data-testid="shortlist-reviewer"]')).toHaveCount(3);
    
    // Reorder reviewers
    await page.dragAndDrop(
      '[data-testid="shortlist-reviewer-0"]',
      '[data-testid="shortlist-reviewer-1"]'
    );
    
    // Remove one reviewer
    await page.click('[data-testid="remove-reviewer-2"]');
    await expect(page.locator('[data-testid="shortlist-reviewer"]')).toHaveCount(2);
    
    await page.click('[data-testid="continue-button"]');

    // Step 9: Export results
    await expect(page.locator('[data-testid="export-step"]')).toBeVisible();
    
    // Export as CSV
    await page.click('[data-testid="export-csv-button"]');
    
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    
    // Export as Excel
    await page.click('[data-testid="export-excel-button"]');
    
    const excelDownloadPromise = page.waitForEvent('download');
    const excelDownload = await excelDownloadPromise;
    expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/);
    
    // Verify workflow completion
    await expect(page.locator('[data-testid="workflow-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="completion-message"]')).toContainText(/successfully/i);
  });

  test('Error recovery and retry mechanisms', async ({ page }) => {
    // Create process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Error Recovery Test');
    await page.click('[data-testid="create-process-submit"]');
    await page.click('[data-testid="start-process-button"]');

    // Test file upload error recovery
    const invalidFileInput = page.locator('[data-testid="file-input"]');
    const invalidFilePath = path.join(__dirname, '../fixtures/invalid-file.txt');
    await invalidFileInput.setInputFiles(invalidFilePath);
    
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-upload-button"]')).toBeVisible();
    
    // Retry with valid file
    const validFileInput = page.locator('[data-testid="file-input"]');
    const validFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await validFileInput.setInputFiles(validFilePath);
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');

    // Simulate network error during keyword enhancement
    await page.route('**/api/scholarfinder/keyword_enhancement', route => {
      route.abort('failed');
    });

    await page.click('[data-testid="continue-button"]'); // Skip metadata
    await page.click('[data-testid="enhance-keywords-button"]');
    
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Remove network error and retry
    await page.unroute('**/api/scholarfinder/keyword_enhancement');
    await page.click('[data-testid="retry-button"]');
    
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();
  });

  test('Workflow state persistence and recovery', async ({ page }) => {
    // Start workflow
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Persistence Test');
    await page.click('[data-testid="create-process-submit"]');
    await page.click('[data-testid="start-process-button"]');

    // Complete first few steps
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');
    
    // Edit metadata
    await page.fill('[data-testid="title-input"]', 'Persistence Test Manuscript');
    await page.click('[data-testid="continue-button"]');
    
    // Enhance keywords
    await page.click('[data-testid="enhance-keywords-button"]');
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();

    // Simulate page refresh
    await page.reload();
    
    // Should resume from keywords step
    await expect(page.locator('[data-testid="keyword-step"]')).toBeVisible();
    await expect(page.locator('[data-testid="enhanced-keywords"]')).toBeVisible();
    
    // Verify metadata is preserved
    await page.click('[data-testid="previous-button"]');
    await expect(page.locator('[data-testid="title-input"]')).toHaveValue('Persistence Test Manuscript');
    
    // Navigate back to keywords
    await page.click('[data-testid="continue-button"]');
    
    // Should be able to continue from where left off
    await page.check('[data-testid="primary-keyword-0"]');
    await page.click('[data-testid="continue-button"]');
    
    await expect(page.locator('[data-testid="search-step"]')).toBeVisible();
  });

  test('Accessibility compliance throughout workflow', async ({ page }) => {
    // Create process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Accessibility Test');
    await page.click('[data-testid="create-process-submit"]');
    await page.click('[data-testid="start-process-button"]');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'file-input');
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Previous');
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText(/continue/i);

    // Test screen reader announcements
    const fileInput = page.locator('[data-testid="file-input"]');
    await expect(fileInput).toHaveAttribute('aria-label');
    await expect(fileInput).toHaveAttribute('aria-describedby');

    // Upload file and test announcements
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);
    
    // Should announce upload success
    await expect(page.locator('[role="status"]')).toContainText(/success/i);
    
    await page.click('[data-testid="continue-button"]');

    // Test form accessibility
    const titleInput = page.locator('[data-testid="title-input"]');
    await expect(titleInput).toHaveAttribute('aria-label');
    
    const abstractTextarea = page.locator('[data-testid="abstract-textarea"]');
    await expect(abstractTextarea).toHaveAttribute('aria-label');

    // Test error announcements
    await page.fill('[data-testid="title-input"]', '');
    await page.click('[data-testid="continue-button"]');
    
    await expect(page.locator('[role="alert"]')).toContainText(/required/i);
  });

  test('Performance under load - Large dataset handling', async ({ page }) => {
    // Create process
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', 'Performance Test');
    await page.click('[data-testid="create-process-submit"]');
    await page.click('[data-testid="start-process-button"]');

    // Complete initial steps quickly
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    await page.click('[data-testid="continue-button"]');
    await page.click('[data-testid="continue-button"]'); // Skip metadata
    await page.click('[data-testid="continue-button"]'); // Skip keywords

    // Perform database search (should return large dataset)
    await page.check('[data-testid="database-pubmed"]');
    await page.check('[data-testid="database-elsevier"]');
    await page.check('[data-testid="database-wiley"]');
    
    const searchStartTime = Date.now();
    await page.click('[data-testid="start-search-button"]');
    
    // Should handle search progress efficiently
    await expect(page.locator('[data-testid="search-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-completed"]')).toBeVisible({ timeout: 120000 });
    
    const searchEndTime = Date.now();
    const searchDuration = searchEndTime - searchStartTime;
    
    // Search should complete within reasonable time
    expect(searchDuration).toBeLessThan(120000); // 2 minutes max
    
    await page.click('[data-testid="continue-button"]');
    await page.click('[data-testid="continue-button"]'); // Skip manual
    
    // Validation should handle large dataset
    const validationStartTime = Date.now();
    await page.click('[data-testid="validate-authors-button"]');
    await expect(page.locator('[data-testid="validation-completed"]')).toBeVisible({ timeout: 180000 });
    
    const validationEndTime = Date.now();
    const validationDuration = validationEndTime - validationStartTime;
    
    expect(validationDuration).toBeLessThan(180000); // 3 minutes max
    
    await page.click('[data-testid="continue-button"]');

    // Reviewer table should handle large dataset with virtualization
    await expect(page.locator('[data-testid="reviewer-table"]')).toBeVisible();
    
    // Should be able to scroll through large dataset smoothly
    const tableStartTime = Date.now();
    await page.locator('[data-testid="reviewer-table"]').scrollIntoViewIfNeeded();
    
    // Apply filters to large dataset
    await page.click('[data-testid="filter-button"]');
    await page.fill('[data-testid="min-publications-filter"]', '50');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Filtering should be responsive
    await expect(page.locator('[data-testid="filter-results"]')).toBeVisible({ timeout: 5000 });
    
    const tableEndTime = Date.now();
    const tableDuration = tableEndTime - tableStartTime;
    
    // Table operations should be fast
    expect(tableDuration).toBeLessThan(10000); // 10 seconds max
  });

  test('Cross-browser compatibility', async ({ page, browserName }) => {
    // Test basic functionality across browsers
    await page.click('[data-testid="create-process-button"]');
    await page.fill('[data-testid="process-title-input"]', `${browserName} Test`);
    await page.click('[data-testid="create-process-submit"]');
    await page.click('[data-testid="start-process-button"]');

    // File upload should work in all browsers
    const fileInput = page.locator('[data-testid="file-input"]');
    const testFilePath = path.join(__dirname, '../fixtures/test-manuscript.pdf');
    await fileInput.setInputFiles(testFilePath);
    
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible();
    
    // Form interactions should work consistently
    await page.click('[data-testid="continue-button"]');
    await page.fill('[data-testid="title-input"]', `${browserName} Test Title`);
    
    // CSS and layout should render correctly
    const titleInput = page.locator('[data-testid="title-input"]');
    const boundingBox = await titleInput.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(200);
    expect(boundingBox?.height).toBeGreaterThan(30);
    
    // JavaScript functionality should work
    await page.click('[data-testid="continue-button"]');
    await expect(page.locator('[data-testid="keyword-step"]')).toBeVisible();
  });
});