/**
 * End-to-End Coverage Enhancement Tests
 * Addresses critical E2E coverage gaps (currently 78.9%)
 * Target: Increase to 85%+ coverage
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Complete User Workflows - E2E Coverage', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Mock API responses for consistent testing
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('/auth/login')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'mock-jwt-token',
            user: { id: '1', email: 'test@example.com', role: 'USER' }
          })
        });
      } else if (url.includes('/processes')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { id: '1', title: 'Test Analysis', status: 'ACTIVE', currentStep: 1 }
            ]
          })
        });
      } else {
        route.continue();
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should complete full manuscript analysis workflow', async () => {
    // Step 1: Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Verify login success
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Step 2: Create new analysis
    await page.click('[data-testid="new-analysis-button"]');
    await page.fill('[data-testid="analysis-title"]', 'Test Manuscript Analysis');
    await page.fill('[data-testid="analysis-description"]', 'Testing complete workflow');
    await page.click('[data-testid="create-analysis-button"]');
    
    // Verify analysis created
    await expect(page.locator('[data-testid="analysis-created-message"]')).toBeVisible();
    
    // Step 3: File Upload
    await page.click('[data-testid="upload-file-button"]');
    
    // Mock file upload
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test-manuscript.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    await page.click('[data-testid="start-upload-button"]');
    
    // Wait for upload completion
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
    
    // Step 4: Metadata Extraction
    await page.click('[data-testid="extract-metadata-button"]');
    
    // Wait for metadata extraction
    await expect(page.locator('[data-testid="metadata-extracted"]')).toBeVisible({ timeout: 15000 });
    
    // Verify extracted metadata is displayed
    await expect(page.locator('[data-testid="manuscript-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="manuscript-authors"]')).toBeVisible();
    await expect(page.locator('[data-testid="manuscript-abstract"]')).toBeVisible();
    
    // Step 5: Keyword Enhancement
    await page.click('[data-testid="enhance-keywords-button"]');
    
    // Wait for keyword enhancement
    await expect(page.locator('[data-testid="keywords-enhanced"]')).toBeVisible({ timeout: 10000 });
    
    // Select enhanced keywords
    await page.check('[data-testid="keyword-checkbox-0"]');
    await page.check('[data-testid="keyword-checkbox-1"]');
    await page.check('[data-testid="keyword-checkbox-2"]');
    
    await page.click('[data-testid="save-keyword-selection"]');
    
    // Step 6: Database Search
    await page.click('[data-testid="start-database-search"]');
    
    // Select databases
    await page.check('[data-testid="database-pubmed"]');
    await page.check('[data-testid="database-elsevier"]');
    
    await page.click('[data-testid="initiate-search-button"]');
    
    // Wait for search completion
    await expect(page.locator('[data-testid="search-completed"]')).toBeVisible({ timeout: 30000 });
    
    // Verify search results
    await expect(page.locator('[data-testid="search-results-count"]')).toContainText('found');
    
    // Step 7: Author Validation
    await page.click('[data-testid="validate-authors-button"]');
    
    // Configure validation rules
    await page.check('[data-testid="exclude-manuscript-authors"]');
    await page.check('[data-testid="exclude-co-authors"]');
    await page.fill('[data-testid="min-publications"]', '5');
    
    await page.click('[data-testid="start-validation-button"]');
    
    // Wait for validation completion
    await expect(page.locator('[data-testid="validation-completed"]')).toBeVisible({ timeout: 20000 });
    
    // Step 8: Reviewer Recommendations
    await page.click('[data-testid="generate-recommendations"]');
    
    // Wait for recommendations
    await expect(page.locator('[data-testid="recommendations-generated"]')).toBeVisible({ timeout: 15000 });
    
    // Apply filters
    await page.selectOption('[data-testid="country-filter"]', 'United States');
    await page.selectOption('[data-testid="expertise-filter"]', 'Machine Learning');
    
    // Sort by relevance
    await page.selectOption('[data-testid="sort-by"]', 'relevance');
    
    // Verify filtered results
    await expect(page.locator('[data-testid="reviewer-card"]').first()).toBeVisible();
    
    // Step 9: Create Shortlist
    await page.check('[data-testid="reviewer-select-0"]');
    await page.check('[data-testid="reviewer-select-1"]');
    await page.check('[data-testid="reviewer-select-2"]');
    
    await page.click('[data-testid="create-shortlist-button"]');
    await page.fill('[data-testid="shortlist-name"]', 'Final Reviewer Shortlist');
    await page.click('[data-testid="save-shortlist-button"]');
    
    // Verify shortlist created
    await expect(page.locator('[data-testid="shortlist-created"]')).toBeVisible();
    
    // Step 10: Export Results
    await page.click('[data-testid="export-shortlist"]');
    await page.selectOption('[data-testid="export-format"]', 'xlsx');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('shortlist');
    expect(download.suggestedFilename()).toContain('.xlsx');
    
    // Step 11: View Activity Log
    await page.click('[data-testid="activity-log-tab"]');
    
    // Verify activity log shows all steps
    await expect(page.locator('[data-testid="activity-item"]')).toHaveCount(10, { timeout: 5000 });
    
    // Verify workflow completion
    await expect(page.locator('[data-testid="workflow-status"]')).toContainText('Completed');
  });

  test('should handle workflow interruptions gracefully', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Start analysis
    await page.click('[data-testid="new-analysis-button"]');
    await page.fill('[data-testid="analysis-title"]', 'Interrupted Analysis');
    await page.click('[data-testid="create-analysis-button"]');
    
    // Start file upload
    await page.click('[data-testid="upload-file-button"]');
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test-manuscript.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF content')
    });
    
    await page.click('[data-testid="start-upload-button"]');
    
    // Simulate interruption - navigate away during upload
    await page.goto('/dashboard');
    
    // Return to analysis
    await page.click('[data-testid="analysis-item-0"]');
    
    // Verify recovery options are available
    await expect(page.locator('[data-testid="resume-upload"]')).toBeVisible();
    await expect(page.locator('[data-testid="restart-upload"]')).toBeVisible();
    
    // Test resume functionality
    await page.click('[data-testid="resume-upload"]');
    
    // Verify upload can be resumed
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
  });

  test('should support concurrent user operations', async () => {
    // This test simulates multiple browser contexts for concurrent operations
    const context2 = await page.context().browser()!.newContext();
    const page2 = await context2.newPage();
    
    // Setup same API mocking for second page
    await page2.route('**/api/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('/auth/login')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'mock-jwt-token-2',
            user: { id: '2', email: 'user2@example.com', role: 'USER' }
          })
        });
      } else {
        route.continue();
      }
    });
    
    // Login both users
    await Promise.all([
      // User 1
      (async () => {
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', 'user1@example.com');
        await page.fill('[data-testid="password-input"]', 'password123');
        await page.click('[data-testid="login-button"]');
        await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      })(),
      
      // User 2
      (async () => {
        await page2.goto('/login');
        await page2.fill('[data-testid="email-input"]', 'user2@example.com');
        await page2.fill('[data-testid="password-input"]', 'password123');
        await page2.click('[data-testid="login-button"]');
        await expect(page2.locator('[data-testid="dashboard"]')).toBeVisible();
      })()
    ]);
    
    // Both users create analyses simultaneously
    await Promise.all([
      // User 1 creates analysis
      (async () => {
        await page.click('[data-testid="new-analysis-button"]');
        await page.fill('[data-testid="analysis-title"]', 'User 1 Analysis');
        await page.click('[data-testid="create-analysis-button"]');
        await expect(page.locator('[data-testid="analysis-created-message"]')).toBeVisible();
      })(),
      
      // User 2 creates analysis
      (async () => {
        await page2.click('[data-testid="new-analysis-button"]');
        await page2.fill('[data-testid="analysis-title"]', 'User 2 Analysis');
        await page2.click('[data-testid="create-analysis-button"]');
        await expect(page2.locator('[data-testid="analysis-created-message"]')).toBeVisible();
      })()
    ]);
    
    // Verify both analyses were created independently
    await expect(page.locator('[data-testid="analysis-title"]')).toContainText('User 1 Analysis');
    await expect(page2.locator('[data-testid="analysis-title"]')).toContainText('User 2 Analysis');
    
    await context2.close();
  });

  test('should handle network connectivity issues', async () => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Start analysis
    await page.click('[data-testid="new-analysis-button"]');
    await page.fill('[data-testid="analysis-title"]', 'Network Test Analysis');
    await page.click('[data-testid="create-analysis-button"]');
    
    // Simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    // Try to perform an action that requires network
    await page.click('[data-testid="upload-file-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/**');
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click('[data-testid="retry-button"]');
    
    // Verify recovery
    await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="file-input"]')).toBeVisible();
  });

  test('should maintain state across browser refresh', async () => {
    // Login and create analysis
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    await page.click('[data-testid="new-analysis-button"]');
    await page.fill('[data-testid="analysis-title"]', 'Persistent Analysis');
    await page.click('[data-testid="create-analysis-button"]');
    
    // Get analysis ID for verification
    const analysisId = await page.locator('[data-testid="analysis-id"]').textContent();
    
    // Refresh the page
    await page.reload();
    
    // Verify user is still logged in (if using persistent auth)
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Verify analysis is still available
    await expect(page.locator('[data-testid="analysis-item"]').first()).toBeVisible();
    
    // Click on the analysis to verify it loads correctly
    await page.click('[data-testid="analysis-item"]');
    
    // Verify analysis details are preserved
    await expect(page.locator('[data-testid="analysis-title"]')).toContainText('Persistent Analysis');
  });

  test('should handle large dataset pagination', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Mock large dataset response
    await page.route('**/api/recommendations**', (route) => {
      const url = new URL(route.request().url());
      const page_num = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      const totalItems = 150; // Simulate 150 reviewers
      const totalPages = Math.ceil(totalItems / limit);
      
      const items = Array.from({ length: Math.min(limit, totalItems - (page_num - 1) * limit) }, (_, i) => ({
        id: `reviewer-${(page_num - 1) * limit + i + 1}`,
        name: `Dr. Reviewer ${(page_num - 1) * limit + i + 1}`,
        expertise: ['Machine Learning', 'AI'],
        publications: 25 + i
      }));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: items,
          pagination: {
            page: page_num,
            limit,
            total: totalItems,
            totalPages,
            hasNextPage: page_num < totalPages,
            hasPreviousPage: page_num > 1
          }
        })
      });
    });
    
    // Navigate to recommendations (assuming we have an analysis)
    await page.click('[data-testid="analysis-item"]');
    await page.click('[data-testid="recommendations-tab"]');
    
    // Verify first page loads
    await expect(page.locator('[data-testid="reviewer-card"]')).toHaveCount(20);
    await expect(page.locator('[data-testid="pagination-info"]')).toContainText('1 of 8');
    
    // Test pagination navigation
    await page.click('[data-testid="next-page"]');
    
    // Verify second page loads
    await expect(page.locator('[data-testid="pagination-info"]')).toContainText('2 of 8');
    await expect(page.locator('[data-testid="reviewer-card"]')).toHaveCount(20);
    
    // Test jump to last page
    await page.click('[data-testid="last-page"]');
    
    // Verify last page (should have 10 items: 150 - 7*20 = 10)
    await expect(page.locator('[data-testid="pagination-info"]')).toContainText('8 of 8');
    await expect(page.locator('[data-testid="reviewer-card"]')).toHaveCount(10);
    
    // Test previous page navigation
    await page.click('[data-testid="previous-page"]');
    await expect(page.locator('[data-testid="pagination-info"]')).toContainText('7 of 8');
  });
});