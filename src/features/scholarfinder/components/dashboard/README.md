# Process Dashboard and Navigation Components

This directory contains the implementation of Task 17: "Build process dashboard and navigation" from the ScholarFinder frontend specification.

## Components Implemented

### 1. ProcessDashboard
**File:** `ProcessDashboard.tsx`

Main dashboard component for viewing and managing multiple ScholarFinder processes.

**Features:**
- Statistics cards showing total, active, completed, and failed processes
- Tabbed interface for filtering processes (All, Active, Completed, Failed)
- Search functionality for finding specific processes
- Process creation with "New Analysis" button
- Recent activity section showing recently updated processes
- Recovery panel toggle for managing problematic processes
- Responsive design with mobile-optimized layout

**Key Functionality:**
- Integrates with `useProcessList`, `useProcessStatistics`, and `useCreateProcess` hooks
- Real-time process filtering and search
- Process navigation to individual workflow pages
- Error handling with retry mechanisms

### 2. ProcessList
**File:** `ProcessList.tsx`

Displays a list of processes with status and progress indicators.

**Features:**
- Process cards with metadata display (title, status, progress, reviewers count)
- Progress bars showing completion percentage based on current step
- Status icons and badges for visual process state indication
- Dropdown menus with context-sensitive actions:
  - Open Process
  - Duplicate Process
  - Export Results (for completed processes)
  - Cancel Process (for in-progress processes)
  - Delete Process (with confirmation dialog)
- Loading states with skeleton components
- Empty state with call-to-action
- Error indicators for failed processes

**Key Functionality:**
- Process selection and navigation
- Bulk operations support
- Confirmation dialogs for destructive actions
- Real-time status updates

### 3. ProcessRecovery
**File:** `ProcessRecovery.tsx`

Provides options for recovering corrupted or incomplete processes.

**Features:**
- Automatic detection of problematic processes:
  - Failed or cancelled processes
  - Stale processes (inactive for >24 hours)
  - Processes with missing job IDs
  - Processes with missing step data
- Recovery actions per process:
  - Reset to Upload step
  - Retry current step
  - Mark as complete
  - Cancel process
  - Delete process
- Problem description for each identified issue
- Confirmation dialogs for recovery actions
- Health status indicator when no issues found

**Key Functionality:**
- Process health analysis
- Automated recovery suggestions
- Safe recovery operations with confirmations

### 4. ProcessSwitcher
**File:** `ProcessSwitcher.tsx`

Allows switching between processes while preserving state.

**Features:**
- Dropdown selector with current process display
- Grouped process lists (Active, Completed, Other)
- Search functionality within process list
- Create new process option
- Current process badge indication
- Back to dashboard navigation
- Process metadata display (step, reviewer count)
- Responsive design with mobile considerations

**Key Functionality:**
- Process switching with state preservation
- Quick process creation
- Search and filtering
- Navigation breadcrumbs

### 5. ProcessNavigation
**File:** `ProcessNavigation.tsx`

Handles navigation between processes and workflow steps with state preservation.

**Features:**
- Step-by-step navigation with progress indicators
- Process switcher integration
- Save functionality for unsaved changes
- Navigation guards to prevent data loss
- Step validation and access control
- Mobile-responsive step indicators
- Auto-save warnings and confirmations
- Previous/Next step navigation

**Key Functionality:**
- Workflow step management
- State preservation during navigation
- User guidance and validation
- Responsive navigation controls

### 6. ProcessWorkflow (Page)
**File:** `../pages/ProcessWorkflow.tsx`

Main workflow page that integrates ProcessNavigation with the step wizard.

**Features:**
- Full-page workflow interface
- Process loading and error states
- URL-based step navigation
- Process status handling (cancelled, failed)
- Integration with StepWizard component
- Completion handling and navigation

## Supporting Files

### Index File
**File:** `index.ts`
Exports all dashboard components for easy importing.

### Test Files
**Directory:** `__tests__/`
- `ProcessDashboard.test.tsx` - Comprehensive tests for dashboard functionality
- `ProcessList.test.tsx` - Tests for process list operations and interactions
- `ProcessSwitcher.test.tsx` - Tests for process switching and navigation

## Integration Points

### Hooks Used
- `useProcessList` - Fetching and filtering process lists
- `useProcessStatistics` - Dashboard statistics
- `useCreateProcess` - New process creation
- `useDeleteProcess` - Process deletion
- `useDuplicateProcess` - Process duplication
- `useProcessStatusOperations` - Status management
- `useProcessNavigation` - Step navigation
- `useProcess` - Individual process data

### Context Integration
- `AuthContext` - User authentication and permissions
- `ScholarFinderContext` - Workflow state management

### Routing Integration
- React Router for navigation between processes and steps
- URL parameter handling for step navigation
- Breadcrumb navigation support

## Key Features Implemented

### ✅ Process Dashboard
- [x] Statistics overview with real-time data
- [x] Process filtering and search
- [x] Recent activity tracking
- [x] Quick process creation
- [x] Recovery panel integration

### ✅ Process List Management
- [x] Visual process status indicators
- [x] Progress tracking with completion percentages
- [x] Context-sensitive action menus
- [x] Bulk operations support
- [x] Loading and empty states

### ✅ Process Switching
- [x] Seamless process switching
- [x] State preservation during navigation
- [x] Search and filtering capabilities
- [x] Quick process creation
- [x] Grouped process organization

### ✅ Process Recovery
- [x] Automatic problem detection
- [x] Multiple recovery options per process
- [x] Safe recovery operations
- [x] Clear problem descriptions
- [x] Health status monitoring

### ✅ Navigation System
- [x] Step-by-step workflow navigation
- [x] Navigation guards and validation
- [x] Unsaved changes detection
- [x] Mobile-responsive design
- [x] URL-based navigation support

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **10.1**: Step indicator showing current progress through the 9-step workflow
- **10.2**: Navigation between steps with validation and mandatory step enforcement
- **10.3**: Process state restoration and continuation from any completed step
- **10.4**: Dashboard for switching between different manuscript analyses
- **10.5**: Recovery options for corrupted or incomplete processes

## Usage Examples

### Basic Dashboard Usage
```tsx
import { ProcessDashboard } from '@/features/scholarfinder/components/dashboard';

function ScholarFinderPage() {
  return (
    <div className="container mx-auto p-6">
      <ProcessDashboard />
    </div>
  );
}
```

### Process Navigation Integration
```tsx
import { ProcessNavigation } from '@/features/scholarfinder/components/dashboard';

function WorkflowPage() {
  const { processId } = useParams();
  
  return (
    <div className="min-h-screen">
      <ProcessNavigation
        processId={processId}
        showProcessSwitcher={true}
      />
      {/* Workflow content */}
    </div>
  );
}
```

### Process Switching
```tsx
import { ProcessSwitcher } from '@/features/scholarfinder/components/dashboard';

function Header() {
  return (
    <header className="border-b">
      <ProcessSwitcher
        currentProcessId={currentProcessId}
        onProcessChange={handleProcessChange}
        showBackButton={true}
      />
    </header>
  );
}
```

## Testing

All components include comprehensive test suites covering:
- Component rendering and props handling
- User interactions and event handling
- API integration and data flow
- Error states and edge cases
- Accessibility and responsive behavior

Run tests with:
```bash
npm test src/features/scholarfinder/components/dashboard/__tests__/
```

## Future Enhancements

Potential improvements for future iterations:
- Keyboard shortcuts for navigation
- Drag-and-drop process reordering
- Advanced filtering options
- Process templates and cloning
- Collaborative features
- Export/import process configurations