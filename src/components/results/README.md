# Results Components

This directory contains components for displaying and managing reviewer recommendation results.

## Components

### ReviewerResults

The main component for displaying reviewer recommendations with advanced filtering, sorting, and pagination capabilities.

#### Features

- **Real-time Backend Integration**: Fetches data from the backend API with proper error handling
- **Advanced Filtering**: Filter by publication count, country, expertise area, and database
- **Dynamic Sorting**: Sort by match score, publication count, or name with ascending/descending options
- **Pagination**: Handle large result sets with configurable page sizes
- **Bulk Selection**: Select individual reviewers or all reviewers for export
- **Export Functionality**: Export selected reviewers with activity logging
- **Responsive Design**: Works on desktop and mobile devices

#### Usage

```tsx
import { ReviewerResults } from '@/components/results/ReviewerResults';

function RecommendationsPage() {
  const handleExport = (selectedReviewers: Reviewer[]) => {
    // Handle export logic
    console.log('Exporting reviewers:', selectedReviewers);
  };

  return (
    <ReviewerResults 
      processId="your-process-id"
      onExport={handleExport}
    />
  );
}
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | `string` | Yes | The ID of the process to fetch recommendations for |
| `onExport` | `(reviewers: Reviewer[]) => void` | No | Callback function called when reviewers are exported |

#### Backend Integration

The component integrates with the following backend endpoints:

- `GET /api/processes/:id/recommendations` - Fetch recommendations with filtering, sorting, and pagination
- `GET /api/processes/:id/recommendations/filters` - Get available filter options

#### Filtering Options

- **Publication Count**: Range slider to filter by minimum and maximum publications
- **Country**: Dropdown to filter by reviewer country
- **Database**: Filter by source database (PubMed, Elsevier, etc.)
- **Expertise Area**: Filter by specific expertise areas
- **Search**: Text search across name, affiliation, and expertise

#### Sorting Options

- **Match Score**: Sort by relevance/match score (default)
- **Publication Count**: Sort by number of publications
- **Name**: Sort alphabetically by reviewer name
- **Country**: Sort by country name

Each sort option supports both ascending and descending order.

#### Pagination

- Configurable page sizes: 10, 20, 50, or 100 reviewers per page
- Navigation with Previous/Next buttons
- Page information display
- Automatic prefetching of next page for better performance

#### Selection and Export

- Individual reviewer selection with checkboxes
- "Select All" functionality for current page
- Export counter shows number of selected reviewers
- Activity logging for export actions
- Error handling for export failures

#### Error Handling

- Loading states with skeleton components
- Error boundaries for graceful error recovery
- Toast notifications for user feedback
- Retry mechanisms for failed requests
- Fallback UI for empty states

#### Performance Optimizations

- React Query for caching and background updates
- Debounced search input
- Prefetching of filtered results
- Virtual scrolling for large datasets (planned)
- Memoized filter options calculation

#### Accessibility

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus management

#### Testing

The component includes comprehensive tests covering:

- Basic rendering and data display
- Filtering functionality
- Sorting behavior
- Pagination controls
- Selection and export features
- Error states and loading states
- Backend integration
- Accessibility features

Run tests with:

```bash
npm test src/components/results/__tests__/ReviewerResults.test.tsx
```

#### Styling

The component uses Tailwind CSS with shadcn/ui components for consistent styling:

- Responsive grid layouts
- Consistent spacing and typography
- Theme-aware colors
- Smooth animations and transitions
- Mobile-first design approach

#### Future Enhancements

- Virtual scrolling for very large datasets
- Advanced search with boolean operators
- Saved filter presets
- Bulk actions beyond export
- Real-time updates via WebSocket
- Collaborative features for team reviews