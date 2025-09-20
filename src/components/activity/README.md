# Activity Logging System

The activity logging system provides comprehensive tracking and display of user activities throughout the ScholarFinder application. It integrates with the backend API to provide real-time activity monitoring, filtering, and pagination.

## Components

### ActivityLog

A comprehensive activity log component for displaying user activities with filtering, searching, and pagination capabilities.

```tsx
import { ActivityLog } from '@/components/activity/ActivityLog';

// Basic usage
<ActivityLog />

// With user context and filters
<ActivityLog 
  currentUser="admin-user"
  showFilters={true}
  height="500px"
/>

// Real-time updates
<ActivityLog 
  enableRealtime={true}
  showFilters={true}
/>

// User-specific logs
<ActivityLog 
  userId="user-123"
  showFilters={false}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | - | Filter logs for specific user |
| `currentUser` | `string` | - | Display current user badge |
| `processId` | `string` | - | Filter logs for specific process |
| `enableRealtime` | `boolean` | `false` | Enable automatic refresh every 5 seconds |
| `showFilters` | `boolean` | `true` | Show search and filter controls |
| `height` | `string` | `"400px"` | Height of the scrollable area |

### ProcessActivityLog

A compact activity log component specifically designed for process-specific activity tracking.

```tsx
import { ProcessActivityLog } from '@/components/activity/ProcessActivityLog';

// Basic usage
<ProcessActivityLog processId="process-123" />

// With custom height and pagination
<ProcessActivityLog 
  processId="process-123"
  height="300px"
  showPagination={true}
/>

// Compact timeline view
<ProcessActivityLog 
  processId="process-123"
  height="200px"
  showPagination={false}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `processId` | `string` | **required** | Process ID to fetch activities for |
| `height` | `string` | `"300px"` | Height of the scrollable area |
| `showPagination` | `boolean` | `true` | Show pagination controls |

## Hooks

### useActivityLogs

Hook for fetching user activity logs with pagination and filtering.

```tsx
import { useActivityLogs } from '@/hooks/useActivityLogs';

function MyComponent() {
  const { data, isLoading, error, refetch } = useActivityLogs({
    page: 1,
    limit: 20,
    userId: 'user-123',
    action: 'LOGIN',
    search: 'manuscript',
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Total activities: {data.pagination.total}</p>
      {data.data.map(activity => (
        <div key={activity.id}>
          {activity.action} - {activity.formattedTimestamp}
        </div>
      ))}
    </div>
  );
}
```

### useProcessActivityLogs

Hook for fetching process-specific activity logs.

```tsx
import { useProcessActivityLogs } from '@/hooks/useActivityLogs';

function ProcessTimeline({ processId }) {
  const { data, isLoading, error } = useProcessActivityLogs(processId, {
    page: 1,
    limit: 10
  });

  return (
    <div>
      {data?.data.map(activity => (
        <div key={activity.id}>
          {activity.action} - {activity.details}
        </div>
      ))}
    </div>
  );
}
```

### useRealtimeActivityLogs

Hook for real-time activity logs with automatic refresh.

```tsx
import { useRealtimeActivityLogs } from '@/hooks/useActivityLogs';

function RealtimeActivityFeed() {
  const { data, isLoading } = useRealtimeActivityLogs(
    { limit: 10 }, // query
    3000 // refresh interval in ms
  );

  return (
    <div>
      {isLoading && <div>Refreshing...</div>}
      {data?.data.map(activity => (
        <div key={activity.id}>
          {activity.action} - {activity.formattedTimestamp}
        </div>
      ))}
    </div>
  );
}
```

## Service

### ActivityLogger

Singleton service for activity logging operations.

```tsx
import { ActivityLogger } from '@/services/activityLogger';

// Get instance
const logger = ActivityLogger.getInstance();

// Set user context
logger.setUser('user-123');

// Log activity (handled automatically by backend middleware)
await logger.logActivity('CUSTOM_ACTION', {
  description: 'User performed custom action',
  metadata: { key: 'value' }
}, 'process-123');

// Fetch activities directly
const activities = await logger.getUserActivities({
  page: 1,
  limit: 20,
  search: 'upload'
});

// Fetch process activities
const processActivities = await logger.getProcessActivities('process-123', {
  page: 1,
  limit: 10
});

// Clear user context
logger.clearUser();
```

## Data Types

### ActivityLog

```typescript
interface ActivityLog {
  id: string;
  userId: string;
  processId?: string;
  action: string;
  details?: any;
  timestamp: string;
  formattedTimestamp: string;
}
```

### ActivityLogQuery

```typescript
interface ActivityLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  processId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### ActivityLogFilters

```typescript
interface ActivityLogFilters {
  userId?: string;
  processId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Backend Integration

The activity logging system integrates with the following backend endpoints:

### Admin Logs
- **GET** `/api/admin/logs` - Fetch all user activities (admin only)
- Supports pagination, filtering, and search
- Query parameters: `page`, `limit`, `userId`, `processId`, `action`, `startDate`, `endDate`, `search`, `sortBy`, `sortOrder`

### Process Logs
- **GET** `/api/processes/:id/logs` - Fetch process-specific activities
- Supports pagination and user filtering
- Query parameters: `page`, `limit`, `userId`

### Automatic Logging
- Activities are logged automatically by backend middleware
- No manual API calls needed for standard operations
- Custom activities can be logged through the service

## Features

### Filtering and Search
- **Text Search**: Search across activity descriptions and user IDs
- **Action Filter**: Filter by specific action types
- **User Filter**: Filter by specific users
- **Date Range**: Filter by date ranges
- **Process Filter**: Filter by specific processes

### Pagination
- Configurable page size
- Navigation controls
- Total count display
- Page information

### Real-time Updates
- Automatic refresh at configurable intervals
- Background updates without user interaction
- Maintains current page and filters

### Error Handling
- Graceful error display
- Retry functionality
- Fallback to empty state

### Performance
- React Query caching
- Optimized re-renders
- Virtual scrolling for large datasets
- Skeleton loading states

## Usage Examples

### Admin Dashboard
```tsx
function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <ActivityLog 
        currentUser="admin"
        showFilters={true}
        enableRealtime={true}
        height="600px"
      />
    </div>
  );
}
```

### Process Detail Page
```tsx
function ProcessDetail({ processId }) {
  return (
    <div>
      <h1>Process Details</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          {/* Process info */}
        </div>
        <div>
          <ProcessActivityLog 
            processId={processId}
            height="400px"
          />
        </div>
      </div>
    </div>
  );
}
```

### User Profile
```tsx
function UserProfile({ userId }) {
  return (
    <div>
      <h1>User Profile</h1>
      <ActivityLog 
        userId={userId}
        showFilters={false}
        height="300px"
      />
    </div>
  );
}
```

## Testing

The activity logging system includes comprehensive tests:

- **Unit Tests**: Service methods and hook functionality
- **Component Tests**: UI behavior and user interactions
- **Integration Tests**: End-to-end API communication
- **Error Handling Tests**: Network failures and edge cases

Run tests with:
```bash
npm test src/components/activity
npm test src/hooks/useActivityLogs
npm test src/services/activityLogger
```

## Migration from Supabase

The activity logging system has been migrated from Supabase to the backend API:

### Changes Made
1. **API Endpoints**: Now uses `/api/admin/logs` and `/api/processes/:id/logs`
2. **Data Structure**: Updated to match backend response format
3. **Automatic Logging**: Backend middleware handles activity logging
4. **Pagination**: Improved pagination with backend support
5. **Filtering**: Enhanced filtering capabilities
6. **Real-time**: Configurable refresh intervals

### Breaking Changes
- `ActivityLogger.logActivity()` no longer makes API calls (handled by backend)
- Activity data structure changed from Supabase format to backend format
- Component props updated for new features

### Migration Steps
1. Update imports to use new components
2. Update activity logging calls (most are now automatic)
3. Update any custom activity handling code
4. Test with new backend endpoints

## Best Practices

1. **Use Appropriate Component**: Use `ActivityLog` for admin views, `ProcessActivityLog` for process-specific views
2. **Configure Pagination**: Set appropriate page sizes based on use case
3. **Handle Loading States**: Always handle loading and error states
4. **Real-time Updates**: Use sparingly to avoid performance issues
5. **Filter Appropriately**: Use filters to reduce data load and improve UX
6. **Error Handling**: Provide retry mechanisms for failed requests
7. **Performance**: Use React Query caching and avoid unnecessary re-renders