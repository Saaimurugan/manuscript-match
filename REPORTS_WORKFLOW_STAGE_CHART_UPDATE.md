# Workflow Stage Distribution Chart Update

## Changes Made

Updated the "Process Status Distribution" chart to show **Workflow Stages** instead of process status. The chart now displays where processes are in their workflow (Upload, Metadata Extraction, etc.) rather than their execution status (Processing, Completed, etc.).

## What Was Changed

### 1. Data Processing (`src/hooks/useReports.ts`)

**Added New Interface:**
```typescript
export interface ProcessStageData {
  stage: string;
  count: number;
  percentage: number;
}
```

**Added Stage Distribution Calculation:**
```typescript
function calculateStageDistribution(processes: (Process | AdminProcess)[]): ProcessStageData[] {
  const stageCounts: Record<string, number> = {};
  
  processes.forEach(p => {
    stageCounts[p.currentStep] = (stageCounts[p.currentStep] || 0) + 1;
  });

  const total = processes.length || 1;
  
  return Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
    percentage: (count / total) * 100,
  }));
}
```

**Updated Report Data Structure:**
```typescript
processData: {
  byStatus: ProcessStatusData[];  // Still available for future use
  byStage: ProcessStageData[];    // NEW: Stage distribution
  processes: (Process | AdminProcess)[];
}
```

### 2. Chart Component (`src/components/reports/ProcessStatusChart.tsx`)

**Updated to Display Stages:**
- Changed from `byStatus` to `byStage`
- Updated color scheme for workflow stages
- Updated labels to show stage names

**New Stage Colors:**
```typescript
const stageColors: Record<string, string> = {
  UPLOAD: 'bg-blue-500',
  METADATA_EXTRACTION: 'bg-purple-500',
  KEYWORD_ENHANCEMENT: 'bg-indigo-500',
  DATABASE_SEARCH: 'bg-cyan-500',
  MANUAL_SEARCH: 'bg-teal-500',
  VALIDATION: 'bg-orange-500',
  RECOMMENDATIONS: 'bg-amber-500',
  SHORTLIST: 'bg-lime-500',
  EXPORT: 'bg-green-500',
};
```

**Stage Labels:**
```typescript
const stageLabels: Record<string, string> = {
  UPLOAD: 'Upload & Extract',
  METADATA_EXTRACTION: 'Metadata Extraction',
  KEYWORD_ENHANCEMENT: 'Keyword Enhancement',
  DATABASE_SEARCH: 'Database Search',
  MANUAL_SEARCH: 'Manual Search',
  VALIDATION: 'Validation',
  RECOMMENDATIONS: 'Recommendations',
  SHORTLIST: 'Shortlist',
  EXPORT: 'Export',
};
```

### 3. Reports Page (`src/pages/Reports.tsx`)

**Updated Card Title and Description:**
- Title: "Process Status Distribution" → "Workflow Stage Distribution"
- Description: "Breakdown of processes by current status" → "Breakdown of processes by current workflow stage"

## Visual Changes

### Before:
**Process Status Distribution**
- Created (gray)
- Uploading (yellow)
- Processing (blue)
- Searching (purple)
- Validating (orange)
- Completed (green)
- Error (red)

### After:
**Workflow Stage Distribution**
- Upload & Extract (blue)
- Metadata Extraction (purple)
- Keyword Enhancement (indigo)
- Database Search (cyan)
- Manual Search (teal)
- Validation (orange)
- Recommendations (amber)
- Shortlist (lime)
- Export (green)

## Benefits

1. **More Meaningful Insights** - Shows where processes are in the workflow, not just their execution status
2. **Better Workflow Visibility** - Admins can see which stages have bottlenecks
3. **Colorful Visualization** - Each stage has a distinct color for easy identification
4. **Consistent with Table** - Matches the Stage column in the Process Details table

## Example Use Cases

### Identify Bottlenecks
If many processes are stuck in "Metadata Extraction", you know where to focus optimization efforts.

### Track Progress
See how many processes are in early stages (Upload) vs late stages (Export).

### Resource Planning
If most processes are in "Database Search", you might need more search capacity.

## Chart Features

✅ **Pie Chart Visualization** - Visual breakdown of stage distribution
✅ **Percentage Display** - Shows both count and percentage for each stage
✅ **Color-Coded** - Each stage has a unique color
✅ **Interactive Legend** - Lists all stages with their counts
✅ **Responsive** - Works on all screen sizes

## Testing

To verify the changes:

1. Navigate to Reports → Overview tab
2. Check the left chart is now titled "Workflow Stage Distribution"
3. Verify it shows workflow stages (Upload & Extract, Metadata Extraction, etc.)
4. Confirm each stage has a distinct color
5. Check that percentages add up to 100%
6. Verify the legend shows stage names and counts

## Data Flow

```
Process.currentStep → calculateStageDistribution() → byStage[] → ProcessStatusChart → Pie Chart
```

## Notes

- The original status distribution data (`byStatus`) is still calculated and available for future use
- The chart component was renamed but kept as `ProcessStatusChart.tsx` for consistency
- All 9 workflow stages are supported with unique colors
- Empty states are handled gracefully

This update makes the Reports page much more useful for understanding workflow progress and identifying where processes spend the most time!
