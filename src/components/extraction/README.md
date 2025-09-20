# Data Extraction Component

The `DataExtraction` component displays and manages extracted metadata from uploaded manuscripts with real backend integration and editing capabilities.

## Features

- **Real-time Data Fetching**: Automatically fetches metadata from backend API
- **Editable Interface**: Allows users to edit extracted metadata
- **Loading States**: Shows skeleton loading while fetching data
- **Error Handling**: Graceful error handling with retry options
- **Optimistic Updates**: Immediate UI updates with backend synchronization
- **Comprehensive Display**: Shows title, abstract, keywords, authors, and affiliations

## Usage

```tsx
import { DataExtraction } from '@/components/extraction/DataExtraction';

const MyComponent = () => {
  return (
    <DataExtraction
      processId="your-process-id"
      fileName="manuscript.pdf"
    />
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | `string` | Yes | The ID of the process to fetch metadata for |
| `fileName` | `string` | No | Name of the uploaded file (for display) |

## Data Display

The component displays extracted metadata in organized sections:

### Title Section
- Displays the manuscript title
- Editable with inline text input
- Fallback message if no title extracted

### Abstract Section
- Shows the full abstract text
- Editable with textarea input
- Formatted display with background styling
- Fallback message if no abstract extracted

### Authors & Affiliations
- Lists all manuscript authors
- Shows author names, affiliations, and email addresses
- Displays affiliation details with country information
- Visual cards for each author

### Keywords Section
- Displays extracted keywords as badges
- Editable with add/remove functionality
- Interactive keyword management
- Fallback message if no keywords extracted

## Editing Features

### Edit Mode
- Toggle between view and edit modes
- Edit button in header
- Save/Cancel actions
- Loading states during updates

### Keyword Management
- Add new keywords by typing and pressing Enter
- Remove keywords by clicking the X icon
- Real-time validation and feedback

### Data Validation
- Client-side validation before saving
- Server-side validation with error feedback
- Optimistic updates with rollback on failure

## Backend Integration

The component integrates with multiple backend endpoints:

### Fetch Metadata
```
GET /api/processes/:id/metadata
Authorization: Bearer <jwt-token>
```

### Update Metadata
```
PUT /api/processes/:id/metadata
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "title": "Updated title",
  "abstract": "Updated abstract",
  "keywords": ["keyword1", "keyword2"]
}
```

## Loading States

The component shows different loading states:

### Initial Loading
- Skeleton placeholders for all sections
- Animated loading indicators
- Progress feedback

### Update Loading
- Spinner on save button
- Disabled form during updates
- Visual feedback for user actions

## Error Handling

Comprehensive error handling for various scenarios:

### Network Errors
- Connection timeout handling
- Retry mechanisms
- User-friendly error messages

### Validation Errors
- Field-specific error display
- Input validation feedback
- Server validation error handling

### Not Found Errors
- Graceful handling when no metadata exists
- Clear messaging about missing data
- Guidance for next steps

## State Management

Uses React Query for efficient state management:

### Caching
- Automatic caching of metadata
- Cache invalidation on updates
- Optimistic updates for better UX

### Synchronization
- Real-time sync with backend
- Conflict resolution
- Automatic retry on failures

## Styling

Built with Tailwind CSS and shadcn/ui:

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Adaptive spacing and sizing

### Visual Hierarchy
- Clear section separation
- Consistent typography
- Intuitive color coding

### Interactive Elements
- Hover states and transitions
- Focus management
- Loading animations

## Accessibility

Includes comprehensive accessibility features:

### Keyboard Navigation
- Tab order management
- Keyboard shortcuts
- Focus indicators

### Screen Reader Support
- ARIA labels and descriptions
- Semantic HTML structure
- Status announcements

### Visual Accessibility
- High contrast support
- Scalable text and icons
- Clear visual feedback

## Performance

Optimized for performance:

### Lazy Loading
- Conditional rendering based on data availability
- Efficient re-rendering
- Memory management

### Debounced Updates
- Prevents excessive API calls
- Smooth user experience
- Efficient network usage

## Testing

Test the component with various scenarios:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataExtraction } from './DataExtraction';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQuery = (component) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

// Test loading state
test('shows loading skeleton', () => {
  renderWithQuery(<DataExtraction processId="test-id" />);
  expect(screen.getByTestId('metadata-skeleton')).toBeInTheDocument();
});

// Test error handling
test('handles fetch errors', async () => {
  // Mock API error
  renderWithQuery(<DataExtraction processId="invalid-id" />);
  await waitFor(() => {
    expect(screen.getByText(/extraction error/i)).toBeInTheDocument();
  });
});

// Test editing functionality
test('allows metadata editing', async () => {
  renderWithQuery(<DataExtraction processId="test-id" />);
  
  await waitFor(() => {
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });
  
  fireEvent.click(screen.getByText('Edit'));
  expect(screen.getByText('Save')).toBeInTheDocument();
});
```

## Integration with Other Components

### FileUpload Component
- Automatically triggers metadata extraction after upload
- Provides process ID for data fetching
- Coordinates workflow progression

### ProcessWorkflow Component
- Integrates into the manuscript analysis workflow
- Manages step progression
- Provides context and navigation

### Keyword Enhancement
- Extracted keywords feed into enhancement process
- Bidirectional data flow
- Synchronized state management

## Configuration

Configure behavior via environment variables:

```env
# API endpoints
VITE_API_BASE_URL=http://localhost:3001

# Cache settings
VITE_METADATA_CACHE_TIME=600000  # 10 minutes

# Update debounce time
VITE_METADATA_UPDATE_DEBOUNCE=500  # 500ms
```

## Related Components

- [`FileUpload`](../upload/README.md) - File upload with metadata extraction
- [`ProcessWorkflow`](../process/README.md) - Complete workflow management
- [`KeywordEnhancement`](../keywords/README.md) - Keyword processing
- [`FileService`](../../services/README.md) - Backend API integration

## Examples

See [`fileUploadUsage.tsx`](../../examples/fileUploadUsage.tsx) for a complete integration example with file upload and metadata extraction.