/**
 * Tests for useWorkflowState hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowState } from '../useWorkflowState';
import { ProcessStep } from '../../types/process';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
vi.stubGlobal('localStorage', localStorageMock);

describe('useWorkflowState', () => {
  const processId = 'test-process-123';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    expect(result.current.currentStep).toBe(ProcessStep.UPLOAD);
    expect(result.current.completedSteps).toEqual([]);
    expect(result.current.stepData).toEqual({});
    expect(result.current.canNavigateToStep).toBeDefined();
    expect(result.current.setCurrentStep).toBeDefined();
    expect(result.current.markStepComplete).toBeDefined();
    expect(result.current.setStepData).toBeDefined();
  });

  it('should load state from localStorage', () => {
    const savedState = {
      currentStep: ProcessStep.KEYWORDS,
      completedSteps: [ProcessStep.UPLOAD, ProcessStep.METADATA],
      stepData: {
        [ProcessStep.UPLOAD]: { jobId: 'job-123' },
        [ProcessStep.METADATA]: { title: 'Test Title' }
      }
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedState));

    const { result } = renderHook(() => useWorkflowState(processId));

    expect(result.current.currentStep).toBe(ProcessStep.KEYWORDS);
    expect(result.current.completedSteps).toEqual([ProcessStep.UPLOAD, ProcessStep.METADATA]);
    expect(result.current.stepData).toEqual(savedState.stepData);
  });

  it('should update current step', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    act(() => {
      result.current.setCurrentStep(ProcessStep.METADATA);
    });

    expect(result.current.currentStep).toBe(ProcessStep.METADATA);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      `scholarfinder_workflow_${processId}`,
      expect.stringContaining(ProcessStep.METADATA)
    );
  });

  it('should mark step as complete', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    act(() => {
      result.current.markStepComplete(ProcessStep.UPLOAD);
    });

    expect(result.current.completedSteps).toContain(ProcessStep.UPLOAD);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should not duplicate completed steps', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    act(() => {
      result.current.markStepComplete(ProcessStep.UPLOAD);
      result.current.markStepComplete(ProcessStep.UPLOAD);
    });

    expect(result.current.completedSteps).toEqual([ProcessStep.UPLOAD]);
  });

  it('should set step data', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    const stepData = { jobId: 'job-123', fileName: 'test.docx' };

    act(() => {
      result.current.setStepData(ProcessStep.UPLOAD, stepData);
    });

    expect(result.current.stepData[ProcessStep.UPLOAD]).toEqual(stepData);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should check navigation permissions correctly', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    // Initially, only upload step should be accessible
    expect(result.current.canNavigateToStep(ProcessStep.UPLOAD)).toBe(true);
    expect(result.current.canNavigateToStep(ProcessStep.METADATA)).toBe(false);

    // After completing upload, metadata should be accessible
    act(() => {
      result.current.markStepComplete(ProcessStep.UPLOAD);
    });

    expect(result.current.canNavigateToStep(ProcessStep.METADATA)).toBe(true);
    expect(result.current.canNavigateToStep(ProcessStep.KEYWORDS)).toBe(false);
  });

  it('should handle invalid localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useWorkflowState(processId));

    // Should fall back to default state
    expect(result.current.currentStep).toBe(ProcessStep.UPLOAD);
    expect(result.current.completedSteps).toEqual([]);
  });

  it('should clear state when process changes', () => {
    const { result, rerender } = renderHook(
      ({ processId }) => useWorkflowState(processId),
      { initialProps: { processId: 'process-1' } }
    );

    act(() => {
      result.current.setCurrentStep(ProcessStep.METADATA);
      result.current.markStepComplete(ProcessStep.UPLOAD);
    });

    // Change process ID
    rerender({ processId: 'process-2' });

    // Should reset to default state
    expect(result.current.currentStep).toBe(ProcessStep.UPLOAD);
    expect(result.current.completedSteps).toEqual([]);
  });

  it('should validate step transitions', () => {
    const { result } = renderHook(() => useWorkflowState(processId));

    // Should not allow skipping steps
    expect(result.current.canNavigateToStep(ProcessStep.EXPORT)).toBe(false);

    // Complete all previous steps
    act(() => {
      result.current.markStepComplete(ProcessStep.UPLOAD);
      result.current.markStepComplete(ProcessStep.METADATA);
      result.current.markStepComplete(ProcessStep.KEYWORDS);
      result.current.markStepComplete(ProcessStep.SEARCH);
      result.current.markStepComplete(ProcessStep.MANUAL);
      result.current.markStepComplete(ProcessStep.VALIDATION);
      result.current.markStepComplete(ProcessStep.RECOMMENDATIONS);
      result.current.markStepComplete(ProcessStep.SHORTLIST);
    });

    // Now export should be accessible
    expect(result.current.canNavigateToStep(ProcessStep.EXPORT)).toBe(true);
  });
});