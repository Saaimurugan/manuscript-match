import { DatabaseIntegrationService } from '../../services/DatabaseIntegrationService';
import { PubMedClient } from '../../services/database/PubMedClient';
import { ElsevierClient } from '../../services/database/ElsevierClient';
import { WileyClient } from '../../services/database/WileyClient';
import { TaylorFrancisClient } from '../../services/database/TaylorFrancisClient';
import { DatabaseType, SearchTerms } from '../../types';

// Mock the database clients
jest.mock('../../services/database/PubMedClient');
jest.mock('../../services/database/ElsevierClient');
jest.mock('../../services/database/WileyClient');
jest.mock('../../services/database/TaylorFrancisClient');

const MockedPubMedClient = PubMedClient as jest.MockedClass<typeof PubMedClient>;
const MockedElsevierClient = ElsevierClient as jest.MockedClass<typeof ElsevierClient>;
const MockedWileyClient = WileyClient as jest.MockedClass<typeof WileyClient>;
const MockedTaylorFrancisClient = TaylorFrancisClient as jest.MockedClass<typeof TaylorFrancisClient>;

describe('DatabaseIntegrationService', () => {
  let service: DatabaseIntegrationService;
  let mockPubMedClient: jest.Mocked<PubMedClient>;
  let mockElsevierClient: jest.Mocked<ElsevierClient>;
  let mockWileyClient: jest.Mocked<WileyClient>;
  let mockTaylorFrancisClient: jest.Mocked<TaylorFrancisClient>;

  const mockSearchTerms: SearchTerms = {
    keywords: ['machine learning', 'neural networks'],
    meshTerms: ['Machine Learning', 'Neural Networks, Computer'],
    booleanQueries: {
      [DatabaseType.PUBMED]: 'machine learning[Title/Abstract] OR neural networks[Title/Abstract]',
      [DatabaseType.ELSEVIER]: 'TITLE-ABS-KEY(machine learning OR neural networks)',
      [DatabaseType.WILEY]: 'title:machine learning OR title:neural networks',
      [DatabaseType.TAYLOR_FRANCIS]: 'title:machine learning OR title:neural networks',
    },
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPubMedClient = new MockedPubMedClient() as jest.Mocked<PubMedClient>;
    mockElsevierClient = new MockedElsevierClient('test-key') as jest.Mocked<ElsevierClient>;
    mockWileyClient = new MockedWileyClient() as jest.Mocked<WileyClient>;
    mockTaylorFrancisClient = new MockedTaylorFrancisClient() as jest.Mocked<TaylorFrancisClient>;

    // Mock constructor implementations
    MockedPubMedClient.mockImplementation(() => mockPubMedClient);
    MockedElsevierClient.mockImplementation(() => mockElsevierClient);
    MockedWileyClient.mockImplementation(() => mockWileyClient);
    MockedTaylorFrancisClient.mockImplementation(() => mockTaylorFrancisClient);

    service = new DatabaseIntegrationService({
      pubmedApiKey: 'test-pubmed-key',
      elsevierApiKey: 'test-elsevier-key',
    });
  });  
describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new DatabaseIntegrationService();
      expect(defaultService.getEnabledDatabases()).toContain(DatabaseType.PUBMED);
      expect(defaultService.getEnabledDatabases()).toContain(DatabaseType.WILEY);
      expect(defaultService.getEnabledDatabases()).toContain(DatabaseType.TAYLOR_FRANCIS);
    });

    it('should initialize with custom configuration', () => {
      const customService = new DatabaseIntegrationService({
        enabledDatabases: [DatabaseType.PUBMED, DatabaseType.ELSEVIER],
        elsevierApiKey: 'test-key',
      });
      
      const enabledDatabases = customService.getEnabledDatabases();
      expect(enabledDatabases).toContain(DatabaseType.PUBMED);
      expect(enabledDatabases).toContain(DatabaseType.ELSEVIER);
      expect(enabledDatabases).not.toContain(DatabaseType.WILEY);
      expect(enabledDatabases).not.toContain(DatabaseType.TAYLOR_FRANCIS);
    });

    it('should not initialize Elsevier client without API key', () => {
      const serviceWithoutElsevier = new DatabaseIntegrationService({
        enabledDatabases: [DatabaseType.PUBMED, DatabaseType.ELSEVIER],
        // No elsevierApiKey provided
      });
      
      const enabledDatabases = serviceWithoutElsevier.getEnabledDatabases();
      expect(enabledDatabases).toContain(DatabaseType.PUBMED);
      expect(enabledDatabases).not.toContain(DatabaseType.ELSEVIER);
    });
  });

  describe('searchAuthors', () => {
    const processId = 'test-process-id';

    beforeEach(() => {
      // Mock successful search results
      const mockAuthor = {
        id: 'test-author-1',
        name: 'John Doe',
        affiliations: [],
        publicationCount: 10,
        clinicalTrials: 2,
        retractions: 0,
        researchAreas: ['Machine Learning'],
        meshTerms: ['Machine Learning'],
      };

      mockPubMedClient.searchAuthors.mockResolvedValue({
        database: DatabaseType.PUBMED,
        authors: [mockAuthor],
        totalFound: 1,
        searchTime: 1000,
        hasMore: false,
      });

      mockWileyClient.searchAuthors.mockResolvedValue({
        database: DatabaseType.WILEY,
        authors: [{ ...mockAuthor, id: 'wiley-author-1' }],
        totalFound: 1,
        searchTime: 1500,
        hasMore: false,
      });

      mockTaylorFrancisClient.searchAuthors.mockResolvedValue({
        database: DatabaseType.TAYLOR_FRANCIS,
        authors: [{ ...mockAuthor, id: 'tf-author-1' }],
        totalFound: 1,
        searchTime: 1200,
        hasMore: false,
      });
    });

    it('should initiate parallel searches across all databases', async () => {
      await service.searchAuthors(processId, mockSearchTerms);

      expect(mockPubMedClient.searchAuthors).toHaveBeenCalledWith(
        mockSearchTerms,
        expect.objectContaining({ maxResults: 100 })
      );
      expect(mockWileyClient.searchAuthors).toHaveBeenCalledWith(
        mockSearchTerms,
        expect.objectContaining({ maxResults: 100 })
      );
      expect(mockTaylorFrancisClient.searchAuthors).toHaveBeenCalledWith(
        mockSearchTerms,
        expect.objectContaining({ maxResults: 100 })
      );
    });

    it('should track search status during execution', async () => {
      const searchPromise = service.searchAuthors(processId, mockSearchTerms);
      
      // Check initial status
      const initialStatus = service.getSearchStatus(processId);
      expect(initialStatus).toBeTruthy();
      expect(initialStatus!.status).toBe('searching');
      expect(initialStatus!.processId).toBe(processId);
      expect(initialStatus!.databases).toHaveLength(3); // PubMed, Wiley, Taylor & Francis

      await searchPromise;

      // Check final status
      const finalStatus = service.getSearchStatus(processId);
      expect(finalStatus!.status).toBe('completed');
      expect(finalStatus!.totalAuthorsFound).toBe(3);
    });

    it('should handle individual database failures gracefully', async () => {
      // Make PubMed fail
      mockPubMedClient.searchAuthors.mockRejectedValue(new Error('PubMed API error'));

      await service.searchAuthors(processId, mockSearchTerms);

      const status = service.getSearchStatus(processId);
      expect(status!.status).toBe('completed');
      
      const pubmedProgress = status!.databases.find(db => db.database === DatabaseType.PUBMED);
      expect(pubmedProgress!.status).toBe('error');
      expect(pubmedProgress!.error).toBe('PubMed API error');

      const wileyProgress = status!.databases.find(db => db.database === DatabaseType.WILEY);
      expect(wileyProgress!.status).toBe('completed');
    });

    it('should handle complete search failure', async () => {
      // Make all databases fail
      mockPubMedClient.searchAuthors.mockRejectedValue(new Error('PubMed error'));
      mockWileyClient.searchAuthors.mockRejectedValue(new Error('Wiley error'));
      mockTaylorFrancisClient.searchAuthors.mockRejectedValue(new Error('Taylor & Francis error'));

      await service.searchAuthors(processId, mockSearchTerms);

      const status = service.getSearchStatus(processId);
      expect(status!.status).toBe('completed');
      expect(status!.totalAuthorsFound).toBe(0);
      
      status!.databases.forEach(dbProgress => {
        expect(dbProgress.status).toBe('error');
        expect(dbProgress.error).toBeTruthy();
      });
    });
  });

  describe('searchByName', () => {
    const testName = 'John Smith';

    beforeEach(() => {
      const mockAuthor = {
        id: 'test-author-1',
        name: testName,
        affiliations: [],
        publicationCount: 5,
        clinicalTrials: 1,
        retractions: 0,
        researchAreas: ['Computer Science'],
        meshTerms: [],
      };

      mockPubMedClient.searchByName.mockResolvedValue([mockAuthor]);
      mockWileyClient.searchByName.mockResolvedValue([{ ...mockAuthor, id: 'wiley-author-1' }]);
      mockTaylorFrancisClient.searchByName.mockResolvedValue([]);
    });

    it('should search across all enabled databases', async () => {
      const results = await service.searchByName(testName);

      expect(mockPubMedClient.searchByName).toHaveBeenCalledWith(testName);
      expect(mockWileyClient.searchByName).toHaveBeenCalledWith(testName);
      expect(mockTaylorFrancisClient.searchByName).toHaveBeenCalledWith(testName);
      
      expect(results).toHaveLength(2); // Deduplicated by name
    });

    it('should deduplicate authors by name', async () => {
      // Both PubMed and Wiley return the same author name
      const sameAuthor = {
        id: 'different-id',
        name: testName,
        affiliations: [],
        publicationCount: 10, // Higher publication count
        clinicalTrials: 2,
        retractions: 0,
        researchAreas: ['Machine Learning'],
        meshTerms: [],
      };

      mockPubMedClient.searchByName.mockResolvedValue([sameAuthor]);
      mockWileyClient.searchByName.mockResolvedValue([{
        ...sameAuthor,
        id: 'wiley-id',
        publicationCount: 5, // Lower publication count
      }]);

      const results = await service.searchByName(testName);

      expect(results).toHaveLength(1);
      expect(results[0]?.publicationCount).toBe(10); // Should keep the one with higher publication count
    });

    it('should handle database failures gracefully', async () => {
      mockPubMedClient.searchByName.mockRejectedValue(new Error('API error'));
      
      const results = await service.searchByName(testName);

      // Should still return results from working databases
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe('wiley-author-1');
    });
  });

  describe('getSearchStatus', () => {
    it('should return null for non-existent process', () => {
      const status = service.getSearchStatus('non-existent-process');
      expect(status).toBeNull();
    });

    it('should return search status for existing process', async () => {
      const processId = 'test-process';
      
      // Start a search
      const searchPromise = service.searchAuthors(processId, mockSearchTerms);
      
      const status = service.getSearchStatus(processId);
      expect(status).toBeTruthy();
      expect(status!.processId).toBe(processId);
      
      await searchPromise;
    });
  });

  describe('clearSearchStatus', () => {
    it('should remove search status for a process', async () => {
      const processId = 'test-process';
      
      await service.searchAuthors(processId, mockSearchTerms);
      
      expect(service.getSearchStatus(processId)).toBeTruthy();
      
      service.clearSearchStatus(processId);
      
      expect(service.getSearchStatus(processId)).toBeNull();
    });
  });
});