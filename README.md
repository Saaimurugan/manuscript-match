# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2a2efe7b-8df1-475e-9985-c0401aea2044

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2a2efe7b-8df1-475e-9985-c0401aea2044) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## 🧪 Automated Test Reporting

This project includes a comprehensive automated test reporting system that generates detailed HTML and Markdown reports for all test executions.

### Features

- **Multi-format Reports**: Generates both HTML and Markdown reports
- **Real-time Integration**: Automatically runs after test execution
- **Comprehensive Coverage**: Includes unit, integration, and E2E test results
- **Interactive HTML Reports**: Collapsible sections, progress bars, and detailed metrics
- **CI/CD Compatible**: Works seamlessly in automated environments
- **Performance Metrics**: Tracks test execution times and coverage statistics

### Quick Start

Run tests with automatic report generation:

```bash
# Run all tests and generate reports
npm run test:all

# Run specific test categories
npm run test              # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e         # End-to-end tests only

# Generate reports without running tests
npm run test:report
```

### Generated Reports

Reports are automatically saved to the `test-reports/` directory:

- `test-report.html` - Interactive HTML report with charts and metrics
- `comprehensive-test-report.md` - Detailed Markdown report
- `test-results.json` - Raw test data for further processing

### Configuration

The test reporting system can be configured via `test-reporting.config.js`:

```javascript
module.exports = {
  // Output directory for reports
  outputDir: './test-reports',
  
  // Report formats to generate
  formats: ['html', 'markdown'],
  
  // Include coverage metrics
  includeCoverage: true,
  
  // Custom styling for HTML reports
  htmlTemplate: {
    title: 'ScholarFinder Test Report',
    theme: 'modern',
    includeCharts: true
  },
  
  // Markdown report options
  markdownOptions: {
    includeEmojis: true,
    detailedFailures: true,
    performanceMetrics: true
  }
};
```

### Integration with CI/CD

The reporting system is designed to work seamlessly in CI/CD environments:

```yaml
# Example GitHub Actions integration
- name: Run Tests and Generate Reports
  run: npm run test:ci
  
- name: Upload Test Reports
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: test-reports/
```

### Troubleshooting

**Common Issues:**

1. **Reports not generating**: Ensure all dependencies are installed with `npm install`
2. **Permission errors**: Check write permissions for the `test-reports/` directory
3. **Missing coverage data**: Run tests with `--coverage` flag
4. **Template errors**: Verify `test-reporting.config.js` syntax

**Debug Mode:**

Enable detailed logging by setting the environment variable:
```bash
DEBUG_TEST_REPORTING=true npm run test:all
```

### Extending Report Formats

To add custom report formats, create a new generator class:

```typescript
import { ReportGenerator } from './src/test/reporting/ReportGenerator';

class CustomReportGenerator implements ReportGenerator {
  async generate(testResults: TestResults): Promise<void> {
    // Your custom report generation logic
  }
}
```

For more details, see the [Developer Guide](docs/test-reporting-developer-guide.md).

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2a2efe7b-8df1-475e-9985-c0401aea2044) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
