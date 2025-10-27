# Reports & Analytics Feature

## Overview

The Reports page provides an interactive dashboard with comprehensive analytics on processes and their status. The feature implements role-based access control where:

- **Admin users** can view data from all users across the system
- **Regular users** can only view their own data

## Features

### 1. Statistics Cards
- Total Processes
- Active Processes (in progress)
- Completed Processes
- Average Completion Time

### 2. Process Status Distribution
- Visual pie chart showing breakdown by status
- Status categories: Created, Uploading, Processing, Searching, Validating, Completed, Error
- Percentage and count for each status

### 3. Process Timeline
- Line chart showing process creation and completion over time
- Configurable date ranges: 7 days, 30 days, 90 days, or all time
- Visual comparison of created vs completed processes

### 4. User Activity (Admin Only)
- Bar chart showing process activity by user
- Breakdown of active vs completed processes per user
- Sortable by process count

### 5. Process Details Table
- Searchable and sortable table of all processes
- Columns: Title, Status, User (admin only), Created Date, Updated Date
- Real-time filtering and sorting

## Access Control

### Admin View
- Can view all users' processes
- Can filter by specific user
- Has access to User Activity tab
- Can see user email in process table

### User View
- Can only view their own processes
- No user filtering options
- No User Activity tab
- Simplified interface

## Usage

### Navigation
Access the Reports page from the main navigation tabs:
1. Click on the "Reports" tab in the main dashboard
2. The page will load with your default view based on your role

### Filtering Options
- **Date Range**: Select from dropdown (7d, 30d, 90d, all time)
- **User Filter** (Admin only): Select specific user or "All Users"
- **Search**: Use the search box in the Process Details table

### Export Options
- Export CSV: Download data in CSV format
- Export Excel: Download data in Excel format
- Export PDF: Download data in PDF format

### Refresh Data
Click the "Refresh" button to reload the latest data from the server.

## Technical Implementation

### Components
- `src/pages/Reports.tsx` - Main reports page
- `src/hooks/useReports.ts` - Data fetching and processing hook
- `src/components/reports/` - Chart and visualization components
  - `ProcessStatusChart.tsx` - Pie chart for status distribution
  - `ProcessTimelineChart.tsx` - Timeline bar chart
  - `UserActivityChart.tsx` - User activity bars
  - `ProcessTable.tsx` - Sortable/searchable table
  - `StatsCards.tsx` - Statistics cards

### Data Flow
1. `useReports` hook fetches data based on user role
2. Admin users call `adminService.getProcesses()`
3. Regular users call `processService.getProcesses()`
4. Data is processed and aggregated for visualizations
5. Components render based on processed data

### Role-Based Logic
```typescript
const isAdmin = user?.role === 'ADMIN';

// Fetch appropriate data
if (isAdmin && !userId) {
  // Admin viewing all processes
  const response = await adminService.getProcesses();
} else if (isAdmin && userId) {
  // Admin viewing specific user's processes
  const response = await adminService.getProcesses({ userId });
} else {
  // Regular user viewing their own processes
  const allProcesses = await processService.getProcesses();
}
```

## Future Enhancements

- [ ] Real-time data updates with WebSocket
- [ ] More advanced filtering options
- [ ] Custom date range picker
- [ ] Export functionality implementation
- [ ] Downloadable PDF reports
- [ ] Email report scheduling
- [ ] Custom dashboard widgets
- [ ] Comparison views (period over period)
- [ ] Process performance metrics
- [ ] User productivity insights
