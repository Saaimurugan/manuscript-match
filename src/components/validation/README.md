# Validation Components

This directory contains components for author validation functionality, allowing users to configure validation rules and view validation results with step-by-step breakdowns.

## Components

### AuthorValidation
Main component that orchestrates the entire validation process.

**Props:**
- `processId: string` - The ID of the process to validate
- `onValidationComplete?: () => void` - Callback when validation completes

**Features:**
- Configurable validation rules
- Real-time validation execution
- Results display with step-by-step breakdown
- Re-validation capabilities
- Error handling and loading states

### ValidationRulesForm
Form component for configuring validation rules.

**Props:**
- `rules: ValidationRequest['rules']` - Current validation rules
- `onChange: (rules: ValidationRequest['rules']) => void` - Rules change handler
- `disabled?: boolean` - Whether the form is disabled

**Features:**
- Conflict of interest rules (manuscript authors, co-authors, institutional conflicts)
- Quality requirements (minimum publications, maximum retractions)
- Real-time rule updates
- Descriptive help text for each rule

### ValidationResults
Component that displays overall validation results summary.

**Props:**
- `results: ValidationResults` - Validation results data

**Features:**
- Total candidates, validated reviewers, and excluded reviewers counts
- Validation success rate with progress bar
- Recommendations for low validation rates
- Color-coded status indicators

### ValidationStepDisplay
Component that shows detailed step-by-step validation results.

**Props:**
- `steps: ValidationResults['validationSteps']` - Step-by-step validation data
- `rules: ValidationRequest['rules']` - Validation rules used

**Features:**
- Step-by-step breakdown with icons and status indicators
- Progress bars for each validation step
- Pass/fail statistics for each step
- Rule-specific descriptions and status badges
- Handles disabled rules appropriately

## Usage Examples

### Basic Usage
```tsx
import { AuthorValidation } from '@/components/validation';

function ValidationPage({ processId }: { processId: string }) {
  const handleValidationComplete = () => {
    console.log('Validation completed!');
    // Navigate to next step or show success message
  };

  return (
    <AuthorValidation
      processId={processId}
      onValidationComplete={handleValidationComplete}
    />
  );
}
```

### Custom Validation Rules
```tsx
import { ValidationRulesForm } from '@/components/validation';
import { useState } from 'react';

function CustomValidationForm() {
  const [rules, setRules] = useState({
    excludeManuscriptAuthors: true,
    excludeCoAuthors: false,
    minimumPublications: 10,
    maxRetractions: 1,
    excludeInstitutionalConflicts: true,
  });

  return (
    <ValidationRulesForm
      rules={rules}
      onChange={setRules}
    />
  );
}
```

### Results Display
```tsx
import { ValidationResults, ValidationStepDisplay } from '@/components/validation';

function ValidationResultsPage({ results, rules }) {
  return (
    <div className="space-y-6">
      <ValidationResults results={results} />
      <ValidationStepDisplay steps={results.validationSteps} rules={rules} />
    </div>
  );
}
```

## Integration with Process Workflow

The validation components are integrated into the main process workflow at step 5:

```tsx
// In ProcessWorkflow.tsx
case 5:
  return (
    <AuthorValidation
      processId={processId}
      onValidationComplete={() => handleStepChange(6)}
    />
  );
```

## API Integration

The components use the `useValidation` hook which integrates with:
- `POST /api/processes/:id/validate` - Validate authors with rules
- `GET /api/processes/:id/validation/results` - Get validation results

## Error Handling

All components include comprehensive error handling:
- Network errors with retry options
- Validation errors with user-friendly messages
- Loading states during API calls
- Graceful fallbacks for missing data

## Testing

Each component includes comprehensive tests:
- Unit tests for individual components
- Integration tests for hook functionality
- Service layer tests for API communication
- Error scenario testing

Run tests with:
```bash
npm test validation
```

## Styling

Components use the established design system:
- Consistent card layouts
- Color-coded status indicators (green for success, red for errors, blue for info)
- Progress bars for visual feedback
- Responsive grid layouts
- Accessible form controls with proper labels