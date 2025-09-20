/**
 * Integration tests for search components
 * Tests the interaction between search components and backend services
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewerSearch } from '../ReviewerSearch';
import { SearchProgress } from '../SearchProgress';
import { ManualSearch } from '../ManualSearch';
import { searchService } from '../../../services/searchService';
import { keywordService } from '../../../services/keywordService';
import type { EnhancedKeywords, SearchStatus } from '../../../types/api';

// Mock services
vi.mock('../../../services/searchService');
vi.mock('../../../services/keywordService');
vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockSearchService = searchService as any;
const mockKeywordService = keywordService as any;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Search Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReviewerSearch Component', () => {
    const mockEnhancedKeywords: EnhancedKeywords = {
      original: ['machine learning', 'AI'],
      enhanced: ['artificial intelligence', 'neural networks'],
      meshTerms: ['Machine Learning', 'Artificial Intelligence'],
      searchStrings: {
        pubmed: '(machine learning OR AI) AND (artificial intelligence OR neural networks)',
        elsevier: '(machine learning OR AI) AND (artificial intelligence OR neural networks)',
        wiley: '(machine learning OR AI) AND (artificial intelligence OR neural networks)',
        taylorFrancis: '(machine learning OR AI) AND (artificial intelligence OR neural networks)'
      }
    };

    it('should load and display enhanced keywords', async () => {
      mockKeywordService.getKeywords.mockResolvedValue(mockEnhancedKeywords);

      render(
        <TestWrapper>
          <ReviewerSearch
            processId="test-process"
            primaryKeywords={[]}
            secondaryKeywords={[]}
            onKeywordsChange={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Enhanced Keywords Summary')).toBeInTheDocument();
      });

      // Check if original keywords are displayed
      expect(screen.getByText('machine learning')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();

      // Check if enhanced keywords are displayed
      expect(screen.getByText('artificial intelligence')).toBeInTheDocument();
      expect(screen.getByText('neural networks')).toBeInTheDocument();
    });

    it('should initiate search when search button is clicked', async () => {
      mockKeywordService.getKeywords.mockResolvedValue(mockEnhancedKeywords);
      mockSearchService.initiateSearch.mockResolvedValue(undefined);

      const onKeywordsChange = vi.fn();

      render(
        <TestWrapper>
          <ReviewerSearch
            processId="test-process"
            primaryKeywords={['machine learning']}
            secondaryKeywords={['AI']}
            onKeywordsChange={onKeywordsChange}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Search for Reviewers')).toBeInTheDocument();
      });

      // Click search button
      const searchButton = screen.getByText('Search for Reviewers');
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(mockSearchService.initiateSearch).toHaveBeenCalledWith(
          'test-process',
          expect.objectContaining({
            keywords: ['machine learning', 'AI'],
            databases: expect.arrayContaining(['pubmed', 'elsevier'])
          })
        );
      });
    });

    it('should handle search initiation errors', async () => {
      mockKeywordService.getKeywords.mockResolvedValue(mockEnhancedKeywords);
      mockSearchService.initiateSearch.mockRejectedValue(new Error('Search failed'));

      render(
        <TestWrapper>
          <ReviewerSearch
            processId="test-process"
            primaryKeywords={['test']}
            secondaryKeywords={[]}
            onKeywordsChange={vi.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Search for Reviewers')).toBeInTheDocument();
      });

      const searchButton = screen.getByText('Search for Reviewers');
      fireEvent.click(searchButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(mockSearchService.initiateSearch).toHaveBeenCalled();
      });
    });
  });

  describe('SearchProgress Component', () => {
    it('should display search progress correctly', async () => {
      const mockStatus: SearchStatus = {
        status: 'IN_PROGRESS',
        progress: {
          pubmed: { status: 'COMPLETED', count: 100 },
          elsevier: { status: 'IN_PROGRESS', count: 50 },
          wiley: { status: 'PENDING', count: 0 },
          taylorFrancis: { status: 'PENDING', count: 0 }
        },
        totalFound: 150
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      render(
        <TestWrapper>
          <SearchProgress processId="test-process" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Search Progress')).toBeInTheDocument();
        expect(screen.getByText('Searching databases for potential reviewers...')).toBeInTheDocument();
      });

      // Check database progress
      expect(screen.getByText('PubMed')).toBeInTheDocument();
      expect(screen.getByText('Found 100 reviewers')).toBeInTheDocument();
      expect(screen.getByText('Elsevier/ScienceDirect')).toBeInTheDocument();
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should display completed search status', async () => {
      const mockStatus: SearchStatus = {
        status: 'COMPLETED',
        progress: {
          pubmed: { status: 'COMPLETED', count: 200 },
          elsevier: { status: 'COMPLETED', count: 150 },
          wiley: { status: 'COMPLETED', count: 100 },
          taylorFrancis: { status: 'COMPLETED', count: 50 }
        },
        totalFound: 500
      };

      mockSearchService.getSearchStatus.mockResolvedValue(mockStatus);

      render(
        <TestWrapper>
          <SearchProgress processId="test-process" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Search completed! Found 500 potential reviewers.')).toBeInTheDocument();
      });
    });
  });

  describe('ManualSearch Component', () => {
    it('should perform manual search by name', async () => {
      const mockResults = [
        {
          id: 'author-1',
          name: 'John Smith',
          email: 'john@example.com',
          affiliation: 'University',
          country: 'US',
          publicationCount: 10,
          recentPublications: [],
          expertise: [],
          database: 'manual',
          matchScore: 1.0
        }
      ];

      mockSearchService.searchByName.mockResolvedValue(mockResults);

      render(
        <TestWrapper>
          <ManualSearch processId="test-process" />
        </TestWrapper>
      );

      // Find name input and search button
      const nameInput = screen.getByPlaceholderText('Enter reviewer name...');
      const nameSearchButton = nameInput.parentElement?.querySelector('button');

      // Enter name and click search
      fireEvent.change(nameInput, { target: { value: 'John Smith' } });
      fireEvent.click(nameSearchButton!);

      await waitFor(() => {
        expect(mockSearchService.searchByName).toHaveBeenCalledWith(
          'test-process',
          'John Smith'
        );
      });
    });

    it('should perform manual search by email', async () => {
      const mockResults = [
        {
          id: 'author-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          affiliation: 'Research Institute',
          country: 'UK',
          publicationCount: 25,
          recentPublications: [],
          expertise: [],
          database: 'manual',
          matchScore: 1.0
        }
      ];

      mockSearchService.searchByEmail.mockResolvedValue(mockResults);

      render(
        <TestWrapper>
          <ManualSearch processId="test-process" />
        </TestWrapper>
      );

      // Find email input and search button
      const emailInput = screen.getByPlaceholderText('Enter reviewer email...');
      const emailSearchButton = emailInput.parentElement?.querySelector('button');

      // Enter email and click search
      fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
      fireEvent.click(emailSearchButton!);

      await waitFor(() => {
        expect(mockSearchService.searchByEmail).toHaveBeenCalledWith(
          'test-process',
          'jane@example.com'
        );
      });
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <ManualSearch processId="test-process" />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('Enter reviewer email...');
      const emailSearchButton = emailInput.parentElement?.querySelector('button');

      // Enter invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(emailSearchButton!);

      // Should not call the service with invalid email
      expect(mockSearchService.searchByEmail).not.toHaveBeenCalled();
    });
  });
});