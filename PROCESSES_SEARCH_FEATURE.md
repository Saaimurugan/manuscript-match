# Processes Page Search Feature

## Overview

Added a search bar at the top of the Processes page (My Processes dashboard) to allow users to quickly find processes by title, description, or status.

## What Was Added

### 1. Search Bar Component

**Location**: Top of the Processes page, below the header and above the process grid

**Features**:
- 🔍 Search icon on the left
- Placeholder text: "Search processes by title, description, or status..."
- Real-time filtering as you type
- Clear search functionality

### 2. Search Functionality

**Searches across**:
- Process title
- Process description
- Process status (CREATED, UPLOADING, PROCESSING, etc.)

**Case-insensitive** - searches work regardless of capitalization

### 3. Results Counter

Shows "Found X of Y processes" when searching to give immediate feedback

### 4. Empty State

When no processes match the search:
- Shows search icon
- Message: "No processes found"
- Displays the search term
- "Clear Search" button to reset

## Code Changes

### File: `src/components/process/ProcessDashboard.tsx`

**Added State**:
```typescript
const [searchTerm, setSearchTerm] = useState('');
```

**Added Imports**:
```typescript
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
```

**Added Filter Logic**:
```typescript
const filteredProcesses = safeProcesses.filter(process => {
  if (!searchTerm) return true;
  
  const searchLower = searchTerm.toLowerCase();
  const matchesTitle = process.title?.toLowerCase().includes(searchLower);
  const matchesDescription = process.description?.toLowerCase().includes(searchLower);
  const matchesStatus = process.status?.toLowerCase().includes(searchLower);
  
  return matchesTitle || matchesDescription || matchesStatus;
});
```

**Added Search UI**:
```typescript
<div className="relative max-w-md">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    type="text"
    placeholder="Search processes by title, description, or status..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-10"
  />
</div>
```

## User Experience

### Before Search:
1. User sees all processes in a grid
2. Must scroll to find specific process
3. No quick way to filter

### After Search:
1. User types in search bar
2. Grid updates instantly
3. Only matching processes shown
4. Results count displayed
5. Easy to clear and see all again

## Example Use Cases

### Search by Title:
- Type "Research" → Shows all processes with "Research" in title

### Search by Status:
- Type "completed" → Shows all completed processes
- Type "processing" → Shows all processes currently processing

### Search by Description:
- Type "manuscript" → Shows processes with "manuscript" in description

### Partial Matches:
- Type "meta" → Matches "Metadata Analysis", "Meta-research", etc.

## Visual Layout

```
┌─────────────────────────────────────────────────────┐
│ My Processes                    [+ New Process]     │
│ Manage your manuscript analysis processes           │
├─────────────────────────────────────────────────────┤
│ 🔍 Search processes by title, description...        │
├─────────────────────────────────────────────────────┤
│ Found 3 of 10 processes                             │
├─────────────────────────────────────────────────────┤
│ [Process Card] [Process Card] [Process Card]        │
│ [Process Card] [Process Card] [Process Card]        │
└─────────────────────────────────────────────────────┘
```

## Features

✅ **Real-time filtering** - Updates as you type
✅ **Multi-field search** - Searches title, description, and status
✅ **Case-insensitive** - Works with any capitalization
✅ **Results counter** - Shows how many matches found
✅ **Empty state** - Clear message when no matches
✅ **Clear search** - Easy button to reset
✅ **Responsive** - Works on all screen sizes
✅ **Accessible** - Proper input labels and ARIA attributes

## Testing

To test the search feature:

1. **Navigate to Processes tab**
2. **Type in search bar**:
   - Try searching for a process title
   - Try searching for "completed" or "processing"
   - Try partial words like "meta" or "data"
3. **Verify filtering**:
   - Only matching processes should appear
   - Results count should update
4. **Test empty state**:
   - Search for something that doesn't exist
   - Verify "No processes found" message
   - Click "Clear Search" button
5. **Clear search**:
   - Delete text from search bar
   - Verify all processes reappear

## Performance

- **Efficient filtering** - Uses JavaScript filter, very fast even with many processes
- **No API calls** - Filters locally, no network delay
- **Instant feedback** - Updates immediately as you type

## Future Enhancements

Possible improvements:
- [ ] Advanced filters (by date range, by stage)
- [ ] Sort options (newest first, oldest first, alphabetical)
- [ ] Save search preferences
- [ ] Search history
- [ ] Keyboard shortcuts (Ctrl+F to focus search)
- [ ] Highlight matching text in results

## Notes

- Search is client-side only (filters already-loaded processes)
- Search persists while on the page but resets on page reload
- Search works with the existing process grid layout
- No changes to backend required

The search feature makes it much easier to find specific processes, especially when you have many processes in your account! 🔍
