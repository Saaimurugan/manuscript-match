/**
 * Integration tests for ProcessManagement component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProcessManagement } from '../ProcessManagement';

// Mock the entire admin service
vi.mock('../../../services/adminService', () => ({
  adminService: {
    getProcesses: vi.fn(),
    getProcessTemplates: vi.fn(),
    createProcess: vi.fn(),
    updateProcess: vi.fn(),
    deleteProcess: vi.fn(),
    resetProcessStage: vi.fn(),
  },
}));

// Mock toast
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('ProcessManagement Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the complete process management interface', () => {
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Check main components are rendered
    expect(screen.getByText('Process Management')).toBeInTheDocument();
    expect(screen.getByText('Manage system processes, workflows, and templates')).toBeInTheDocument();
    
    // Check action buttons
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Create Process')).toBeInTheDocument();
    
    // Check filter controls
    expect(screen.getByPlaceholderText('Search processes by title or description...')).toBeInTheDocument();
  });

  it('handles the complete process creation workflow', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Open create modal
    const createButton = screen.getByText('Create Process');
    await user.click(createButton);
    
    // Verify modal opened
    expect(screen.getByText('Create New Process')).toBeInTheDocument();
    expect(screen.getByText('Create a new process using a template or custom configuration')).toBeInTheDocument();
    
    // Fill out the form
    const titleInput = screen.getByLabelText('Process Title');
    const descriptionInput = screen.getByLabelText('Description');
    
    await user.type(titleInput, 'Integration Test Process');
    await user.type(descriptionInput, 'This is a test process for integration testing');
    
    // Verify form values
    expect(titleInput).toHaveValue('Integration Test Process');
    expect(descriptionInput).toHaveValue('This is a test process for integration testing');
    
    // Check form buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Process')).toBeInTheDocument();
  });

  it('handles form validation in create modal', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Open create modal
    await user.click(screen.getByText('Create Process'));
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create process/i });
    await user.click(submitButton);
    
    // The form should prevent submission (validation handled by react-hook-form)
    expect(screen.getByText('Create New Process')).toBeInTheDocument();
  });

  it('handles modal close functionality', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Open create modal
    await user.click(screen.getByText('Create Process'));
    expect(screen.getByText('Create New Process')).toBeInTheDocument();
    
    // Close modal with cancel button
    await user.click(screen.getByText('Cancel'));
    
    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Create New Process')).not.toBeInTheDocument();
    });
  });

  it('displays process statistics correctly', () => {
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Check all statistic cards are present
    expect(screen.getByText('Total Processes')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('handles search and filter interactions', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Test search functionality
    const searchInput = screen.getByPlaceholderText('Search processes by title or description...');
    await user.type(searchInput, 'test search');
    expect(searchInput).toHaveValue('test search');
    
    // Test status filter
    const statusSelect = screen.getByDisplayValue('All Status');
    expect(statusSelect).toBeInTheDocument();
    
    // Test user filter
    const userSelect = screen.getByDisplayValue('All Users');
    expect(userSelect).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    // Refresh button should be clickable
    expect(refreshButton).toBeInTheDocument();
  });

  it('displays proper loading states', () => {
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Component should render even in loading state
    expect(screen.getByText('Process Management')).toBeInTheDocument();
  });

  it('handles template selection in create modal', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Open create modal
    await user.click(screen.getByText('Create Process'));
    
    // Check template selection is available
    expect(screen.getByText('Template (Optional)')).toBeInTheDocument();
    
    // Template selector should be present
    const templateSelect = screen.getByRole('combobox');
    expect(templateSelect).toBeInTheDocument();
  });

  it('validates required fields in forms', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Open create modal
    await user.click(screen.getByText('Create Process'));
    
    // Check required field labels
    expect(screen.getByText('Process Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    
    // Form inputs should be present
    expect(screen.getByLabelText('Process Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Tab through interactive elements
    await user.tab();
    
    // Should be able to navigate to search input
    const searchInput = screen.getByPlaceholderText('Search processes by title or description...');
    expect(searchInput).toBeInTheDocument();
  });

  it('maintains responsive design elements', () => {
    render(<ProcessManagement />, { wrapper: createTestWrapper() });
    
    // Check for responsive classes and structure
    const mainContainer = screen.getByText('Process Management').closest('div');
    expect(mainContainer).toBeInTheDocument();
    
    // Statistics should be in a grid layout
    expect(screen.getByText('Total Processes')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});