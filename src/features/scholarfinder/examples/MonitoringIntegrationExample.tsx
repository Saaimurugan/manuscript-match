import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { MonitoringProvider } from '../components/monitoring/MonitoringProvider';
import { PerformanceMonitor, withPerformanceMonitoring } from '../components/monitoring/PerformanceMonitor';
import { ErrorTracker, withErrorTracking } from '../components/monitoring/ErrorTracker';
import { AnalyticsDashboard } from '../components/monitoring/AnalyticsDashboard';
import { useMonitoring, useFormMonitoring, useTableMonitoring } from '../hooks/useMonitoring';
import { useABTesting, useFeatureFlag, useWizardLayoutTest } from '../hooks/useABTesting';
import { ProcessStep } from '../types/process';

// Example component with monitoring integration
const MonitoredForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { trackError, trackFeature } = useMonitoring({ componentName: 'MonitoredForm' });
  const {
    trackFormStart,
    trackFormSubmit,
    trackFieldInteraction,
    trackValidationError,
  } = useFormMonitoring('exampleForm');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form validation
      if (!email.includes('@')) {
        trackValidationError('email', 'Invalid email format');
        throw new Error('Invalid email format');
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      trackFormSubmit(true);
      trackFeature('form_success', { email: email.split('@')[1] }); // Track domain only
      
    } catch (error) {
      trackFormSubmit(false, [(error as Error).message]);
      trackError(error as Error, { formType: 'example' });
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    trackFormStart();
  }, [trackFormStart]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Monitored Form Example</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => trackFieldInteraction('email', 'focus')}
              onBlur={() => trackFieldInteraction('email', 'blur')}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Example table with monitoring
const MonitoredTable: React.FC = () => {
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const { trackSort, trackSelection } = useTableMonitoring('exampleTable');

  const data = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User' },
  ];

  const handleSort = (column: string) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    trackSort(column, newDirection);
  };

  const handleSelection = (itemId: string) => {
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    setSelectedItems(newSelection);
    trackSelection(newSelection.length, data.length);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Monitored Table Example</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === data.length}
                    onChange={() => {
                      const newSelection = selectedItems.length === data.length ? [] : data.map(item => item.id);
                      setSelectedItems(newSelection);
                      trackSelection(newSelection.length, data.length);
                    }}
                  />
                </th>
                <th 
                  className="text-left p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  Name {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left p-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('email')}
                >
                  Email {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left p-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelection(item.id)}
                    />
                  </td>
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.email}</td>
                  <td className="p-2">
                    <Badge variant="outline">{item.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Selected: {selectedItems.length} of {data.length} items
        </div>
      </CardContent>
    </Card>
  );
};

// A/B Testing Example
const ABTestExample: React.FC = () => {
  const { variant, config, trackConversion, trackInteraction } = useWizardLayoutTest();
  const { isEnabled: showEnhancedFeatures } = useFeatureFlag('enhanced_features');

  const handleButtonClick = () => {
    trackInteraction('button_click', { variant: variant?.id });
    trackConversion({ buttonType: 'primary' });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>A/B Test Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Current Variant:</strong> {variant?.name || 'Control'}
        </div>
        <div>
          <strong>Layout:</strong> {config.layout}
        </div>
        <div>
          <strong>Progress Position:</strong> {config.progressPosition}
        </div>
        <div>
          <strong>Enhanced Features:</strong> {showEnhancedFeatures ? 'Enabled' : 'Disabled'}
        </div>
        <Button onClick={handleButtonClick} className="w-full">
          Test Conversion Tracking
        </Button>
      </CardContent>
    </Card>
  );
};

// Performance monitoring example
const SlowComponent: React.FC = () => {
  const [count, setCount] = useState(0);

  // Simulate slow computation
  const expensiveCalculation = () => {
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.random();
    }
    return result;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Performance Monitoring Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>Count: {count}</div>
        <div>Expensive calculation result: {expensiveCalculation().toFixed(2)}</div>
        <Button onClick={() => setCount(c => c + 1)}>
          Increment (Triggers Re-render)
        </Button>
      </CardContent>
    </Card>
  );
};

// Enhanced component with performance monitoring
const MonitoredSlowComponent = withPerformanceMonitoring(SlowComponent, {
  componentName: 'SlowComponent',
  thresholds: {
    renderTime: 10, // 10ms threshold
    mountTime: 50,  // 50ms threshold
  },
});

// Error boundary example
const ErrorProneComponent: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Intentional error for testing');
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Error Tracking Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>This component can throw an error for testing purposes.</p>
        <Button 
          onClick={() => setShouldError(true)}
          variant="destructive"
        >
          Trigger Error
        </Button>
      </CardContent>
    </Card>
  );
};

// Enhanced component with error tracking
const MonitoredErrorProneComponent = withErrorTracking(ErrorProneComponent, {
  context: { componentType: 'example' },
});

// Step tracking example
const StepTrackingExample: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ProcessStep>(ProcessStep.UPLOAD);
  const { trackStepStart, trackStepComplete, trackStepAbandon } = useMonitoring();

  const steps = [
    ProcessStep.UPLOAD,
    ProcessStep.METADATA,
    ProcessStep.KEYWORDS,
    ProcessStep.SEARCH,
  ];

  const handleStepChange = (newStep: ProcessStep) => {
    if (Math.random() > 0.8) {
      // Simulate occasional abandonment
      trackStepAbandon(currentStep, 'user_navigation');
    } else {
      trackStepComplete(currentStep, Math.random() * 5000, { success: true });
    }
    
    setCurrentStep(newStep);
    trackStepStart(newStep);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Step Tracking Example</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>Current Step: {currentStep}</div>
        <div className="flex gap-2 flex-wrap">
          {steps.map((step) => (
            <Button
              key={step}
              onClick={() => handleStepChange(step)}
              variant={currentStep === step ? 'default' : 'outline'}
              size="sm"
            >
              {step}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main example component
export const MonitoringIntegrationExample: React.FC = () => {
  return (
    <MonitoringProvider enabled={true}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Monitoring & Analytics Integration</h1>
          <p className="text-gray-600">
            Comprehensive examples of monitoring, analytics, and A/B testing integration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Form Monitoring */}
          <MonitoredForm />

          {/* A/B Testing */}
          <ABTestExample />

          {/* Step Tracking */}
          <div className="md:col-span-2 lg:col-span-1">
            <StepTrackingExample />
          </div>

          {/* Performance Monitoring */}
          <PerformanceMonitor 
            componentName="SlowComponentWrapper"
            thresholds={{ renderTime: 5, mountTime: 20 }}
          >
            <MonitoredSlowComponent />
          </PerformanceMonitor>

          {/* Error Tracking */}
          <ErrorTracker context={{ section: 'examples' }}>
            <MonitoredErrorProneComponent />
          </ErrorTracker>
        </div>

        {/* Table Monitoring */}
        <div className="mt-8">
          <MonitoredTable />
        </div>

        {/* Analytics Dashboard */}
        <AnalyticsDashboard />
      </div>
    </MonitoringProvider>
  );
};