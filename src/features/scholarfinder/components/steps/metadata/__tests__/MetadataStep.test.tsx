/**
 * MetadataStep Component Tests
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { MetadataStep } from '../../MetadataStep';

// Mock the hooks
vi.mock('../../../hooks/useScholarFinderApi', () => ({
  useScholarFinderApi: () => ({
    useMetadata: () => ({
      data: null,
      isLoading: false,
      error: null
    })
  })
}));

vi.mock('../../../hooks/useProcessManagement', () => ({
  useProcess: () => ({
    data: null
  }),
  useUpdateProcessStep: () => ({
    mutateAsync: vi.fn()
  })
}));

// Mock toast
vi.mock('../../../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock UI components
vi.mock('../../../../../components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

vi.mock('../../../../../components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}));

vi.mock('../../../../../components/ui/alert', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MetadataStep', () => {
  const defaultProps = {
    processId: 'test-process-id',
    jobId: 'test-job-id',
    onNext: vi.fn(),
    onPrevious: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the metadata step component', async () => {
    renderWithQueryClient(<MetadataStep {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Review Manuscript Metadata')).toBeInTheDocument();
    });
  });

  it('shows loading state when loading is true', () => {
    renderWithQueryClient(<MetadataStep {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading manuscript metadata...')).toBeInTheDocument();
  });

  it('renders navigation buttons', async () => {
    renderWithQueryClient(<MetadataStep {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next: Enhance Keywords')).toBeInTheDocument();
    });
  });
});