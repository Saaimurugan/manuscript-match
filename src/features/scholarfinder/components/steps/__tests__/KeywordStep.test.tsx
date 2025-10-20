/**
 * KeywordStep Component Tests
 * Tests for the keyword enhancement and selection step
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { KeywordStep } from '../KeywordStep';
import { useScholarFinderApi } from '../../../hooks/useScholarFinderApi';
import { useProcess, useUpdateProcessStep } from '../../../hooks/useProcessManagement';

// Mock the config
vi.mock('@/lib/config', () => ({
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    apiTimeout: 10000,
    enableDebugLogging: false
  }
}));

// Mock the hooks
vi.mock('../../../hooks/useScholarFinderApi');
vi.mock('../../../hooks/useProcessManagement');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock the sub-components
vi.mock('../keywords', () => ({
  KeywordSelector: ({ onSelectionChange }: any) => (
    <div data-testid="keyword-selector">
      <button 
        onClick={() => onSelectionChange('primary', ['test-keyword'])}
        data-testid="select-keyword"
      >
        Select Keyword
      </button>
    </div>
  ),
  MeshTermsDisplay: () => <div data-testid="mesh-terms-display">MeSH Terms</div>
}));

const mockUseScholarFinderApi = useScholarFinderApi as any;
const mockUseProcess = useProcess as any;
const mockUseUpdateProcessStep = useUpdateProcessStep as any;

describe('KeywordStep', () => {
  let queryClient: QueryClient;
  const mockProps = {
    processId: 'test-process-id',
    jobId: 'test-job-id',
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: vi.fn().mockResolvedValue({
          data: {
            mesh_terms: ['test-mesh-term'],
            broader_terms: ['test-broader-term'],
            primary_focus: ['primary-keyword-1', 'primary-keyword-2'],
            secondary_focus: ['secondary-keyword-1', 'secondary-keyword-2'],
            additional_primary_keywords: [],
            additional_secondary_keywords: [],
            all_primary_focus_list: [],
            all_secondary_focus_list: []
          }
        }),
        isPending: false,
        error: null
      },
      generateKeywordString: {
        mutateAsync: vi.fn().mockResolvedValue({
          data: {
            search_string: 'test search string'
          }
        }),
        isPending: false,
        error: null
      }
    });

    mockUseProcess.mockReturnValue({
      data: null
    });

    mockUseUpdateProcessStep.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({})
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <KeywordStep {...mockProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('renders the keyword step header', () => {
    renderComponent();
    
    expect(screen.getByText('Enhance Keywords')).toBeInTheDocument();
    expect(screen.getByText('AI-enhanced keywords and MeSH terms to improve your reviewer search')).toBeInTheDocument();
  });

  it('shows enhancement loading state', () => {
    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: vi.fn(),
        isPending: true,
        error: null
      },
      generateKeywordString: {
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      }
    });

    renderComponent();
    
    expect(screen.getByText('Enhancing Keywords')).toBeInTheDocument();
    expect(screen.getByText(/AI is analyzing your manuscript/)).toBeInTheDocument();
  });

  it('displays enhanced keywords after successful enhancement', async () => {
    const enhanceKeywords = vi.fn().mockResolvedValue({
      data: {
        mesh_terms: ['test-mesh-term'],
        broader_terms: ['test-broader-term'],
        primary_focus: ['primary-keyword-1'],
        secondary_focus: ['secondary-keyword-1'],
        additional_primary_keywords: [],
        additional_secondary_keywords: [],
        all_primary_focus_list: [],
        all_secondary_focus_list: []
      }
    });

    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: enhanceKeywords,
        isPending: false,
        error: null
      },
      generateKeywordString: {
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      }
    });

    renderComponent();

    // Wait for enhancement to complete
    await waitFor(() => {
      expect(enhanceKeywords).toHaveBeenCalledWith('test-job-id');
    });

    // Should show the MeSH terms and keyword selector
    expect(screen.getByTestId('mesh-terms-display')).toBeInTheDocument();
    expect(screen.getByTestId('keyword-selector')).toBeInTheDocument();
  });

  it('handles keyword selection changes', async () => {
    const enhanceKeywords = vi.fn().mockResolvedValue({
      data: {
        mesh_terms: ['test-mesh-term'],
        broader_terms: ['test-broader-term'],
        primary_focus: ['primary-keyword-1'],
        secondary_focus: ['secondary-keyword-1'],
        additional_primary_keywords: [],
        additional_secondary_keywords: [],
        all_primary_focus_list: [],
        all_secondary_focus_list: []
      }
    });

    const generateKeywordString = vi.fn().mockResolvedValue({
      data: {
        search_string: 'test search string'
      }
    });

    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: enhanceKeywords,
        isPending: false,
        error: null
      },
      generateKeywordString: {
        mutateAsync: generateKeywordString,
        isPending: false,
        error: null
      }
    });

    renderComponent();

    // Wait for enhancement to complete
    await waitFor(() => {
      expect(enhanceKeywords).toHaveBeenCalled();
    });

    // Simulate keyword selection
    const selectButton = screen.getByTestId('select-keyword');
    fireEvent.click(selectButton);

    // Should trigger search string generation (may be called multiple times due to auto-selection and user selection)
    await waitFor(() => {
      expect(generateKeywordString).toHaveBeenCalled();
    });
    
    // Check that it was called with the user's selection
    const calls = generateKeywordString.mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0].keywords.primary_keywords_input).toContain('test-keyword');
  });

  it('prevents proceeding without keyword selection', () => {
    renderComponent();
    
    const nextButton = screen.getByRole('button', { name: /continue/i });
    expect(nextButton).toBeDisabled();
  });

  it('allows proceeding with keyword selection', async () => {
    const enhanceKeywords = vi.fn().mockResolvedValue({
      data: {
        mesh_terms: ['test-mesh-term'],
        broader_terms: ['test-broader-term'],
        primary_focus: ['primary-keyword-1'],
        secondary_focus: ['secondary-keyword-1'],
        additional_primary_keywords: [],
        additional_secondary_keywords: [],
        all_primary_focus_list: [],
        all_secondary_focus_list: []
      }
    });

    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: enhanceKeywords,
        isPending: false,
        error: null
      },
      generateKeywordString: {
        mutateAsync: vi.fn().mockResolvedValue({
          data: { search_string: 'test search string' }
        }),
        isPending: false,
        error: null
      }
    });

    renderComponent();

    // Wait for enhancement and auto-selection
    await waitFor(() => {
      expect(enhanceKeywords).toHaveBeenCalled();
    });

    // Should enable the next button after auto-selection
    await waitFor(() => {
      const nextButton = screen.getByRole('button', { name: /continue/i });
      expect(nextButton).not.toBeDisabled();
    });
  });

  it('handles enhancement errors gracefully', () => {
    mockUseScholarFinderApi.mockReturnValue({
      enhanceKeywords: {
        mutateAsync: vi.fn(),
        isPending: false,
        error: { message: 'Enhancement failed' }
      },
      generateKeywordString: {
        mutateAsync: vi.fn(),
        isPending: false,
        error: null
      }
    });

    renderComponent();
    
    expect(screen.getByText('Enhancement failed')).toBeInTheDocument();
    expect(screen.getByText('Retry Enhancement')).toBeInTheDocument();
  });

  it('calls onPrevious when previous button is clicked', () => {
    renderComponent();
    
    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);
    
    expect(mockProps.onPrevious).toHaveBeenCalled();
  });
});