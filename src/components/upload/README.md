# File Upload Component

The `FileUpload` component provides a comprehensive file upload interface with real backend integration, progress tracking, and validation.

## Features

- **Drag & Drop Support**: Users can drag files directly onto the upload area
- **File Validation**: Comprehensive validation including type, size, and format checks
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Error Handling**: User-friendly error messages for various failure scenarios
- **Backend Integration**: Direct integration with ScholarFinder backend API
- **Responsive Design**: Works on desktop and mobile devices

## Usage

```tsx
import { FileUpload } from '@/components/upload/FileUpload';
import type { UploadResponse } from '@/types/api';

const MyComponent = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const handleFileUpload = (response: UploadResponse) => {
    console.log('File uploaded:', response);
    setUploadedFile({ name: response.fileName, size: response.fileSize } as File);
  };

  return (
    <FileUpload
      processId="your-process-id"
      onFileUpload={handleFileUpload}
      uploadedFile={uploadedFile}
    />
  );
};
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `processId` | `string` | Yes | The ID of the process to upload the file to |
| `onFileUpload` | `(response: UploadResponse) => void` | Yes | Callback called when file upload completes |
| `uploadedFile` | `File \| null` | No | Currently uploaded file (for display purposes) |

## File Validation

The component performs comprehensive file validation:

### Supported File Types
- PDF documents (`.pdf`)
- Microsoft Word documents (`.doc`, `.docx`)
- Additional types can be configured via environment variables

### File Size Limits
- Default maximum: 10MB
- Configurable via `VITE_MAX_FILE_SIZE` environment variable
- Minimum size: 1 byte (prevents empty files)

### Validation Features
- **Extension Check**: Validates file extension against allowed types
- **MIME Type Check**: Verifies the file's MIME type matches its extension
- **Size Validation**: Ensures file is within size limits
- **Name Validation**: Checks for invalid characters and length
- **Metadata Support Check**: Warns if file type has limited metadata extraction

## Error Handling

The component handles various error scenarios:

- **Network Errors**: Connection issues, timeouts
- **Validation Errors**: Invalid file type, size, or format
- **Server Errors**: Backend processing failures
- **Authentication Errors**: Invalid or expired tokens

Error messages are user-friendly and provide actionable guidance.

## Progress Tracking

Upload progress is tracked and displayed with:
- Visual progress bar
- Percentage completion
- Upload status indicators
- Animated loading states

## Backend Integration

The component integrates with the ScholarFinder backend:

### Upload Endpoint
```
POST /api/processes/:id/upload
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token>
```

### Response Format
```json
{
  "data": {
    "fileId": "file-123",
    "fileName": "manuscript.pdf",
    "fileSize": 1048576,
    "uploadedAt": "2024-01-01T00:00:00Z"
  },
  "message": "File uploaded successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Configuration

Configure the component via environment variables:

```env
# Maximum file size in bytes (default: 10MB)
VITE_MAX_FILE_SIZE=10485760

# Supported file types (comma-separated)
VITE_SUPPORTED_FILE_TYPES=pdf,docx,doc

# API base URL
VITE_API_BASE_URL=http://localhost:3001

# API timeout in milliseconds
VITE_API_TIMEOUT=30000
```

## Styling

The component uses Tailwind CSS and shadcn/ui components:

- Responsive grid layout
- Drag & drop visual feedback
- Loading states and animations
- Error state styling
- Progress indicators

## Accessibility

The component includes accessibility features:

- Keyboard navigation support
- Screen reader compatible
- Focus management
- ARIA labels and descriptions
- High contrast support

## Testing

Test the component with various scenarios:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from './FileUpload';

// Test file validation
const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
const validFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

// Test drag and drop
fireEvent.drop(screen.getByRole('button'), {
  dataTransfer: { files: [validFile] }
});

// Test file input
const input = screen.getByRole('button').querySelector('input[type="file"]');
fireEvent.change(input, { target: { files: [validFile] } });
```

## Related Components

- [`DataExtraction`](../extraction/README.md) - Displays extracted metadata
- [`ProcessWorkflow`](../process/README.md) - Manages the complete workflow
- [`FileService`](../../services/README.md) - Backend API integration

## Examples

See [`fileUploadUsage.tsx`](../../examples/fileUploadUsage.tsx) for a complete integration example.