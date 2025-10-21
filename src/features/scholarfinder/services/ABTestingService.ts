import { monitoringService } from './MonitoringService';

export interface ABTest {
  id: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficAllocation: number; // Percentage of users to include in test
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetMetric: string;
  segmentationRules?: SegmentationRule[];
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage of test traffic
  config: Record<string, any>;
}

export interface SegmentationRule {
  type: 'user_property' | 'session_property' | 'random';
  property?: string;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value?: any;
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  userId?: string;
  sessionId: string;
  assignedAt: Date;
}

class ABTestingService {
  private assignments: Map<string, ABTestAssignment> = new Map();
  private tests: Map<string, ABTest> = new Map();
  private userId?: string;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadTestConfigurations();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Test configuration management
  private loadTestConfigurations(): void {
    // In a real implementation, this would load from a configuration service
    // For now, we'll define some example tests
    this.registerTest({
      id: 'wizard_layout_test',
      name: 'Wizard Layout Optimization',
      description: 'Test different wizard layouts for better user experience',
      variants: [
        {
          id: 'control',
          name: 'Current Layout',
          description: 'Existing step-by-step layout',
          weight: 50,
          config: { layout: 'vertical', progressPosition: 'top' },
        },
        {
          id: 'horizontal',
          name: 'Horizontal Layout',
          description: 'Horizontal step layout with side navigation',
          weight: 50,
          config: { layout: 'horizontal', progressPosition: 'side' },
        },
      ],
      trafficAllocation: 100,
      isActive: true,
      startDate: new Date(),
      targetMetric: 'completion_rate',
    });

    this.registerTest({
      id: 'upload_interface_test',
      name: 'Upload Interface Enhancement',
      description: 'Test enhanced upload interface with better guidance',
      variants: [
        {
          id: 'control',
          name: 'Standard Upload',
          description: 'Current drag-and-drop interface',
          weight: 50,
          config: { showPreview: false, guidanceLevel: 'minimal' },
        },
        {
          id: 'enhanced',
          name: 'Enhanced Upload',
          description: 'Upload with preview and enhanced guidance',
          weight: 50,
          config: { showPreview: true, guidanceLevel: 'detailed' },
        },
      ],
      trafficAllocation: 50,
      isActive: true,
      startDate: new Date(),
      targetMetric: 'upload_success_rate',
    });

    this.registerTest({
      id: 'recommendation_display_test',
      name: 'Recommendation Display Optimization',
      description: 'Test different ways to display reviewer recommendations',
      variants: [
        {
          id: 'table',
          name: 'Table View',
          description: 'Traditional table layout',
          weight: 33,
          config: { displayMode: 'table', cardsPerRow: 1 },
        },
        {
          id: 'cards',
          name: 'Card View',
          description: 'Card-based layout',
          weight: 33,
          config: { displayMode: 'cards', cardsPerRow: 2 },
        },
        {
          id: 'compact_cards',
          name: 'Compact Cards',
          description: 'Compact card layout with more items per row',
          weight: 34,
          config: { displayMode: 'cards', cardsPerRow: 3 },
        },
      ],
      trafficAllocation: 75,
      isActive: true,
      startDate: new Date(),
      targetMetric: 'shortlist_conversion_rate',
    });
  }

  registerTest(test: ABTest): void {
    this.tests.set(test.id, test);
  }

  // User identification
  setUser(userId: string): void {
    this.userId = userId;
    // Re-evaluate assignments with user context
    this.tests.forEach((test) => {
      if (this.shouldParticipateInTest(test)) {
        this.getVariant(test.id);
      }
    });
  }

  // Test participation logic
  private shouldParticipateInTest(test: ABTest): boolean {
    if (!test.isActive) return false;
    
    const now = new Date();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return false;
    }

    // Check traffic allocation
    const hash = this.hashString(this.sessionId + test.id);
    const trafficThreshold = (test.trafficAllocation / 100) * 0xffffffff;
    if (hash > trafficThreshold) return false;

    // Check segmentation rules
    if (test.segmentationRules) {
      return this.evaluateSegmentationRules(test.segmentationRules);
    }

    return true;
  }

  private evaluateSegmentationRules(rules: SegmentationRule[]): boolean {
    return rules.every(rule => this.evaluateRule(rule));
  }

  private evaluateRule(rule: SegmentationRule): boolean {
    switch (rule.type) {
      case 'random':
        return Math.random() < (rule.value || 0.5);
      case 'user_property':
        // In a real implementation, this would check user properties
        return true;
      case 'session_property':
        // In a real implementation, this would check session properties
        return true;
      default:
        return true;
    }
  }

  // Variant assignment
  getVariant(testId: string): ABTestVariant | null {
    const test = this.tests.get(testId);
    if (!test || !this.shouldParticipateInTest(test)) {
      return null;
    }

    // Check existing assignment
    const existingAssignment = this.assignments.get(testId);
    if (existingAssignment) {
      const variant = test.variants.find(v => v.id === existingAssignment.variantId);
      return variant || null;
    }

    // Create new assignment
    const variant = this.assignVariant(test);
    if (variant) {
      const assignment: ABTestAssignment = {
        testId,
        variantId: variant.id,
        userId: this.userId,
        sessionId: this.sessionId,
        assignedAt: new Date(),
      };

      this.assignments.set(testId, assignment);

      // Track assignment
      monitoringService.trackABTest({
        testId,
        variant: variant.id,
        event: 'impression',
        userId: this.userId,
        metadata: {
          sessionId: this.sessionId,
          testName: test.name,
          variantName: variant.name,
        },
      });
    }

    return variant;
  }

  private assignVariant(test: ABTest): ABTestVariant | null {
    const hash = this.hashString(this.sessionId + this.userId + test.id);
    const normalizedHash = hash / 0xffffffff;
    
    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight / 100;
      if (normalizedHash <= cumulativeWeight) {
        return variant;
      }
    }

    return test.variants[0]; // Fallback to first variant
  }

  // Variant configuration access
  getVariantConfig(testId: string): Record<string, any> | null {
    const variant = this.getVariant(testId);
    return variant?.config || null;
  }

  isInVariant(testId: string, variantId: string): boolean {
    const variant = this.getVariant(testId);
    return variant?.id === variantId;
  }

  // Event tracking
  trackConversion(testId: string, metadata?: Record<string, any>): void {
    const assignment = this.assignments.get(testId);
    if (assignment) {
      monitoringService.trackABTest({
        testId,
        variant: assignment.variantId,
        event: 'conversion',
        userId: this.userId,
        metadata: {
          sessionId: this.sessionId,
          ...metadata,
        },
      });
    }
  }

  trackInteraction(testId: string, interaction: string, metadata?: Record<string, any>): void {
    const assignment = this.assignments.get(testId);
    if (assignment) {
      monitoringService.trackABTest({
        testId,
        variant: assignment.variantId,
        event: 'interaction',
        userId: this.userId,
        metadata: {
          sessionId: this.sessionId,
          interaction,
          ...metadata,
        },
      });
    }
  }

  // Utility methods
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Test management
  getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.isActive);
  }

  getAssignments(): ABTestAssignment[] {
    return Array.from(this.assignments.values());
  }

  // Feature flags (simplified A/B testing)
  isFeatureEnabled(featureId: string): boolean {
    const variant = this.getVariant(featureId);
    return variant?.config?.enabled === true;
  }

  getFeatureConfig(featureId: string): Record<string, any> | null {
    return this.getVariantConfig(featureId);
  }

  // Cleanup
  destroy(): void {
    this.assignments.clear();
    this.tests.clear();
  }
}

export const abTestingService = new ABTestingService();