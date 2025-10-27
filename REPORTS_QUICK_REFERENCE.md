# Reports Feature - Quick Reference

## ✅ What's Working Now

The Reports page is fully functional with these features:

### For All Users
- 📊 **Statistics Dashboard** - Total, Active, Completed processes
- 📈 **Status Distribution Chart** - Visual breakdown by status
- 📉 **Timeline Chart** - Process creation and completion trends
- 📋 **Process Table** - Searchable, sortable list of all processes
- 🔍 **Search & Filter** - Find processes quickly
- 📅 **Date Range Filter** - 7d, 30d, 90d, or all time
- 🔄 **Refresh Button** - Update data on demand

### For Admin Users (Additional)
- 👥 **User Activity Tab** - See engagement metrics
- 👤 **User Filter** - Filter by specific user (frontend only)
- 📧 **User Email Column** - See who owns each process

## 🚀 How to Use

### Access Reports
1. Login to the application
2. Click the **"Reports"** tab in the main navigation
3. View your analytics dashboard

### Filter Data
- **Date Range**: Select from dropdown (7d, 30d, 90d, all time)
- **Search**: Type in the search box to filter processes
- **Sort**: Click column headers to sort

### Admin Features
- **User Filter**: Select a user from the dropdown (admin only)
- **User Activity**: Switch to "User Activity" tab (admin only)

## 📊 Available Charts

1. **Process Status Distribution** - Pie chart showing:
   - Created, Uploading, Processing, Searching, Validating, Completed, Error

2. **Process Timeline** - Bar chart showing:
   - Blue bars: Processes created
   - Green bars: Processes completed

3. **User Activity** (Admin only) - Horizontal bars showing:
   - Total processes per user
   - Active vs completed breakdown

## 🔧 Troubleshooting

### Page Shows "Failed to load reports"
1. Check if you're logged in
2. Verify backend is running
3. Check browser console for errors
4. Try refreshing the page

### No Data Showing
1. Create some test processes first
2. Try "All time" date range
3. Check if processes exist in database

### Admin Can't See Other Users' Data
This is expected - backend endpoint not yet implemented. See `REPORTS_TROUBLESHOOTING.md` for details.

## 📁 File Locations

- **Main Page**: `src/pages/Reports.tsx`
- **Data Hook**: `src/hooks/useReports.ts`
- **Components**: `src/components/reports/`
- **Documentation**: `docs/REPORTS_FEATURE.md`

## 🎯 Key Metrics Explained

- **Total Processes**: All processes in the system
- **Active Processes**: Currently in progress (Processing, Searching, Validating, Uploading)
- **Completed**: Successfully finished processes
- **Avg. Completion**: Average time from creation to completion (in days)

## 💡 Tips

- Use date range filter to focus on recent activity
- Search by process title or status
- Sort by creation date to see newest first
- Export feature coming soon (currently shows placeholder)

## 📞 Need Help?

See detailed documentation:
- `REPORTS_FEATURE.md` - Full feature documentation
- `REPORTS_TROUBLESHOOTING.md` - Detailed troubleshooting
- `REPORTS_IMPLEMENTATION.md` - Technical implementation details
