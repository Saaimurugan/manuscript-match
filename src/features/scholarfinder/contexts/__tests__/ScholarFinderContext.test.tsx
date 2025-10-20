/**
 * Tests for ScholarFinder Context
 * Verifies context provider functionality and integration with authentication
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScholarFinderProvider, useScholarFinderContext } from '../ScholarFinderContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { useProcessList } from '../../hooks/useProcessManagement';
import { ProcessStep, ProcessStatus } from '../../types/process';
import type { Process } from '../../types/process';
import type { Reviewer } from '../../types/api';

// Mock dependencies
vi.mock('../../../../contexts/AuthContext');
vi.mock('../../hooks/useProcessManagement');

const mockUseAuth = vi.mocked(useAuth);
const mockUseProcessList = vi.mocked(useProcessList);

// Test component to access context
const TestComponent: React.FC = () => {
  const context = useScholarFinderContext();
  
  return (
    <div>
      <div data-testid="authenticated">{context.isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user-id">{context.userId || 'null'}</div>
      <div data-testid="current-step">{context.currentStep}</div>
      <div data-testid="process-count">{context.userProcesses.length}</div>
      <div data-testid="shortlist-count">{context.shortlist.length}</div>
      <div data-testid="loading">{context.isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{context.error || 'null'}</div>
      <div data-testid="can-proceed">{context.canProceedToNextStep ? 'true' : 'false'}</div>
    </div>
  );
};

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ScholarFinderProvider>
        {children}
      </ScholarFinderProvider>
    </QueryClientProvider>
  );
};

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'researcher' as const,
};

const mockProcess: Process = {
  id: 'process-123',
  jobId: 'job-456',
  title: 'Test Manuscript',
  status: ProcessStatus.IN_PROGRESS,
  currentStep: ProcessStep.UPLOAD,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    userId: 'user-123',
    fileName: 'test.docx',
    fileSize: 1024,
    manuscriptTitle: 'Test Manuscript',
    authors: ['Author 1'],
    totalReviewers: 0,
    shortlistCount: 0,
  },
  stepData: {},
};

const mockReviewer: Reviewer = {
  reviewer: 'Dr. Test Reviewer',
  email: 'reviewer@example.com',
  aff: 'Test University',
  city: 'Test City',
  country: 'Test Country',
  Total_Publications: 50,
  English_Pubs: 45,
  'Publications (last 10 years)': 30,
  'Relevant Publications (last 5 years)': 20,
  'Publications (last 2 years)': 10,
  'Publications (last year)': 5,
  Clinical_Trials_no: 2,
  Clinical_study_no: 3,
  Case_reports_no: 1,
  Retracted_Pubs_no: 0,
  TF_Publications_last_year: 2,
  coauthor: false,
  country_match: 'exact',
  aff_match: 'partial',
  conditions_met: 8,
  conditions_satisfied: '8 of 8',
};

describe('ScholarFinderContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      tokenState: {
        token: null,
        isValid: false,
        expiresAt: null,
        lastValidated: null,
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseProcessList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: false,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('provides default context values when not authenticated', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user-id')).toHaveTextContent('null');
    expect(screen.getByTestId('current-step')).toHaveTextContent(ProcessStep.UPLOAD);
    expect(screen.getByTestId('process-count')).toHaveTextContent('0');
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('0');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
    expect(screen.getByTestId('can-proceed')).toHaveTextContent('false');
  });

  it('updates context when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'mock-token',
      tokenState: {
        token: 'mock-token',
        isValid: true,
        expiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user-id')).toHaveTextContent('user-123');
  });

  it('loads user processes when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'mock-token',
      tokenState: {
        token: 'mock-token',
        isValid: true,
        expiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseProcessList.mockReturnValue({
      data: [mockProcess],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('process-count')).toHaveTextContent('1');
    });
  });

  it('handles process loading errors', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'mock-token',
      tokenState: {
        token: 'mock-token',
        isValid: true,
        expiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    const mockError = new Error('Failed to load processes');
    mockUseProcessList.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      isError: true,
      isSuccess: false,
      refetch: vi.fn(),
    } as any);

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to load processes');
    });
  });

  it('clears state when user logs out', async () => {
    // Start authenticated
    const { rerender } = render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Mock authenticated state
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'mock-token',
      tokenState: {
        token: 'mock-token',
        isValid: true,
        expiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseProcessList.mockReturnValue({
      data: [mockProcess],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as any);

    rerender(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('process-count')).toHaveTextContent('1');
    });

    // Mock logout
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null,
      tokenState: {
        token: null,
        isValid: false,
        expiresAt: null,
        lastValidated: null,
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    rerender(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('process-count')).toHaveTextContent('0');
      expect(screen.getByTestId('shortlist-count')).toHaveTextContent('0');
    });
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useScholarFinderContext must be used within a ScholarFinderProvider');

    consoleSpy.mockRestore();
  });
});

describe('ScholarFinderContext - Shortlist Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      token: 'mock-token',
      tokenState: {
        token: 'mock-token',
        isValid: true,
        expiresAt: new Date(Date.now() + 3600000),
        lastValidated: new Date(),
        validationError: null,
      },
      authError: null,
      login: vi.fn(),
      logout: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      recoverFromError: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
    });

    mockUseProcessList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: vi.fn(),
    } as any);
  });

  it('manages shortlist state correctly', () => {
    const ShortlistTestComponent: React.FC = () => {
      const context = useScholarFinderContext();
      
      return (
        <div>
          <div data-testid="shortlist-count">{context.shortlist.length}</div>
          <button 
            data-testid="add-reviewer"
            onClick={() => context.addToShortlist(mockReviewer)}
          >
            Add Reviewer
          </button>
          <button 
            data-testid="remove-reviewer"
            onClick={() => context.removeFromShortlist(mockReviewer.email)}
          >
            Remove Reviewer
          </button>
          <button 
            data-testid="clear-shortlist"
            onClick={() => context.clearShortlist()}
          >
            Clear Shortlist
          </button>
        </div>
      );
    };

    render(
      <TestWrapper>
        <ShortlistTestComponent />
      </TestWrapper>
    );

    // Initial state
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('0');

    // Add reviewer
    act(() => {
      screen.getByTestId('add-reviewer').click();
    });
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('1');

    // Try to add same reviewer again (should not duplicate)
    act(() => {
      screen.getByTestId('add-reviewer').click();
    });
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('1');

    // Remove reviewer
    act(() => {
      screen.getByTestId('remove-reviewer').click();
    });
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('0');

    // Add reviewer again and clear shortlist
    act(() => {
      screen.getByTestId('add-reviewer').click();
    });
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('1');

    act(() => {
      screen.getByTestId('clear-shortlist').click();
    });
    expect(screen.getByTestId('shortlist-count')).toHaveTextContent('0');
  });
});