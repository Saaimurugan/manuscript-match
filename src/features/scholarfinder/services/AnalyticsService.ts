import { ProcessStep } from '../types/process';
import { monitoringService } from './MonitoringService';

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  processIds: string[];
  completedSteps: ProcessStep[];
  abandonedSteps: ProcessStep[];
}

export interface WorkflowMetrics {
  totalSessions: number;
  completionRate: number;
  averageCompletionTime: number;
  stepCompletionRates: Record<ProcessStep, number>;
  stepAbandonmentRates: Record<ProcessStep, number>;
  averageStepDuration: Record<ProcessStep, number>;
  commonDropOffPoints: ProcessStep[];
}

export interface FeatureUsageMetrics {
  feature: string;
  usageCount: number;
  uniqueUsers: number;
  averageSessionsPerUser: number;
  retentionRate: number;
}

class AnalyticsService {
  private currentSession: UserSession | null = null;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private activityTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeSession();
    this.setupActivityTracking();
  }

  // Session management
  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      processIds: [],
      completedSteps: [],
      abandonedSteps: [],
    };

    // Track session start
    monitoringService.trackAnalytics({
      type: 'feature_usage',
      feature: 'session_start',
      metadata: {
        sessionId,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupActivityTracking(): void {
    const trackActivity = () => {
      if (this.currentSession) {
        this.currentSession.lastActivity = new Date();
        this.resetActivityTimer();
      }
    };

    // Track various user activities
    ['click', 'keydown', 'scroll', 'mousemove'].forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true });
    });

    this.resetActivityTimer();
  }

  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    this.activityTimer = setTimeout(() => {
      this.endSession('timeout');
    }, this.sessionTimeout);
  }

  // User identification
  setUser(userId: string): void {
    if (this.currentSession) {
      this.currentSession.userId = userId;
      
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'user_identified',
        userId,
        metadata: {
          sessionId: this.currentSession.sessionId,
        },
      });
    }
  }

  // Process tracking
  startProcess(processId: string): void {
    if (this.currentSession && !this.currentSession.processIds.includes(processId)) {
      this.currentSession.processIds.push(processId);
      
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'process_start',
        userId: this.currentSession.userId,
        processId,
        metadata: {
          sessionId: this.currentSession.sessionId,
          totalProcesses: this.currentSession.processIds.length,
        },
      });
    }
  }

  // Step tracking with detailed analytics
  trackStepStart(step: ProcessStep, processId?: string): void {
    if (this.currentSession) {
      monitoringService.trackStepStart(step, processId, this.currentSession.userId);
      
      // Additional analytics for step patterns
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'step_navigation',
        userId: this.currentSession.userId,
        processId,
        metadata: {
          sessionId: this.currentSession.sessionId,
          step,
          previousSteps: this.currentSession.completedSteps,
          stepIndex: this.getStepIndex(step),
        },
      });
    }
  }

  trackStepComplete(step: ProcessStep, processId?: string, duration?: number, metadata?: Record<string, any>): void {
    if (this.currentSession) {
      if (!this.currentSession.completedSteps.includes(step)) {
        this.currentSession.completedSteps.push(step);
      }

      monitoringService.trackStepComplete(step, processId, this.currentSession.userId, {
        ...metadata,
        sessionId: this.currentSession.sessionId,
        duration,
        completionOrder: this.currentSession.completedSteps.length,
      });

      // Track completion funnel
      this.trackCompletionFunnel(step);
    }
  }

  trackStepAbandon(step: ProcessStep, processId?: string, reason?: string): void {
    if (this.currentSession) {
      if (!this.currentSession.abandonedSteps.includes(step)) {
        this.currentSession.abandonedSteps.push(step);
      }

      monitoringService.trackStepAbandon(step, processId, this.currentSession.userId, reason);
      
      // Track abandonment patterns
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'step_abandonment_pattern',
        userId: this.currentSession.userId,
        processId,
        metadata: {
          sessionId: this.currentSession.sessionId,
          step,
          reason,
          completedSteps: this.currentSession.completedSteps,
          stepIndex: this.getStepIndex(step),
          timeInSession: Date.now() - this.currentSession.startTime.getTime(),
        },
      });
    }
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, metadata?: Record<string, any>): void {
    if (this.currentSession) {
      monitoringService.trackFeatureUsage(feature, this.currentSession.userId, {
        ...metadata,
        sessionId: this.currentSession.sessionId,
      });
    }
  }

  // Workflow completion tracking
  trackWorkflowComplete(processId?: string, completionTime?: number): void {
    if (this.currentSession) {
      monitoringService.trackWorkflowComplete(processId, this.currentSession.userId, {
        sessionId: this.currentSession.sessionId,
        completionTime,
        totalSteps: this.currentSession.completedSteps.length,
        completedSteps: this.currentSession.completedSteps,
        sessionDuration: Date.now() - this.currentSession.startTime.getTime(),
      });

      // Track completion success metrics
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'workflow_success',
        userId: this.currentSession.userId,
        processId,
        metadata: {
          sessionId: this.currentSession.sessionId,
          completionRate: this.calculateCompletionRate(),
          efficientCompletion: completionTime ? completionTime < 30 * 60 * 1000 : false, // Under 30 minutes
        },
      });
    }
  }

  // Error tracking with context
  trackError(error: Error, context?: Record<string, any>): void {
    if (this.currentSession) {
      monitoringService.trackError({
        type: 'component_error',
        message: error.message,
        stack: error.stack,
        context: {
          ...context,
          sessionId: this.currentSession.sessionId,
          userId: this.currentSession.userId,
          currentSteps: this.currentSession.completedSteps,
          sessionDuration: Date.now() - this.currentSession.startTime.getTime(),
        },
      });
    }
  }

  // User behavior insights
  trackUserBehavior(behavior: string, metadata?: Record<string, any>): void {
    if (this.currentSession) {
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: `user_behavior_${behavior}`,
        userId: this.currentSession.userId,
        metadata: {
          ...metadata,
          sessionId: this.currentSession.sessionId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Performance insights
  trackPerformanceInsight(insight: string, value: number, metadata?: Record<string, any>): void {
    if (this.currentSession) {
      monitoringService.trackPerformance({
        type: 'component_render',
        duration: value,
        component: insight,
        userId: this.currentSession.userId,
        metadata: {
          ...metadata,
          sessionId: this.currentSession.sessionId,
        },
      });
    }
  }

  // Helper methods
  private getStepIndex(step: ProcessStep): number {
    const stepOrder: ProcessStep[] = [
      ProcessStep.UPLOAD,
      ProcessStep.METADATA,
      ProcessStep.KEYWORDS,
      ProcessStep.SEARCH,
      ProcessStep.MANUAL,
      ProcessStep.VALIDATION,
      ProcessStep.RECOMMENDATIONS,
      ProcessStep.SHORTLIST,
      ProcessStep.EXPORT,
    ];
    return stepOrder.indexOf(step);
  }

  private trackCompletionFunnel(step: ProcessStep): void {
    if (!this.currentSession) return;

    const stepIndex = this.getStepIndex(step);
    const totalSteps = 9; // Total workflow steps
    const completionPercentage = ((stepIndex + 1) / totalSteps) * 100;

    monitoringService.trackAnalytics({
      type: 'feature_usage',
      feature: 'completion_funnel',
      userId: this.currentSession.userId,
      metadata: {
        sessionId: this.currentSession.sessionId,
        step,
        stepIndex,
        completionPercentage,
        funnelStage: this.getFunnelStage(completionPercentage),
      },
    });
  }

  private getFunnelStage(completionPercentage: number): string {
    if (completionPercentage <= 25) return 'early';
    if (completionPercentage <= 50) return 'middle';
    if (completionPercentage <= 75) return 'late';
    return 'completion';
  }

  private calculateCompletionRate(): number {
    if (!this.currentSession) return 0;
    return (this.currentSession.completedSteps.length / 9) * 100;
  }

  // Session management
  endSession(reason: 'manual' | 'timeout' | 'navigation' = 'manual'): void {
    if (this.currentSession) {
      const sessionDuration = Date.now() - this.currentSession.startTime.getTime();
      
      monitoringService.trackAnalytics({
        type: 'feature_usage',
        feature: 'session_end',
        userId: this.currentSession.userId,
        metadata: {
          sessionId: this.currentSession.sessionId,
          reason,
          duration: sessionDuration,
          completedSteps: this.currentSession.completedSteps.length,
          abandonedSteps: this.currentSession.abandonedSteps.length,
          processCount: this.currentSession.processIds.length,
          completionRate: this.calculateCompletionRate(),
        },
      });

      this.currentSession = null;
    }

    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
  }

  // Get current session info
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  // Cleanup
  destroy(): void {
    this.endSession('manual');
  }
}

export const analyticsService = new AnalyticsService();