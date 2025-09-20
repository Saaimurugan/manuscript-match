import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Custom render function that includes providers
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  role: 'USER' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockProcess = (overrides = {}) => ({
  id: '1',
  title: 'Test Process',
  description: 'Test Description',
  currentStep: 1,
  status: 'ACTIVE' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockAuthor = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  affiliation: 'Test University',
  country: 'US',
  publicationCount: 10,
  recentPublications: ['Publication 1', 'Publication 2'],
  expertise: ['machine learning', 'data science'],
  database: 'pubmed',
  matchScore: 0.95,
  ...overrides,
});

export const createMockFile = (name = 'test.pdf', type = 'application/pdf') => {
  return new File(['test content'], name, { type });
};

// Wait for async operations to complete
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Mock API response helpers
export const mockApiSuccess = <T>(data: T) => ({
  data,
  message: 'Success',
  timestamp: new Date().toISOString(),
});

export const mockApiError = (message: string, type = 'GENERIC_ERROR') => ({
  type,
  message,
  timestamp: new Date().toISOString(),
});

// Custom matchers for better assertions
export const expectToBeLoading = (element: HTMLElement) => {
  expect(element).toHaveAttribute('aria-busy', 'true');
};

export const expectToHaveError = (element: HTMLElement, message?: string) => {
  expect(element).toHaveAttribute('aria-invalid', 'true');
  if (message) {
    expect(element).toHaveAccessibleDescription(message);
  }
};

// Mock intersection observer for virtual scrolling tests
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
};

// Mock resize observer for responsive components
export const mockResizeObserver = () => {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
};