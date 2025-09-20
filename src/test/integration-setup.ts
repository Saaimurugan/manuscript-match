import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { AuthResponse, UserProfile, Process, ExtractedMetadata } from '../types/api';

// Mock data
export const mockUser: UserProfile = {
  id: '1',
  email: 'test@example.com',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockAuthResponse: AuthResponse = {
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser
};

export const mockProcess: Process = {
  id: '1',
  title: 'Test Process',
  description: 'Test Description',
  currentStep: 1,
  status: 'ACTIVE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

export const mockMetadata: ExtractedMetadata = {
  title: 'Test Manuscript',
  abstract: 'Test abstract content',
  keywords: ['test', 'manuscript', 'analysis'],
  authors: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      affiliation: 'Test University',
      country: 'US',
      publicationCount: 10,
      recentPublications: ['Publication 1', 'Publication 2'],
      expertise: ['machine learning', 'data science'],
      database: 'pubmed',
      matchScore: 0.95
    }
  ],
  affiliations: [
    {
      id: '1',
      name: 'Test University',
      country: 'US',
      city: 'Test City'
    }
  ]
};

// MSW server setup
export const server = setupServer(
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json(mockAuthResponse);
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  http.get('/api/auth/verify', () => {
    return HttpResponse.json({ valid: true });
  }),

  http.get('/api/auth/profile', () => {
    return HttpResponse.json(mockUser);
  }),

  http.post('/api/auth/change-password', () => {
    return HttpResponse.json({ message: 'Password changed successfully' });
  }),

  // Process endpoints
  http.get('/api/processes', () => {
    return HttpResponse.json({ data: [mockProcess] });
  }),

  http.post('/api/processes', () => {
    return HttpResponse.json(mockProcess);
  }),

  http.get('/api/processes/:id', () => {
    return HttpResponse.json(mockProcess);
  }),

  http.put('/api/processes/:id', () => {
    return HttpResponse.json(mockProcess);
  }),

  http.post('/api/processes/:id/step', () => {
    return HttpResponse.json({ ...mockProcess, currentStep: 2 });
  }),

  http.delete('/api/processes/:id', () => {
    return HttpResponse.json({ message: 'Process deleted successfully' });
  }),

  // File endpoints
  http.post('/api/processes/:id/upload', () => {
    return HttpResponse.json({
      fileId: 'file-1',
      fileName: 'test.pdf',
      fileSize: 1024,
      uploadedAt: '2024-01-01T00:00:00Z'
    });
  }),

  http.get('/api/processes/:id/metadata', () => {
    return HttpResponse.json(mockMetadata);
  }),

  http.put('/api/processes/:id/metadata', () => {
    return HttpResponse.json(mockMetadata);
  }),

  // Keyword endpoints
  http.post('/api/processes/:id/keywords/enhance', () => {
    return HttpResponse.json({
      original: ['test', 'manuscript'],
      enhanced: ['test', 'manuscript', 'analysis', 'research'],
      meshTerms: ['Research', 'Data Analysis'],
      searchStrings: {
        pubmed: '(test OR manuscript) AND analysis',
        elsevier: 'test AND manuscript AND analysis',
        wiley: 'test manuscript analysis',
        taylorFrancis: '"test manuscript" AND analysis'
      }
    });
  }),

  http.get('/api/processes/:id/keywords', () => {
    return HttpResponse.json({
      original: ['test', 'manuscript'],
      enhanced: ['test', 'manuscript', 'analysis', 'research'],
      meshTerms: ['Research', 'Data Analysis'],
      searchStrings: {
        pubmed: '(test OR manuscript) AND analysis',
        elsevier: 'test AND manuscript AND analysis',
        wiley: 'test manuscript analysis',
        taylorFrancis: '"test manuscript" AND analysis'
      }
    });
  }),

  http.post('/api/processes/:id/keywords/selection', () => {
    return HttpResponse.json({ message: 'Selection updated successfully' });
  }),

  // Search endpoints
  http.post('/api/processes/:id/search', () => {
    return HttpResponse.json({ message: 'Search initiated successfully' });
  }),

  http.get('/api/processes/:id/search/status', () => {
    return HttpResponse.json({
      status: 'COMPLETED',
      progress: {
        pubmed: { status: 'COMPLETED', count: 150 },
        elsevier: { status: 'COMPLETED', count: 200 },
        wiley: { status: 'COMPLETED', count: 100 },
        taylorFrancis: { status: 'COMPLETED', count: 75 }
      },
      totalFound: 525
    });
  }),

  http.get('/api/processes/:id/search/manual/name', () => {
    return HttpResponse.json({ data: [mockMetadata.authors[0]] });
  }),

  http.get('/api/processes/:id/search/manual/email', () => {
    return HttpResponse.json({ data: [mockMetadata.authors[0]] });
  }),

  // Validation endpoints
  http.post('/api/processes/:id/validate', () => {
    return HttpResponse.json({ message: 'Validation initiated successfully' });
  }),

  http.get('/api/processes/:id/validation/results', () => {
    return HttpResponse.json({
      totalCandidates: 525,
      validatedReviewers: 420,
      excludedReviewers: 105,
      validationSteps: {
        manuscriptAuthors: { excluded: 25, passed: 500 },
        coAuthors: { excluded: 30, passed: 470 },
        publications: { excluded: 20, passed: 450 },
        retractions: { excluded: 10, passed: 440 },
        institutions: { excluded: 20, passed: 420 }
      }
    });
  }),

  // Recommendation endpoints
  http.get('/api/processes/:id/recommendations', () => {
    return HttpResponse.json({
      data: [mockMetadata.authors[0]],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });
  }),

  // Shortlist endpoints
  http.post('/api/processes/:id/shortlist', () => {
    return HttpResponse.json({
      id: 'shortlist-1',
      name: 'Test Shortlist',
      processId: '1',
      selectedReviewers: ['1'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
  }),

  http.get('/api/processes/:id/shortlists', () => {
    return HttpResponse.json({
      data: [{
        id: 'shortlist-1',
        name: 'Test Shortlist',
        processId: '1',
        selectedReviewers: ['1'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }]
    });
  }),

  http.get('/api/processes/:id/export/:format', () => {
    return HttpResponse.text('Mock export data', {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="shortlist.csv"'
      }
    });
  }),

  // Admin endpoints
  http.get('/api/admin/processes', () => {
    return HttpResponse.json({ data: [mockProcess] });
  }),

  http.get('/api/admin/stats', () => {
    return HttpResponse.json({
      totalProcesses: 100,
      activeProcesses: 25,
      completedProcesses: 75,
      totalUsers: 50,
      activeUsers: 30
    });
  }),

  http.get('/api/admin/logs', () => {
    return HttpResponse.json({
      data: [{
        id: '1',
        userId: '1',
        action: 'LOGIN',
        details: 'User logged in successfully',
        timestamp: '2024-01-01T00:00:00Z'
      }]
    });
  }),

  // Activity logging endpoints
  http.post('/api/activity/log', () => {
    return HttpResponse.json({ message: 'Activity logged successfully' });
  }),

  http.get('/api/activity/logs', () => {
    return HttpResponse.json({
      data: [{
        id: '1',
        userId: '1',
        processId: '1',
        action: 'PROCESS_CREATED',
        details: 'Created new process',
        timestamp: '2024-01-01T00:00:00Z'
      }],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      }
    });
  })
);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());