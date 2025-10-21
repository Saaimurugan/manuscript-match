import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonitoring, useFormMonitoring, useTableMonitoring, useUploadMonitoring } from '../useMonitoring';
import { monitoringService } from '../../services/MonitoringService';
import { analyticsService } from '../../services/AnalyticsService';
import { ProcessStep } from '../../types/process';

// Mock services
vi.mock('../../services/MonitoringService');
vi.mock('../../services/AnalyticsService');
vi.mock('../useScholarFinderContext', () => ({
  useScholarFinderContext: () => ({
    currentProcess: { id: 'test-process-123' },
  }),
}));

describe('useMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMonitoring hook', () => {
    it('should provide monitoring functions', () => {
      const { result } = renderHook(() => useMonitoring());

      expect(result.current).toHaveProperty('trackError');
      expect(result.current).toHaveProperty('trackPerformanceEvent');
      expect(result.current).toHaveProperty('trackFeature');
      expect(result.current).toHaveProperty('trackStepStart');
      expect(result.current).toHaveProperty('trackStepComplete');
      expect(result.current).toHaveProperty('trackStepAbandon');
      expect(result.current).toHaveProperty('trackUserBehavior');
      expect(result.current).toHaveProperty('monitorApiCall');
    });

    it('should track component mount and unmount', () => {
      const trackFeatureUsageSpy = vi.spyOn(analyticsService, 'trackFeatureUsage');
      
      const { unmount } = renderHook(() => 
        useMonitoring({ componentName: 'TestComponent' })
      );

      expect(trackFeatureUsageSpy).toHaveBeenCalledWith('component_mount', {
        component: 'TestComponent',
      });

      unmount();

      expect(trackFeatureUsageSpy).toHaveBeenCalledWith('component_unmount', {
        component: 'TestComponent',
      });
    });

    it('should track errors with context', () => {
      const { result } = renderHook(() => 
        useMonitoring({ componentName: 'TestComponent' })
      );

      const error = new Error('Test error');
      const context = { additional: 'data' };

      act(() => {
        result.current.trackError(error, context);
      });

      expect(analyticsService.trackError).toHaveBeenCalledWith(error, {
        ...context,
        component: 'TestComponent',
        processId: 'test-process-123',
      });
    });

    it('should track performance events', () => {
      const { result } = renderHook(() => 
        useMonitoring({ componentName: 'TestComponent' })
      );

      const performanceEvent = {
        type: 'api_response' as const,
        duration: 150,
        endpoint: '/api/test',
      };

      act(() => {
        result.current.trackPerformanceEvent(performanceEvent);
      });

      expect(monitoringService.trackPerformance).toHaveBeenCalledWith({
        ...performanceEvent,
        processId: 'test-process-123',
      });
    });

    it('should track step events', () => {
      const { result } = renderHook(() => useMonitoring());

      act(() => {
        result.current.trackStepStart(ProcessStep.UPLOAD);
        result.current.trackStepComplete(ProcessStep.UPLOAD, 5000, { success: true });
        result.current.trackStepAbandon(ProcessStep.METADATA, 'timeout');
      });

      expect(analyticsService.trackStepStart).toHaveBeenCalledWith(
        ProcessStep.UPLOAD,
        'test-process-123'
      );
      expect(analyticsService.trackStepComplete).toHaveBeenCalledWith(
        ProcessStep.UPLOAD,
        'test-process-123',
        5000,
        { success: true }
      );
      expect(analyticsService.trackStepAbandon).toHaveBeenCalledWith(
        ProcessStep.METADATA,
        'test-process-123',
        'timeout'
      );
    });

    it('should monitor API calls', async () => {
      const { result } = renderHook(() => 
        useMonitoring({ componentName: 'TestComponent' })
      );

      const mockApiCall = vi.fn().mockResolvedValue({ data: 'test' });
      const measureApiCallSpy = vi.spyOn(monitoringService, 'measureApiCall')
        .mockResolvedValue({ data: 'test' });

      const response = await act(async () => {
        return result.current.monitorApiCall('/api/test', mockApiCall, { userId: '123' });
      });

      expect(response).toEqual({ data: 'test' });
      expect(measureApiCallSpy).toHaveBeenCalledWith('/api/test', mockApiCall, {
        userId: '123',
        component: 'TestComponent',
        processId: 'test-process-123',
      });
    });
  });

  describe('useFormMonitoring hook', () => {
    it('should track form interactions', () => {
      const { result } = renderHook(() => useFormMonitoring('testForm'));

      act(() => {
        result.current.trackFormStart();
        result.current.trackFormSubmit(true, []);
        result.current.trackFieldInteraction('email', 'focus');
        result.current.trackValidationError('email', 'Invalid email');
      });

      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith('form_start', {
        formName: 'testForm',
      });
      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith('form_submit', {
        formName: 'testForm',
        success: true,
        errorCount: 0,
        errors: [],
      });
      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('field_interaction', {
        formName: 'testForm',
        fieldName: 'email',
        action: 'focus',
      });
      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('validation_error', {
        formName: 'testForm',
        fieldName: 'email',
        error: 'Invalid email',
      });
    });
  });

  describe('useTableMonitoring hook', () => {
    it('should track table interactions', () => {
      const { result } = renderHook(() => useTableMonitoring('reviewerTable'));

      act(() => {
        result.current.trackSort('name', 'asc');
        result.current.trackFilter({ country: 'US', minPublications: 5 });
        result.current.trackSelection(5, 100);
        result.current.trackPagination(2, 25);
      });

      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('table_sort', {
        tableName: 'reviewerTable',
        column: 'name',
        direction: 'asc',
      });
      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('table_filter', {
        tableName: 'reviewerTable',
        filterCount: 2,
        activeFilters: ['country', 'minPublications'],
      });
      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('table_selection', {
        tableName: 'reviewerTable',
        selectedCount: 5,
        totalCount: 100,
        selectionRate: 0.05,
      });
      expect(analyticsService.trackUserBehavior).toHaveBeenCalledWith('table_pagination', {
        tableName: 'reviewerTable',
        page: 2,
        pageSize: 25,
      });
    });
  });

  describe('useUploadMonitoring hook', () => {
    it('should track upload events', () => {
      const { result } = renderHook(() => useUploadMonitoring());

      const error = new Error('Upload failed');

      act(() => {
        result.current.trackUploadStart('test.pdf', 1024000);
        result.current.trackUploadProgress(50, 'test.pdf');
        result.current.trackUploadComplete('test.pdf', 5000, 1024000);
        result.current.trackUploadError(error, 'test.pdf');
      });

      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith('upload_start', {
        fileName: 'test.pdf',
        fileSize: 1024000,
        fileType: 'pdf',
      });
      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith('upload_progress', {
        fileName: 'test.pdf',
        progress: 50,
      });
      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledWith('upload_complete', {
        fileName: 'test.pdf',
        duration: 5000,
        fileSize: 1024000,
        uploadSpeed: 204.8,
      });
      expect(monitoringService.trackPerformance).toHaveBeenCalledWith({
        type: 'file_upload',
        duration: 5000,
        metadata: {
          fileName: 'test.pdf',
          fileSize: 1024000,
        },
      });
      expect(analyticsService.trackError).toHaveBeenCalledWith(error, {
        fileName: 'test.pdf',
        uploadStage: 'upload',
      });
    });

    it('should only track progress at specific intervals', () => {
      const { result } = renderHook(() => useUploadMonitoring());

      act(() => {
        result.current.trackUploadProgress(25, 'test.pdf');
        result.current.trackUploadProgress(30, 'test.pdf'); // Should not track
        result.current.trackUploadProgress(50, 'test.pdf');
        result.current.trackUploadProgress(75, 'test.pdf');
        result.current.trackUploadProgress(100, 'test.pdf');
      });

      // Should only track at 25%, 50%, 75%, 100%
      expect(analyticsService.trackFeatureUsage).toHaveBeenCalledTimes(4);
    });
  });
});