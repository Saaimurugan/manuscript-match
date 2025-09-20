# Admin Dashboard Components

This directory contains components for the admin dashboard functionality, providing system-wide monitoring and management capabilities.

## Components

### AdminDashboard

The main admin dashboard component that provides comprehensive system monitoring and management features.

**Features:**
- System statistics overview
- Process management across all users
- User management and monitoring
- Activity log monitoring
- System health status
- Data export functionality
- Admin permission checking

**Usage:**
```tsx
import { AdminDashboard } from '@/components/admin/AdminDashboard';

function AdminPage() {
  return <AdminDashboard />;
}
```

## Admin Service Integration

The admin dashboard integrates with the backend through the `adminService` which provides:

### System Statistics
- Total users, processes, searches
- Active vs completed processes
- System-wide metrics

### Process Management
- View all user processes
- Filter and search processes
- Export process data
- Delete processes (admin only)

### User Management
- View all system users
- Monitor user activity
- Update user roles
- Suspend/activate users
- Delete users (admin only)

### Activity Monitoring
- System-wide activity logs
- Filter by user, action, date range
- Export activity data
- Real-time monitoring

### System Health
- Service status monitoring
- System uptime tracking
- Alert management
- Performance metrics

## Permission System

The admin dashboard implements a robust permission system:

1. **Permission Check**: Automatically verifies admin permissions on load
2. **Access Control**: Restricts access to admin-only endpoints
3. **Graceful Degradation**: Shows appropriate messages for non-admin users
4. **Error Handling**: Handles permission errors gracefully

## Data Export

Supports exporting various data types in multiple formats:

- **Data Types**: Users, Processes, Activities, Statistics
- **Formats**: CSV, XLSX, JSON
- **Filtering**: Date ranges, status filters, custom filters
- **Download**: Automatic file download with proper naming

## Real-time Features

- **Auto-refresh**: System health and alerts refresh automatically
- **Live Updates**: Activity logs update in real-time
- **Status Monitoring**: Continuous monitoring of system status
- **Alert System**: Real-time system alerts and notifications

## Error Handling

Comprehensive error handling for:
- Permission denied scenarios
- Network connectivity issues
- API failures
- Data loading errors
- Export failures

## Testing

The admin components include comprehensive tests:
- Unit tests for admin service
- Hook tests for admin functionality
- Component tests for UI behavior
- Integration tests for admin workflows

## Security Considerations

- **JWT Authentication**: All admin endpoints require valid JWT tokens
- **Role-based Access**: Admin role verification on both frontend and backend
- **Audit Logging**: All admin actions are logged for security auditing
- **Data Protection**: Sensitive data is properly masked or protected
- **Session Management**: Automatic logout on permission changes

## Performance Optimizations

- **Pagination**: Large datasets are paginated for performance
- **Caching**: Appropriate caching strategies for admin data
- **Lazy Loading**: Components load data on demand
- **Virtual Scrolling**: Efficient rendering of large lists
- **Debounced Searches**: Optimized search functionality

## Configuration

Admin dashboard behavior can be configured through:
- Environment variables for API endpoints
- Query client configuration for caching
- Refresh intervals for real-time data
- Export settings and limits

## Monitoring and Analytics

The admin dashboard provides insights into:
- System usage patterns
- User behavior analytics
- Performance metrics
- Error rates and patterns
- Resource utilization

## Future Enhancements

Planned improvements include:
- Advanced analytics and reporting
- Custom dashboard widgets
- Automated alert rules
- Bulk operations for user management
- Advanced filtering and search capabilities
- Integration with external monitoring tools