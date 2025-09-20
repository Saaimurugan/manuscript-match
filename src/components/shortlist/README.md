# Shortlist Components

This directory contains React components for managing reviewer shortlists in the ScholarFinder application.

## Components

### ShortlistManager
Main component for displaying and managing all shortlists for a process.

**Props:**
- `processId: string` - The ID of the process to manage shortlists for
- `availableReviewers?: Array<{ id: string; name: string; email?: string }>` - Available reviewers for selection

**Features:**
- Display all shortlists for a process
- Create new shortlists
- Edit existing shortlists
- Export shortlists in multiple formats
- Delete shortlists with confirmation

### CreateShortlistDialog
Dialog component for creating new shortlists.

**Props:**
- `open: boolean` - Whether the dialog is open
- `onOpenChange: (open: boolean) => void` - Callback when dialog open state changes
- `processId: string` - The process ID
- `availableReviewers: Array<{ id: string; name: string; email?: string }>` - Available reviewers

**Features:**
- Name input with validation
- Reviewer selection with search functionality
- Select all/deselect all options
- Form validation and error handling

### EditShortlistDialog
Dialog component for editing existing shortlists.

**Props:**
- `open: boolean` - Whether the dialog is open
- `onOpenChange: (open: boolean) => void` - Callback when dialog open state changes
- `processId: string` - The process ID
- `shortlist: Shortlist` - The shortlist to edit
- `availableReviewers: Array<{ id: string; name: string; email?: string }>` - Available reviewers

**Features:**
- Pre-populated form with existing shortlist data
- Change detection to enable/disable save button
- Reviewer selection with search functionality
- Form validation and error handling

### ExportShortlistDialog
Dialog component for exporting shortlists in different formats.

**Props:**
- `open: boolean` - Whether the dialog is open
- `onOpenChange: (open: boolean) => void` - Callback when dialog open state changes
- `processId: string` - The process ID
- `shortlist: Shortlist` - The shortlist to export

**Features:**
- Format selection (CSV, XLSX, DOCX)
- Format descriptions and recommendations
- Export preview information
- Download initiation

### ShortlistCard
Card component for displaying individual shortlist information.

**Props:**
- `shortlist: Shortlist` - The shortlist to display
- `onEdit: (shortlist: Shortlist) => void` - Callback when edit is clicked
- `onExport: (shortlist: Shortlist) => void` - Callback when export is clicked
- `onDelete: (shortlist: Shortlist) => void` - Callback when delete is clicked
- `isDeleting?: boolean` - Whether the shortlist is being deleted

**Features:**
- Shortlist name and metadata display
- Creation and update date formatting
- Reviewer count badge
- Action buttons (edit, export, delete)

## Usage Example

```tsx
import { ShortlistManager } from './components/shortlist/ShortlistManager';

function ProcessPage({ processId }: { processId: string }) {
  const availableReviewers = [
    { id: '1', name: 'Dr. Jane Smith', email: 'jane@university.edu' },
    { id: '2', name: 'Prof. John Doe', email: 'john@research.org' }
  ];

  return (
    <div>
      <h1>Process Management</h1>
      <ShortlistManager 
        processId={processId}
        availableReviewers={availableReviewers}
      />
    </div>
  );
}
```

## Backend Integration

These components integrate with the backend through:

- `useShortlists` hook for fetching shortlists
- `useCreateShortlist` hook for creating shortlists
- `useUpdateShortlist` hook for updating shortlists
- `useDeleteShortlist` hook for deleting shortlists
- `useExportShortlist` hook for exporting shortlists

## API Endpoints

- `GET /api/processes/:id/shortlists` - Get all shortlists
- `GET /api/processes/:id/shortlists/:shortlistId` - Get specific shortlist
- `POST /api/processes/:id/shortlists` - Create shortlist
- `PUT /api/processes/:id/shortlists/:shortlistId` - Update shortlist
- `DELETE /api/processes/:id/shortlists/:shortlistId` - Delete shortlist
- `GET /api/processes/:id/shortlists/:shortlistId/export/:format` - Export shortlist

## Export Formats

The components support three export formats:

1. **CSV** - Simple comma-separated values format
2. **XLSX** - Microsoft Excel format with formatting
3. **DOCX** - Microsoft Word document format

Each format includes:
- Reviewer names and contact information
- Affiliation and institutional details
- Publication counts and expertise areas
- Validation status and conflict checks
- Match scores and recommendation rankings

## Error Handling

All components include comprehensive error handling:
- Form validation with user-friendly messages
- API error handling with toast notifications
- Loading states during operations
- Confirmation dialogs for destructive actions

## Testing

Components can be tested using React Testing Library:

```tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShortlistManager } from './ShortlistManager';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

test('renders shortlist manager', () => {
  render(
    <QueryClientProvider client={queryClient}>
      <ShortlistManager processId="test-process" />
    </QueryClientProvider>
  );
  
  expect(screen.getByText('Reviewer Shortlists')).toBeInTheDocument();
});
```