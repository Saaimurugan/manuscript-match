/**
 * API integration tests with mocked external services
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ScholarFinderApiService } from '../../services/ScholarFinderApiService';
import { UploadStep } from '../../components/steps/UploadStep';
import { KeywordStep } from '../../components/steps/KeywordStep';
import { SearchStep } from '../../components/steps/SearchStep';

// Mock server setup
const server = setupServer(
  // Upload endpoint
  http.post('/api/scholarfinder/upload_extract_metadata', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return HttpResponse.json(
        { type: 'FILE_ERROR', message: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (file.name.endsWith('.txt')) {
      return HttpResponse.json(
        { type: 'FILE_FORMAT_ERROR', message: 'Unsupported file format' },
        { status: 400 }
      );
    }
    
    if (file.size > 100 * 1024 * 1024) {
      return HttpResponse.json(
        { type: 'FILE_ERROR', message: 'File too large' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      message: 'Upload successful',
      data: {
        job_id: 'test-job-123',
        file_name: file.name,
        timestamp: new Date().toISOString(),
        heading: 'Machine Learning Applications in Healthcare',
        authors: ['Dr. John Smith', 'Dr. Sarah Johnson'],
        affiliations: ['Stanford University', 'MIT'],
        keywords: 'machine learning, healthcare, artificial intelligence',
        abstract: 'This paper explores the applications of machine learning in healthcare...',
        author_aff_map: {
          'Dr. John Smith': 'Stanford University',
          'Dr. Sarah Johnson': 'MIT'
        }
      }
    });
  }),

  // Keyword enhancement endpoint
  http.post('/api/scholarfinder/keyword_enhancement', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { type: 'VALIDATION_ERROR', message: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return HttpResponse.json({
      message: 'Keywords enhanced successfully',
      job_id: body.job_id,
      data: {
        mesh_terms: ['Machine Learning', 'Artificial Intelligence', 'Healthcare Technology'],
        broader_terms: ['Computer Science', 'Medical Technology', 'Data Science'],
        primary_focus: ['Deep Learning', 'Neural Networks', 'Medical Diagnosis'],
        secondary_focus: ['Data Mining', 'Pattern Recognition', 'Clinical Decision Support'],
        additional_primary_keywords: ['CNN', 'RNN', 'Medical Imaging'],
        additional_secondary_keywords: ['Classification', 'Regression', 'Predictive Modeling'],
        all_primary_focus_list: ['Deep Learning', 'Neural Networks', 'Medical Diagnosis', 'CNN', 'RNN', 'Medical Imaging'],
        all_secondary_focus_list: ['Data Mining', 'Pattern Recognition', 'Clinical Decision Support', 'Classification', 'Regression', 'Predictive Modeling']
      }
    });
  }),

  // Database search endpoint
  http.post('/api/scholarfinder/database_search', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id || !body.selected_websites || body.selected_websites.length === 0) {
      return HttpResponse.json(
        { type: 'SEARCH_ERROR', message: 'Job ID and databases are required' },
        { status: 400 }
      );
    }
    
    // Simulate longer processing for database search
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const totalReviewers = body.selected_websites.length * 100; // 100 per database
    
    return HttpResponse.json({
      message: 'Database search completed',
      job_id: body.job_id,
      data: {
        total_reviewers: totalReviewers,
        databases_searched: body.selected_websites,
        search_status: body.selected_websites.reduce((acc: any, db: string) => {
          acc[db] = 'success';
          return acc;
        }, {}),
        preview_reviewers: [
          {
            reviewer: 'Dr. Alice Brown',
            email: 'alice.brown@university.edu',
            aff: 'University of California',
            country: 'USA',
            Total_Publications: 95
          },
          {
            reviewer: 'Dr. Bob Wilson',
            email: 'bob.wilson@research.org',
            aff: 'Research Institute',
            country: 'UK',
            Total_Publications: 78
          }
        ]
      }
    });
  }),

  // Validation endpoint
  http.post('/api/scholarfinder/validate_authors', async ({ request }) => {
    const body = await request.json();
    
    if (!body.job_id) {
      return HttpResponse.json(
        { type: 'VALIDATION_ERROR', message: 'Job ID is required' },
        { status: 400 }
      );
    }
    
    // Simulate validation processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return HttpResponse.json({
      message: 'Author validation completed',
      job_id: body.job_id,
      data: {
        validation_status: 'completed',
        progress_percentage: 100,
        estimated_completion_time: new Date().toISOString(),
        total_authors_processed: 250,
        validation_criteria: [
          'No co-authorship with manuscript authors',
          'Different institutional affiliation',
          'Minimum publication threshold met',
          'No recent retractions',
          'Active in relevant field'
        ]
      }
    });
  }),

  // Recommendations endpoint
  http.get('/api/scholarfinder/recommendations/:jobId', ({ params }) => {
    const { jobId } = params;
    
    return HttpResponse.json({
      message: 'Recommendations retrieved',
      job_id: jobId,
      data: {
        reviewers: [
          {
            reviewer: 'Dr. Alice Brown',
            email: 'alice.brown@university.edu',
            aff: 'University of California',
            city: 'Los Angeles',
            country: 'USA',
            Total_Publications: 95,
            English_Pubs: 90,
            'Publications (last 10 years)': 55,
            'Relevant Publications (last 5 years)': 30,
            'Publications (last 2 years)': 12,
            'Publications (last year)': 5,
            Clinical_Trials_no: 3,
            Clinical_study_no: 8,
            Case_reports_no: 2,
            Retracted_Pubs_no: 0,
            TF_Publications_last_year: 3,
            coauthor: false,
            country_match: 'different',
            aff_match: 'different',
            conditions_met: 8,
            conditions_satisfied: '8 of 8'
          },
          {
            reviewer: 'Dr. Bob Wilson',
            email: 'bob.wilson@research.org',
            aff: 'Research Institute',
            city: 'London',
            country: 'UK',
            Total_Publications: 78,
            English_Pubs: 75,
            'Publications (last 10 years)': 45,
            'Relevant Publications (last 5 years)': 25,
            'Publications (last 2 years)': 8,
            'Publications (last year)': 3,
            Clinical_Trials_no: 2,
            Clinical_study_no: 5,
            Case_reports_no: 1,
            Retracted_Pubs_no: 0,
            TF_Publications_last_year: 2,
            coauthor: false,
            country_match: 'different',
            aff_match: 'different',
            conditions_met: 7,
            conditions_satisfied: '7 of 8'
          }
        ],
        total_count: 2,
        validation_summary: {
          total_authors: 250,
          authors_validated: 250,
          conditions_applied: [
            'No co-authorship with manuscript authors',
            'Different institutional affiliation',
            'Minimum publication threshold met'
          ],
          average_conditions_met: 7.5
        }
      }
    });
  }),

  // Error simulation endpoints
  http.post('/api/scholarfinder/simulate_timeout', () => {
    return new Promise(() => {}); // Never resolves to simulate timeout
  }),

  http.post('/api/scholarfinder/simulate_server_error', () => {
    return HttpResponse.json(
      { type: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }),

  http.post('/api/scholarfinder/simulate_rate_limit', () => {
    return HttpResponse.json(
      { type: 'RATE_LIMIT_ERROR', message: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  })
);

// Start server before all tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('API Integration Tests', () => {
  let apiService: ScholarFinderApiService;

  beforeEach(() => {
    apiService = new ScholarFinderApiService();
    vi.clearAllMocks();
  });

  describe('File Upload Integration', () => {
    it('should successfully upload and extract metadata', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UploadStep
            processId="test-process"
            jobId="test-job"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Create and upload file
      const file = new File(['test content'], 'test-manuscript.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const fileInput = screen.getByLabelText(/file upload/i);
      await user.upload(fileInput, file);

      // Should show upload progress and success
      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
      });

      // Should display extracted metadata
      await waitFor(() => {
        expect(screen.getByText('Machine Learning Applications in Healthcare')).toBeInTheDocument();
        expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
        expect(screen.getByText('Stanford University')).toBeInTheDocument();
      });
    });

    it('should handle file format errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UploadStep
            processId="test-process"
            jobId="test-job"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Upload invalid file type
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/file upload/i);
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/unsupported file format/i)).toBeInTheDocument();
      });
    });

    it('should handle file size errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <UploadStep
            processId="test-process"
            jobId="test-job"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Create large file (mock size)
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      const fileInput = screen.getByLabelText(/file upload/i);
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyword Enhancement Integration', () => {
    it('should enhance keywords successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <KeywordStep
            processId="test-process"
            jobId="test-job-123"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Start keyword enhancement
      const enhanceButton = screen.getByText(/enhance keywords/i);
      await user.click(enhanceButton);

      // Should show loading state
      expect(screen.getByText(/enhancing/i)).toBeInTheDocument();

      // Should display enhanced keywords
      await waitFor(() => {
        expect(screen.getByText('Machine Learning')).toBeInTheDocument();
        expect(screen.getByText('Deep Learning')).toBeInTheDocument();
        expect(screen.getByText('Neural Networks')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show MeSH terms
      expect(screen.getByText('Healthcare Technology')).toBeInTheDocument();
    });

    it('should handle keyword enhancement errors', async () => {
      const user = userEvent.setup();
      
      // Mock error response
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return HttpResponse.json(
            { type: 'VALIDATION_ERROR', message: 'Job ID is required' },
            { status: 400 }
          );
        })
      );

      render(
        <TestWrapper>
          <KeywordStep
            processId="test-process"
            jobId=""
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      const enhanceButton = screen.getByText(/enhance keywords/i);
      await user.click(enhanceButton);

      await waitFor(() => {
        expect(screen.getByText(/job id is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Database Search Integration', () => {
    it('should perform database search successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SearchStep
            processId="test-process"
            jobId="test-job-123"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Select databases
      await user.check(screen.getByLabelText(/pubmed/i));
      await user.check(screen.getByLabelText(/elsevier/i));

      // Start search
      const searchButton = screen.getByText(/start search/i);
      await user.click(searchButton);

      // Should show progress
      expect(screen.getByText(/searching/i)).toBeInTheDocument();

      // Should show results
      await waitFor(() => {
        expect(screen.getByText(/200 potential reviewers found/i)).toBeInTheDocument();
        expect(screen.getByText('Dr. Alice Brown')).toBeInTheDocument();
        expect(screen.getByText('Dr. Bob Wilson')).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it('should handle search validation errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <SearchStep
            processId="test-process"
            jobId="test-job-123"
            onNext={vi.fn()}
            onPrevious={vi.fn()}
          />
        </TestWrapper>
      );

      // Try to search without selecting databases
      const searchButton = screen.getByText(/start search/i);
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/databases are required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network timeouts', async () => {
      // Mock timeout
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return new Promise(() => {}); // Never resolves
        })
      );

      const result = apiService.enhanceKeywords('test-job-123');
      
      // Should timeout and throw appropriate error
      await expect(result).rejects.toMatchObject({
        type: 'TIMEOUT_ERROR',
        retryable: true
      });
    });

    it('should handle server errors', async () => {
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return HttpResponse.json(
            { type: 'SERVER_ERROR', message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(apiService.enhanceKeywords('test-job-123')).rejects.toMatchObject({
        type: 'EXTERNAL_API_ERROR',
        retryable: true
      });
    });

    it('should handle rate limiting', async () => {
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return HttpResponse.json(
            { type: 'RATE_LIMIT_ERROR', message: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': '60' } }
          );
        })
      );

      await expect(apiService.enhanceKeywords('test-job-123')).rejects.toMatchObject({
        type: 'EXTERNAL_API_ERROR',
        retryable: true,
        retryAfter: 60000
      });
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate API responses', async () => {
      // Mock invalid response structure
      server.use(
        http.post('/api/scholarfinder/upload_extract_metadata', () => {
          return HttpResponse.json({
            // Missing required fields
            message: 'Upload successful'
            // data field is missing
          });
        })
      );

      const file = new File(['test'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      await expect(apiService.uploadManuscript(file)).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: expect.stringContaining('Invalid response format')
      });
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return new Response('Invalid JSON{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );

      await expect(apiService.enhanceKeywords('test-job-123')).rejects.toMatchObject({
        type: 'EXTERNAL_API_ERROR',
        message: expect.stringContaining('Invalid response format')
      });
    });
  });

  describe('Retry Logic Integration', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json(
              { type: 'SERVER_ERROR', message: 'Temporary error' },
              { status: 500 }
            );
          }
          return HttpResponse.json({
            message: 'Success on retry',
            job_id: 'test-job-123',
            data: { mesh_terms: [], broader_terms: [], primary_focus: [], secondary_focus: [] }
          });
        })
      );

      const result = await apiService.enhanceKeywords('test-job-123');
      
      expect(attemptCount).toBe(3);
      expect(result.message).toBe('Success on retry');
    });

    it('should respect retry-after headers', async () => {
      const startTime = Date.now();
      
      server.use(
        http.post('/api/scholarfinder/keyword_enhancement', () => {
          return HttpResponse.json(
            { type: 'RATE_LIMIT_ERROR', message: 'Rate limited' },
            { status: 429, headers: { 'Retry-After': '1' } }
          );
        })
      );

      await expect(apiService.enhanceKeywords('test-job-123')).rejects.toMatchObject({
        type: 'EXTERNAL_API_ERROR',
        retryAfter: 1000
      });
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThan(900); // Should wait at least 1 second
    });
  });
});