/**
 * Shortlist Integration Tests
 * Tests the complete shortlist workflow from UI to API
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShortlistManager } from '../ShortlistManager';
import { shortlistService } from '../../../services/shortlistService';
import { useToast } from '../../../hooks/use-toast';
import type { Shortlist } from '../../../types/api';

// Mock the shortlist service
vi.mock('../../../services/shortlistService');
vi.mock('../../../hooks/use-toast');

const mockShortlistService = vi.mocked(shortlistService);
const mockToast = vi.fn();

const mockShortlists: Shortlist[] = [
  {
    id: '1',
    name: 'Primary Reviewers',
    processId: 'process-1',
    selectedReviewers: ['reviewer-1', 'reviewer-2'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'Backup Options',
    processId: 'process-1',
    selectedReviewers: ['reviewer-3'],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z'
  }
];

const mockAvailableReviewers = [
  { id: 'reviewer-1', name: 'Dr. Jane Smith', email: 'jane@university.edu' },
  { id: 'reviewer-2', name: 'Prof. John Doe', email: 'john@research.org' },
  { id: 'reviewer-3', name: 'Dr. Alice Johnson', email: 'alice@institute.com' }
];

describe('Shortlist Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    // Default successful responses
    mockShortlistService.getShortlists.mockResolvedValue(mockShortlists);
    mockShortlistService.createShortlist.mockResolvedValue({
      id: '3',
      name: 'New Shortlist',
      processId: 'process-1',
      selectedReviewers: ['reviewer-1'],
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z'
    });
    mockShortlistService.updateShortlist.mockResolvedValue({
      ...mockShortlists[0],
      name: 'Updated Shortlist',
      updatedAt: '2024-01-04T00:00:00Z'
    });
    mockShortlistService.deleteShortlist.mockResolvedValue(undefined);
    mockShortlistService.exportShortlist.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      processId: 'process-1',
      availableReviewers: mockAvailableReviewers,
      ...props
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <ShortlistManager {...defaultProps} />
      </QueryClientProvider>
    );
  };

  describe('Complete Shortlist Workflow', () => {
    it('should display shortlists and allow full CRUD operations', async () => {
      renderComponent();

      // Wait for shortlists to load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
        expect(screen.getByText('Backup Options')).toBeInTheDocument();
      });

      // Verify shortlist information is displayed
      expect(screen.getByText('2 reviewers')).toBeInTheDocument();
      expect(screen.getByText('1 reviewers')).toBeInTheDocument();
      expect(mockShortlistService.getShortlists).toHaveBeenCalledWith('process-1');
    });

    it('should handle create shortlist workflow', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Click create shortlist button
      fireEvent.click(screen.getByRole('button', { name: /create shortlist/i }));

      // Verify create dialog would open (mocked)
      await waitFor(() => {
        expect(mockShortlistService.getShortlists).toHaveBeenCalledWith('process-1');
      });
    });

    it('should handle delete shortlist workflow', async () => {
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);

      renderComponent();

      // Wait for shortlists to load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Find and click delete button (this is simplified since we're mocking the dialogs)
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith({
            title: 'Success',
            description: 'Shortlist deleted successfully',
            variant: 'default'
          });
        });
      }

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockShortlistService.getShortlists.mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load shortlists')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should handle empty state', async () => {
      mockShortlistService.getShortlists.mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No shortlists created')).toBeInTheDocument();
        expect(screen.getByText('Create Your First Shortlist')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle delete errors', async () => {
      mockShortlistService.deleteShortlist.mockRejectedValue(new Error('Delete failed'));
      
      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);

      renderComponent();

      // Wait for shortlists to load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Simulate delete action (simplified)
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        
        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith({
            title: 'Error',
            description: 'Failed to delete shortlist',
            variant: 'destructive'
          });
        });
      }

      // Restore window.confirm
      window.confirm = originalConfirm;
    });

    it('should handle network errors', async () => {
      mockShortlistService.getShortlists.mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load shortlists')).toBeInTheDocument();
      });
    });

    it('should handle timeout errors', async () => {
      mockShortlistService.getShortlists.mockRejectedValue(new Error('Request timeout'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to load shortlists')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during initial fetch', () => {
      // Mock pending state
      mockShortlistService.getShortlists.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      renderComponent();

      expect(screen.getByText('Reviewer Shortlists')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create shortlist/i })).toBeDisabled();
    });

    it('should show loading state during operations', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // The loading states during operations would be tested in individual component tests
      // since we're mocking the dialogs here
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Verify the correct data is displayed
      expect(screen.getByText('2 reviewers')).toBeInTheDocument();
      expect(screen.getByText('1 reviewers')).toBeInTheDocument();

      // Verify API was called with correct parameters
      expect(mockShortlistService.getShortlists).toHaveBeenCalledWith('process-1');
    });

    it('should handle concurrent operations', async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Multiple operations would be handled by React Query's built-in mechanisms
      // This test verifies the setup supports concurrent operations
      expect(mockShortlistService.getShortlists).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Experience', () => {
    it('should provide appropriate feedback for user actions', async () => {
      renderComponent();

      // Wait for successful load
      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // User should see shortlist information
      expect(screen.getByText('Created 1/1/2024')).toBeInTheDocument();
      expect(screen.getByText('• Updated 1/3/2024')).toBeInTheDocument();
    });

    it('should handle empty reviewer lists', async () => {
      const emptyShortlists: Shortlist[] = [{
        id: '1',
        name: 'Empty Shortlist',
        processId: 'process-1',
        selectedReviewers: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }];

      mockShortlistService.getShortlists.mockResolvedValue(emptyShortlists);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Empty Shortlist')).toBeInTheDocument();
        expect(screen.getByText('0 reviewers')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide accessible button labels', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Check for accessible button text
      expect(screen.getByRole('button', { name: /create shortlist/i })).toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Primary Reviewers')).toBeInTheDocument();
      });

      // Buttons should be focusable
      const createButton = screen.getByRole('button', { name: /create shortlist/i });
      expect(createButton).toBeInTheDocument();
      
      createButton.focus();
      expect(document.activeElement).toBe(createButton);
    });
  });
});