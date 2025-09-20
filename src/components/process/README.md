# Process Management Components

This directory contains React components for managing manuscript analysis processes in the ScholarFinder application.

## Components

### ProcessDashboard
Main dashboard component that displays a list of user processes with creation and management capabilities.

**Features:**
- Display process list with status, progress, and metadata
- Create new processes via dialog
- Edit existing processes
- Delete processes with confirmation
- Navigate to process workflow

**Props:**
- `onSelectProcess?: (process: Process) => void` - Callback when a process is selected

### CreateProcessDialog
Modal dialog for creating new manuscript analysis processes.

**Features:**
- Form validation using react-hook-form and zod
- Title and description fields
- Integration with ProcessService API
- Toast notifications for success/error states

**Props:**
- `open: boolean` - Controls dialog visibility
- `onOpenChange: (open: boolean) => void` - Callback for dialog state changes

### EditProcessDialog
Modal dialog for editing existing manuscript analysis processes.

**Features:**
- Pre-populated form with existing process data
- Update title, description, and status
- Form validation and error handling
- Integration with ProcessService API

**Props:**
- `process: Process` - The process to edit
- `open: boolean` - Controls dialog visibility
- `onOpenChange: (open: boolean) => void` - Callback for dialog state changes

### ProcessStepTracker
Component that displays and manages the current step in the manuscript analysis workflow.

**Features:**
- Visual step progress indicator
- Step navigation (when enabled)
- Progress percentage calculation
- Step status indicators (completed, current, upcoming)

**Props:**
- `process: Process` - The process to track
- `onStepChange?: (step: number) => void` - Callback when step changes
- `allowStepNavigation?: boolean` - Enable/disable step navigation

### ProcessWorkflow
Main workflow component that manages the entire manuscript analysis process.

**Features:**
- Step-by-step workflow management
- Integration with existing workflow components
- Real-time step tracking and updates
- Back navigation to dashboard

**Props:**
- `processId: string` - ID of the process to manage
- `onBack?: () => void` - Callback for back navigation

## Integration

These components integrate with:

- **ProcessService**: For CRUD operations on processes
- **useProcesses hooks**: For React Query data management
- **AuthContext**: For user authentication state
- **Existing workflow components**: FileUpload, DataExtraction, ReviewerSearch, etc.

## Usage

```tsx
import { ProcessDashboard, ProcessWorkflow } from '@/components/process';

// In your main component
const [viewMode, setViewMode] = useState<'dashboard' | 'workflow'>('dashboard');
const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);

return (
  <>
    {viewMode === 'dashboard' ? (
      <ProcessDashboard 
        onSelectProcess={(process) => {
          setSelectedProcess(process);
          setViewMode('workflow');
        }} 
      />
    ) : selectedProcess ? (
      <ProcessWorkflow 
        processId={selectedProcess.id}
        onBack={() => {
          setSelectedProcess(null);
          setViewMode('dashboard');
        }}
      />
    ) : null}
  </>
);
```

## API Integration

The components use the ProcessService which provides:

- `createProcess(data: CreateProcessRequest): Promise<Process>`
- `getProcesses(): Promise<Process[]>`
- `getProcess(id: string): Promise<Process>`
- `updateProcess(id: string, data: UpdateProcessRequest): Promise<Process>`
- `updateProcessStep(id: string, step: number): Promise<Process>`
- `deleteProcess(id: string): Promise<void>`

All API calls are handled through React Query hooks for optimal caching and error handling.