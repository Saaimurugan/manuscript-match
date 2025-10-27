# Process Card - Current Stage Display

## Overview

Added the current workflow stage to each process card, making it immediately visible what stage each process is in without needing to check the progress bar or open the process.

## What Was Added

### Stage Badge on Card

A badge displaying the current workflow stage is now shown on each process card, positioned between the title/description and the progress bar.

### Visual Layout

```
┌─────────────────────────────────────────┐
│ Process Title                  [Status] │
│ Description text here...                │
├─────────────────────────────────────────┤
│ [Metadata Extraction]          ← NEW    │
├─────────────────────────────────────────┤
│ Step 2 of 9                        22%  │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░       │
├─────────────────────────────────────────┤
│ 📅 Jan 15  🕐 Jan 20                    │
├─────────────────────────────────────────┤
│ [Open] [Edit] [Delete]                  │
└─────────────────────────────────────────┘
```

## Stage Labels

The badge shows human-readable stage names:

| Stage Code | Display Label |
|------------|---------------|
| UPLOAD | Upload & Extract |
| METADATA_EXTRACTION | Metadata Extraction |
| KEYWORD_ENHANCEMENT | Keyword Enhancement |
| DATABASE_SEARCH | Database Search |
| MANUAL_SEARCH | Manual Search |
| VALIDATION | Validation |
| RECOMMENDATIONS | Recommendations |
| SHORTLIST | Shortlist |
| EXPORT | Export |

## Benefits

### 1. Immediate Visibility
- ✅ See stage at a glance
- ✅ No need to interpret progress percentage
- ✅ Clear, readable labels

### 2. Better Scanning
- ✅ Quickly identify processes in specific stages
- ✅ Easy to compare stages across processes
- ✅ Visual differentiation

### 3. Improved UX
- ✅ More informative cards
- ✅ Reduces need to open processes
- ✅ Complements progress bar

### 4. Consistency
- ✅ Matches stage filter labels
- ✅ Matches Reports page stage column
- ✅ Consistent terminology throughout app

## Implementation

### Helper Function
```typescript
const getStageLabel = (stepId: string) => {
  const stageLabels: Record<string, string> = {
    'UPLOAD': 'Upload & Extract',
    'METADATA_EXTRACTION': 'Metadata Extraction',
    'KEYWORD_ENHANCEMENT': 'Keyword Enhancement',
    'DATABASE_SEARCH': 'Database Search',
    'MANUAL_SEARCH': 'Manual Search',
    'VALIDATION': 'Validation',
    'RECOMMENDATIONS': 'Recommendations',
    'SHORTLIST': 'Shortlist',
    'EXPORT': 'Export',
  };
  return stageLabels[stepId] || stepId;
};
```

### Card Display
```typescript
<CardContent className="space-y-4">
  {/* Current Stage */}
  <div className="flex items-center gap-2 text-sm">
    <Badge variant="outline" className="font-normal">
      {getStageLabel(process.currentStep || 'UPLOAD')}
    </Badge>
  </div>

  {/* Progress */}
  <div>
    <div className="flex justify-between text-sm mb-2">
      <span>Step {getStepOrder(process.currentStep || 'UPLOAD')} of 9</span>
      <span>{Math.round(getStepProgress(process.currentStep || 'UPLOAD'))}%</span>
    </div>
    {/* Progress bar */}
  </div>
</CardContent>
```

## Visual Design

### Badge Style
- **Variant**: Outline (subtle, not distracting)
- **Font**: Normal weight (not bold)
- **Size**: Small text (text-sm)
- **Color**: Inherits from theme

### Positioning
- **Location**: Between description and progress bar
- **Alignment**: Left-aligned
- **Spacing**: Consistent gap-2 with other elements

## Use Cases

### Scenario 1: Quick Status Check
**Before**: Had to look at progress bar and calculate stage
**After**: Immediately see "Metadata Extraction" badge

### Scenario 2: Finding Processes in Specific Stage
**Before**: Had to open each process or use filters
**After**: Scan cards visually for stage badges

### Scenario 3: Monitoring Workflow
**Before**: Progress percentage wasn't always clear
**After**: Stage name + progress percentage = complete picture

### Scenario 4: Team Coordination
**Before**: "What stage is Project X in?" - had to check
**After**: Glance at card shows "Validation"

## Information Hierarchy

The card now shows information in order of importance:

1. **Title** - What is it?
2. **Description** - What's it about?
3. **Status Badge** (top right) - Is it running/completed/error?
4. **Stage Badge** (NEW) - Where is it in the workflow?
5. **Progress Bar** - How far along?
6. **Dates** - When created/updated?
7. **Actions** - What can I do?

## Comparison with Progress Bar

### Progress Bar Shows:
- Numerical progress (22%, 55%, 89%)
- Visual representation
- Step number (2 of 9)

### Stage Badge Shows:
- Semantic meaning (Metadata Extraction)
- Human-readable label
- Workflow context

### Together They Provide:
- ✅ Complete picture of process state
- ✅ Both quantitative (%) and qualitative (stage name)
- ✅ Easy to understand at any level

## Examples

### Early Stage Process
```
┌─────────────────────────────────────┐
│ Research Project Alpha   [PROCESSING]│
│ Analyzing research papers...        │
├─────────────────────────────────────┤
│ [Upload & Extract]                  │
├─────────────────────────────────────┤
│ Step 1 of 9                     11% │
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────┘
```

### Mid-Stage Process
```
┌─────────────────────────────────────┐
│ Literature Review      [PROCESSING]  │
│ Searching databases...              │
├─────────────────────────────────────┤
│ [Database Search]                   │
├─────────────────────────────────────┤
│ Step 4 of 9                     44% │
│ ████████████████░░░░░░░░░░░░░░░░░░  │
└─────────────────────────────────────┘
```

### Late Stage Process
```
┌─────────────────────────────────────┐
│ Final Report           [VALIDATING]  │
│ Validating results...               │
├─────────────────────────────────────┤
│ [Validation]                        │
├─────────────────────────────────────┤
│ Step 6 of 9                     67% │
│ ████████████████████████░░░░░░░░░░  │
└─────────────────────────────────────┘
```

### Completed Process
```
┌─────────────────────────────────────┐
│ Project Complete       [COMPLETED]   │
│ All steps finished                  │
├─────────────────────────────────────┤
│ [Export]                            │
├─────────────────────────────────────┤
│ Step 9 of 9                    100% │
│ ████████████████████████████████████│
└─────────────────────────────────────┘
```

## Accessibility

- ✅ Badge has proper contrast
- ✅ Text is readable
- ✅ Semantic HTML (Badge component)
- ✅ Screen reader friendly

## Mobile Responsiveness

- ✅ Badge wraps if needed
- ✅ Text remains readable on small screens
- ✅ Maintains spacing on all devices

## Performance

- ✅ No performance impact
- ✅ Simple string lookup
- ✅ Renders with card (no extra requests)

## Future Enhancements

Possible improvements:
- [ ] Color-code stages (early = blue, mid = yellow, late = green)
- [ ] Add icon for each stage
- [ ] Show estimated time remaining
- [ ] Animate stage transitions
- [ ] Show sub-steps within stage

## Testing Checklist

- [ ] Stage badge appears on all cards
- [ ] Correct stage label is displayed
- [ ] Badge styling is consistent
- [ ] Works with all 9 stages
- [ ] Handles missing/invalid stages gracefully
- [ ] Responsive on mobile
- [ ] Accessible to screen readers
- [ ] Doesn't break card layout

## Summary

The process cards now display the current workflow stage as a badge, making it immediately clear where each process is in its workflow. This complements the progress bar and provides better context at a glance.

Key benefits:
- ✅ **Immediate visibility** - See stage without opening process
- ✅ **Better scanning** - Quickly find processes in specific stages
- ✅ **Improved UX** - More informative cards
- ✅ **Consistency** - Matches stage labels throughout app

The stage badge makes the process dashboard much more informative and easier to use! 🎯
