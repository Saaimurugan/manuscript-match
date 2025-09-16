import { PubMedClient } from '../../../services/database/PubMedClient';
import { DatabaseType, SearchTerms } from '../../../types';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('PubMedClient', () => {
  let client: PubMedClient;

  const mockSearchTerms: SearchTerms = {
    keywords: ['machine learning', 'neural networks'],
    meshTerms: ['Machine Learning', 'Neural Networks, Computer'],
    booleanQueries: {
      [DatabaseType.PUBMED]: 'machine learning[Title/Abstract] OR neural networks[Title/Abstract]',
      [DatabaseType.ELSEVIER]: '',
      [DatabaseType.WILEY]: '',
      [DatabaseType.TAYLOR_FRANCIS]: '',
    },
  };

  beforeEach(() => {
    client = new PubMedClient('test-api-key');
    jest.clearAllMocks();
  });

  describe('searchAuthors', () => {
    const mockSearchResponse = {
      esearchresult: {
        count: '2',
        retmax: '2',
        retstart: '0',
        idlist: ['12345678', '87654321'],
      },
    };

    const mockSummaryResponse = {
      result: {
        '12345678': {
          uid: '12345678',
          title: 'Machine Learning in Healthcare',
          authors: [
            { name: 'Smith J', authtype: 'Author' },
            { name: 'Doe A', authtype: 'Author' },
          ],
          source: 'Nature Medicine',
          pubdate: '2023',
          fulljournalname: 'Nature Medicine',
        },
        '87654321': {
          uid: '87654321',
          title: 'Neural Networks for Diagnosis',
          authors: [
            { name: 'Johnson B', authtype: 'Author' },
            { name: 'Smith J', authtype: 'Author' }, // Same author as above
          ],
          source: 'Science',
          pubdate: '2023',
          fulljournalname: 'Science',
        },
      },
    };

    beforeEach(() => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryResponse),
        } as Response);
    });

    it('should search authors successfully', async () => {
      const result = await client.searchAuthors(mockSearchTerms);

      expect(result.database).toBe(DatabaseType.PUBMED);
      expect(result.authors).toHaveLength(3); // Smith J, Doe A, Johnson B (deduplicated)
      expect(result.totalFound).toBe(2);
      expect(result.searchTime).toBeGreaterThan(0);
      expect(result.hasMore).toBe(false);

      // Check that Smith J has higher publication count due to appearing in multiple papers
      const smithAuthor = result.authors.find(author => author.name === 'Smith J');
      expect(smithAuthor).toBeTruthy();
      expect(smithAuthor!.publicationCount).toBe(2);
    });

    it('should use boolean query when provided', async () => {
      await client.searchAuthors(mockSearchTerms);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('term=machine%20learning%5BTitle%2FAbstract%5D%20OR%20neural%20networks%5BTitle%2FAbstract%5D'),
        expect.any(Object)
      );
    });

    it('should construct query from keywords when boolean query not provided', async () => {
      const searchTermsWithoutBoolean = {
        ...mockSearchTerms,
        booleanQueries: {
          ...mockSearchTerms.booleanQueries,
          [DatabaseType.PUBMED]: '',
        },
      };

      await client.searchAuthors(searchTermsWithoutBoolean);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('machine%20learning%5BTitle%2FAbstract%5D%20OR%20neural%20networks%5BTitle%2FAbstract%5D'),
        expect.any(Object)
      );
    });

    it('should handle empty search results', async () => {
      mockFetch.mockReset().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          esearchresult: {
            count: '0',
            retmax: '0',
            retstart: '0',
            idlist: [],
          },
        }),
      } as Response);

      const result = await client.searchAuthors(mockSearchTerms);

      expect(result.authors).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should handle API errors', async () => {
      mockFetch.mockReset().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(client.searchAuthors(mockSearchTerms)).rejects.toThrow('PubMed search failed');
    });

    it('should include API key in requests when provided', async () => {
      await client.searchAuthors(mockSearchTerms);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api_key=test-api-key'),
        expect.any(Object)
      );
    });

    it('should respect rate limiting', async () => {
      const startTime = Date.now();
      
      // Make two consecutive calls
      await client.searchAuthors(mockSearchTerms);
      
      // Reset mocks for second call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryResponse),
        } as Response);
      
      await client.searchAuthors(mockSearchTerms);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should take at least the rate limit delay (334ms) between calls
      expect(totalTime).toBeGreaterThan(334);
    });
  });

  describe('searchByName', () => {
    const testName = 'John Smith';

    beforeEach(() => {
      const mockSearchResponse = {
        esearchresult: {
          count: '1',
          retmax: '1',
          retstart: '0',
          idlist: ['12345678'],
        },
      };

      const mockSummaryResponse = {
        result: {
          '12345678': {
            uid: '12345678',
            title: 'Research Paper',
            authors: [
              { name: 'Smith J', authtype: 'Author' },
            ],
            source: 'Journal',
            pubdate: '2023',
            fulljournalname: 'Test Journal',
          },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryResponse),
        } as Response);
    });

    it('should search by author name', async () => {
      const results = await client.searchByName(testName);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`term=${encodeURIComponent(testName + '[Author]')}`),
        expect.any(Object)
      );

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Smith J');
    });

    it('should return empty array when no results found', async () => {
      mockFetch.mockReset().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          esearchresult: {
            count: '0',
            retmax: '0',
            retstart: '0',
            idlist: [],
          },
        }),
      } as Response);

      const results = await client.searchByName(testName);
      expect(results).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockReset().mockRejectedValueOnce(new Error('Network error'));

      const results = await client.searchByName(testName);
      expect(results).toHaveLength(0);
    });
  });

  describe('searchByEmail', () => {
    it('should return empty array for email search', async () => {
      // PubMed doesn't support email search effectively
      const results = await client.searchByEmail('test@example.com');
      expect(results).toHaveLength(0);
    });
  });

  describe('getAuthorProfile', () => {
    it('should extract author name from ID and search', async () => {
      const authorId = 'pubmed-' + Buffer.from('John Smith').toString('base64');
      
      // Mock the search by name call
      const mockSearchResponse = {
        esearchresult: {
          count: '1',
          retmax: '1',
          retstart: '0',
          idlist: ['12345678'],
        },
      };

      const mockSummaryResponse = {
        result: {
          '12345678': {
            uid: '12345678',
            title: 'Research Paper',
            authors: [
              { name: 'John Smith', authtype: 'Author' },
            ],
            source: 'Journal',
            pubdate: '2023',
            fulljournalname: 'Test Journal',
          },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSummaryResponse),
        } as Response);

      const result = await client.getAuthorProfile(authorId);

      expect(result).toBeTruthy();
      expect(result!.name).toBe('John Smith');
    });

    it('should return null when author not found', async () => {
      const authorId = 'pubmed-' + Buffer.from('Nonexistent Author').toString('base64');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          esearchresult: {
            count: '0',
            retmax: '0',
            retstart: '0',
            idlist: [],
          },
        }),
      } as Response);

      const result = await client.getAuthorProfile(authorId);
      expect(result).toBeNull();
    });
  });
});