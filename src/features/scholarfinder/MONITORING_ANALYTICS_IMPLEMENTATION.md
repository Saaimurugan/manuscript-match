# Monitoring and Analytics Implementation

This document describes the comprehensive monitoring, analytics, and A/B testing implementation for the ScholarFinder frontend application.

## Overview

The monitoring system provides:
- **Error Tracking**: Comprehensive error monitoring and reporting
- **Performance Monitoring**: API response times and component rendering metrics
- **User Analytics**: Workflow completion rates, step abandonment, and user behavior
- **A/B Testing**: Framework for UI improvements and optimization
- **Real-time Dashboards**: Development and admin analytics dashboards

## Architecture

### Core Services

#### 1. MonitoringService
Central service for collecting and batching monitoring events.

```typescript
// Track errors
monitoringService.trackError({
  type: 'api_error',
  message: 'Failed to upload file',
  context: { endpoint: '/upload', fileSize: 1024000 }
});

// Track performance
monitoringService.trackPerformance({
  type: 'api_response',
  duration: 150,
  endpoint: '/api/search'
});

// Measure API calls automatically
const result = await monitoringService.measureApiCall(
  '/api/upload',
  () => uploadFile(file)
);
```

#### 2. AnalyticsService
Specialized service for user behavior and workflow analytics.

```typescript
// Track workflow progress
analyticsService.trackStepStart(ProcessStep.UPLOAD, processId);
analyticsService.trackStepComplete(ProcessStep.UPLOAD, processId, duration);
analyticsService.trackStepAbandon(ProcessStep.METADATA, processId, 'timeout');

// Track feature usage
analyticsService.trackFeatureUsage('shortlist_add', {
  reviewerCountry: 'US',
  totalPublications: 25
});

// Track user behavior patterns
analyticsService.trackUserBehavior('table_sort', {
  column: 'publications',
  direction: 'desc'
});
```

#### 3. ABTestingService
Framework for running A/B tests and feature flags.

```typescript
// Get test variant
const variant = abTestingService.getVariant('wizard_layout_test');
const config = variant?.config || defaultConfig;

// Track conversions
abTestingService.trackConversion('wizard_layout_test', {
  completionTime: 300000
});

// Feature flags
const isEnabled = abTestingService.isFeatureEnabled('enhanced_upload');
```

### React Integration

#### Hooks

##### useMonitoring
Primary hook for component-level monitoring.

```typescript
const { 
  trackError, 
  trackFeature, 
  trackStepStart,
  monitorApiCall 
} = useMonitoring({ componentName: 'UploadStep' });

// Track errors with context
try {
  await uploadFile();
} catch (error) {
  trackError(error, { fileType: 'pdf', fileSize: 1024000 });
}

// Monitor API calls
const result = await monitorApiCall('/api/upload', () => uploadFile());
```

##### useABTesting
Hook for A/B test integration.

```typescript
const { variant, config, trackConversion } = useABTesting({
  testId: 'upload_interface_test',
  defaultConfig: { showPreview: false }
});

// Use variant configuration
const showPreview = config.showPreview;

// Track conversions
const handleSuccess = () => {
  trackConversion({ uploadTime: 5000 });
};
```

##### Specialized Hooks

```typescript
// Form monitoring
const { trackFormStart, trackFormSubmit, trackFieldInteraction } = 
  useFormMonitoring('metadataForm');

// Table monitoring
const { trackSort, trackFilter, trackSelection } = 
  useTableMonitoring('reviewerTable');

// Upload monitoring
const { trackUploadStart, trackUploadProgress, trackUploadComplete } = 
  useUploadMonitoring();
```

#### Components

##### MonitoringProvider
Root provider for monitoring services.

```typescript
<MonitoringProvider enabled={true}>
  <ScholarFinderApp />
</MonitoringProvider>
```

##### PerformanceMonitor
Component wrapper for performance tracking.

```typescript
<PerformanceMonitor 
  componentName="SlowComponent"
  thresholds={{ renderTime: 16, mountTime: 100 }}
>
  <ExpensiveComponent />
</PerformanceMonitor>

// Or as HOC
const MonitoredComponent = withPerformanceMonitoring(SlowComponent, {
  componentName: 'SlowComponent',
  thresholds: { renderTime: 10 }
});
```

##### ErrorTracker
Error boundary with monitoring integration.

```typescript
<ErrorTracker 
  context={{ section: 'upload' }}
  fallback={<ErrorFallback />}
>
  <UploadComponent />
</ErrorTracker>

// Or as HOC
const SafeComponent = withErrorTracking(RiskyComponent, {
  context: { componentType: 'critical' }
});
```

##### AnalyticsDashboard
Development dashboard for real-time analytics.

```typescript
<AnalyticsDashboard /> // Automatically shows in development
```

## Implementation Examples

### Step Component with Full Monitoring

```typescript
const UploadStep: React.FC<StepComponentProps> = ({ onNext, onPrevious }) => {
  const { trackStepStart, trackStepComplete, trackError } = useMonitoring({
    componentName: 'UploadStep'
  });
  const { trackUploadStart, trackUploadComplete } = useUploadMonitoring();
  const { config } = useUploadInterfaceTest();

  useEffect(() => {
    trackStepStart(ProcessStep.UPLOAD);
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      trackUploadStart(file.name, file.size);
      
      const result = await uploadFile(file);
      
      trackUploadComplete(file.name, result.duration, file.size);
      trackStepComplete(ProcessStep.UPLOAD, result.duration, {
        fileType: file.type,
        fileSize: file.size
      });
      
      onNext(result);
    } catch (error) {
      trackError(error, { 
        fileName: file.name, 
        fileSize: file.size 
      });
    }
  };

  return (
    <ErrorTracker context={{ step: 'upload' }}>
      <PerformanceMonitor componentName="UploadStep">
        <FileUpload
          onUpload={handleFileUpload}
          showPreview={config.showPreview}
          guidanceLevel={config.guidanceLevel}
        />
      </PerformanceMonitor>
    </ErrorTracker>
  );
};
```

### Table Component with Monitoring

```typescript
const ReviewerTable: React.FC<ReviewerTableProps> = ({ 
  reviewers, 
  onSort, 
  onFilter, 
  onSelect 
}) => {
  const { trackSort, trackFilter, trackSelection } = useTableMonitoring('reviewerTable');
  const { config } = useRecommendationDisplayTest();

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    trackSort(column, direction);
    onSort(column, direction);
  };

  const handleFilter = (filters: ReviewerFilters) => {
    trackFilter(filters);
    onFilter(filters);
  };

  const handleSelection = (selectedIds: string[]) => {
    trackSelection(selectedIds.length, reviewers.length);
    onSelect(selectedIds);
  };

  // Render based on A/B test variant
  if (config.displayMode === 'cards') {
    return <ReviewerCards {...props} cardsPerRow={config.cardsPerRow} />;
  }

  return <ReviewerTableView {...props} />;
};
```

## A/B Testing Framework

### Test Configuration

Tests are configured in the ABTestingService:

```typescript
{
  id: 'wizard_layout_test',
  name: 'Wizard Layout Optimization',
  variants: [
    {
      id: 'control',
      name: 'Current Layout',
      weight: 50,
      config: { layout: 'vertical', progressPosition: 'top' }
    },
    {
      id: 'horizontal',
      name: 'Horizontal Layout', 
      weight: 50,
      config: { layout: 'horizontal', progressPosition: 'side' }
    }
  ],
  trafficAllocation: 100,
  isActive: true,
  targetMetric: 'completion_rate'
}
```

### Predefined Tests

1. **Wizard Layout Test**: Tests different wizard layouts
2. **Upload Interface Test**: Tests enhanced upload interface
3. **Recommendation Display Test**: Tests different reviewer display modes

### Usage in Components

```typescript
const WizardComponent = () => {
  const { config, trackConversion } = useWizardLayoutTest();
  
  const handleComplete = () => {
    trackConversion({ completionTime: Date.now() - startTime });
  };

  return (
    <div className={`wizard-${config.layout}`}>
      <ProgressIndicator position={config.progressPosition} />
      {/* ... */}
    </div>
  );
};
```

## Performance Monitoring

### Automatic Tracking

- **Component Renders**: Tracked automatically with PerformanceMonitor
- **API Calls**: Tracked with monitorApiCall wrapper
- **Page Load**: Tracked automatically on app initialization
- **Resource Loading**: Tracked via Performance API

### Custom Metrics

```typescript
// Track custom performance metrics
const { trackPerformanceEvent } = useMonitoring();

const handleExpensiveOperation = () => {
  const startTime = performance.now();
  
  // Expensive operation
  performComplexCalculation();
  
  const duration = performance.now() - startTime;
  trackPerformanceEvent({
    type: 'component_render',
    duration,
    component: 'complex_calculation',
    metadata: { complexity: 'high' }
  });
};
```

### Thresholds and Alerts

```typescript
<PerformanceMonitor
  componentName="CriticalComponent"
  thresholds={{
    renderTime: 16, // 60fps threshold
    mountTime: 100  // 100ms mount threshold
  }}
>
  <CriticalComponent />
</PerformanceMonitor>
```

## Analytics Dashboards

### Development Dashboard

The AnalyticsDashboard component provides real-time insights during development:

- Current session information
- Active A/B tests and assignments
- Performance metrics
- Quick actions for data export

### Production Analytics

In production, events are batched and sent to monitoring endpoints:

```typescript
// Events are automatically batched and sent to:
POST /api/monitoring
{
  "events": [
    {
      "type": "error",
      "message": "API call failed",
      "timestamp": "2024-01-01T00:00:00Z",
      "context": { "endpoint": "/api/upload" }
    }
  ]
}
```

## Data Privacy and Security

### PII Handling

- User IDs are hashed before transmission
- Email addresses are not included in analytics
- File names are sanitized to remove personal information
- Geographic data is limited to country level

### Data Retention

- Error events: 90 days
- Performance events: 30 days  
- Analytics events: 1 year
- A/B test data: Until test completion + 30 days

### Compliance

- GDPR compliant data collection
- User consent management
- Data export and deletion capabilities
- Anonymization of sensitive data

## Configuration

### Environment Variables

```bash
# Monitoring configuration
VITE_MONITORING_ENDPOINT=/api/monitoring
VITE_ANALYTICS_ENABLED=true
VITE_AB_TESTING_ENABLED=true

# Development settings
VITE_SHOW_ANALYTICS_DASHBOARD=true
VITE_MONITORING_DEBUG=true
```

### Service Configuration

```typescript
// Customize monitoring behavior
const monitoringService = new MonitoringService({
  batchSize: 10,
  flushInterval: 5000,
  enabledInDevelopment: true,
  apiEndpoint: '/api/monitoring'
});
```

## Testing

### Unit Tests

```typescript
describe('MonitoringService', () => {
  it('should track errors with proper structure', () => {
    monitoringService.trackError({
      type: 'api_error',
      message: 'Test error'
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/monitoring',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test error')
      })
    );
  });
});
```

### Integration Tests

```typescript
describe('Monitoring Integration', () => {
  it('should track complete workflow', async () => {
    const { result } = renderHook(() => useMonitoring());
    
    act(() => {
      result.current.trackStepStart(ProcessStep.UPLOAD);
      result.current.trackStepComplete(ProcessStep.UPLOAD);
    });
    
    expect(analyticsService.trackStepStart).toHaveBeenCalled();
    expect(analyticsService.trackStepComplete).toHaveBeenCalled();
  });
});
```

## Best Practices

### Error Tracking

1. **Contextual Information**: Always include relevant context
2. **Error Classification**: Use appropriate error types
3. **User Impact**: Track user-facing vs. internal errors
4. **Recovery Actions**: Track error recovery attempts

### Performance Monitoring

1. **Meaningful Metrics**: Focus on user-perceived performance
2. **Baseline Establishment**: Set realistic performance thresholds
3. **Regression Detection**: Monitor for performance degradation
4. **Resource Optimization**: Track memory and network usage

### Analytics

1. **User Privacy**: Respect user privacy and consent
2. **Data Quality**: Ensure accurate and consistent tracking
3. **Actionable Insights**: Focus on metrics that drive decisions
4. **Funnel Analysis**: Track complete user journeys

### A/B Testing

1. **Statistical Significance**: Ensure adequate sample sizes
2. **Test Duration**: Run tests for appropriate time periods
3. **Variant Isolation**: Test single variables when possible
4. **Success Metrics**: Define clear success criteria

## Troubleshooting

### Common Issues

1. **Events Not Sending**: Check network connectivity and endpoint configuration
2. **High Memory Usage**: Adjust batch size and flush intervals
3. **Performance Impact**: Optimize tracking frequency and payload size
4. **A/B Test Assignment**: Verify user identification and test configuration

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Enable debug logging
localStorage.setItem('monitoring_debug', 'true');

// View current session data
console.log(analyticsService.getCurrentSession());

// View A/B test assignments
console.log(abTestingService.getAssignments());
```

## Future Enhancements

### Planned Features

1. **Real-time Alerts**: Automated alerting for critical errors
2. **Advanced Segmentation**: User cohort analysis
3. **Predictive Analytics**: Machine learning insights
4. **Custom Dashboards**: User-configurable analytics views
5. **Integration APIs**: Third-party analytics platform integration

### Scalability Considerations

1. **Event Sampling**: Implement sampling for high-volume events
2. **Edge Caching**: Cache analytics data at CDN level
3. **Stream Processing**: Real-time event processing pipeline
4. **Data Warehousing**: Long-term analytics data storage

This monitoring and analytics implementation provides comprehensive insights into user behavior, application performance, and system reliability while maintaining user privacy and system performance.