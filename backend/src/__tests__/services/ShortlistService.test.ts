import { ShortlistService } from '../../services/ShortlistService';
import { ShortlistRepository } from '../../repositories/ShortlistRepository';
import { ProcessAuthorRepository } from '../../repositories/ProcessAuthorRepository';
import { AuthorRepository } from '../../repositories/AuthorRepository';
import { AuthorRole } from '../../types';
import * as fs from 'fs';


// Mock the dependencies
jest.mock('../../repositories/ShortlistRepository');
jest.mock('../../repositories/ProcessAuthorRepository');
jest.mock('../../repositories/AuthorRepository');
jest.mock('fs');
jest.mock('csv-writer');
jest.mock('xlsx');

const MockedShortlistRepository = ShortlistRepository as jest.MockedClass<typeof ShortlistRepository>;
const MockedProcessAuthorRepository = ProcessAuthorRepository as jest.MockedClass<typeof ProcessAuthorRepository>;
const MockedAuthorRepository = AuthorRepository as jest.MockedClass<typeof AuthorRepository>;

describe('ShortlistService', () => {
  let shortlistService: ShortlistService;
  let mockShortlistRepository: jest.Mocked<ShortlistRepository>;
  let mockProcessAuthorRepository: jest.Mocked<ProcessAuthorRepository>;
  let mockAuthorRepository: jest.Mocked<AuthorRepository>;

  const mockProcessId = 'process-123';
  const mockAuthorId = 'author-123';
  const mockShortlistId = 'shortlist-123';

  const mockAuthor = {
    id: mockAuthorId,
    name: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    publicationCount: 25,
    clinicalTrials: 3,
    retractions: 0,
    researchAreas: JSON.stringify(['Cardiology', 'Clinical Research']),
    meshTerms: JSON.stringify(['Heart Disease', 'Clinical Trials']),
    affiliations: [{
      affiliation: {
        id: 'affiliation-123',
        institutionName: 'University Medical Center',
        department: 'Cardiology',
        country: 'USA',
        address: '123 Medical Drive'
      }
    }],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockShortlist = {
    id: mockShortlistId,
    processId: mockProcessId,
    name: 'Test Shortlist',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockShortlistRepository = new MockedShortlistRepository({} as any) as jest.Mocked<ShortlistRepository>;
    mockProcessAuthorRepository = new MockedProcessAuthorRepository({} as any) as jest.Mocked<ProcessAuthorRepository>;
    mockAuthorRepository = new MockedAuthorRepository({} as any) as jest.Mocked<AuthorRepository>;

    shortlistService = new ShortlistService(
      mockShortlistRepository,
      mockProcessAuthorRepository,
      mockAuthorRepository
    );

    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation();
  });

  describe('createShortlist', () => {
    it('should create a shortlist successfully', async () => {
      const createRequest = {
        processId: mockProcessId,
        name: 'Test Shortlist',
        authorIds: [mockAuthorId]
      };

      // Mock repository calls
      mockProcessAuthorRepository.findByProcessAndAuthor.mockResolvedValue({
        id: 'process-author-123',
        processId: mockProcessId,
        authorId: mockAuthorId,
        role: AuthorRole.CANDIDATE,
        validationStatus: null,
        addedAt: new Date()
      });

      mockAuthorRepository.findByIdWithAffiliations.mockResolvedValue(mockAuthor);
      mockShortlistRepository.create.mockResolvedValue(mockShortlist);
      mockProcessAuthorRepository.updateAuthorRoles.mockResolvedValue();

      const result = await shortlistService.createShortlist(createRequest);

      expect(result).toEqual({
        id: mockShortlistId,
        processId: mockProcessId,
        name: 'Test Shortlist',
        authors: [mockAuthor],
        createdAt: mockShortlist.createdAt
      });

      expect(mockShortlistRepository.create).toHaveBeenCalledWith({
        processId: mockProcessId,
        name: 'Test Shortlist'
      });

      expect(mockProcessAuthorRepository.updateAuthorRoles).toHaveBeenCalledWith(
        mockProcessId,
        [mockAuthorId],
        AuthorRole.SHORTLISTED
      );
    });

    it('should throw error if author not found in process', async () => {
      const createRequest = {
        processId: mockProcessId,
        name: 'Test Shortlist',
        authorIds: [mockAuthorId]
      };

      mockProcessAuthorRepository.findByProcessAndAuthor.mockResolvedValue(null);

      await expect(shortlistService.createShortlist(createRequest))
        .rejects.toThrow(`Failed to create shortlist: Author ${mockAuthorId} not found in process ${mockProcessId}`);
    });

    it('should throw error if author not found', async () => {
      const createRequest = {
        processId: mockProcessId,
        name: 'Test Shortlist',
        authorIds: [mockAuthorId]
      };

      mockProcessAuthorRepository.findByProcessAndAuthor.mockResolvedValue({
        id: 'process-author-123',
        processId: mockProcessId,
        authorId: mockAuthorId,
        role: AuthorRole.CANDIDATE,
        validationStatus: null,
        addedAt: new Date()
      });

      mockAuthorRepository.findByIdWithAffiliations.mockResolvedValue(null);

      await expect(shortlistService.createShortlist(createRequest))
        .rejects.toThrow(`Failed to create shortlist: Author ${mockAuthorId} not found`);
    });
  });

  describe('getShortlistsByProcess', () => {
    it('should return shortlists with authors', async () => {
      mockShortlistRepository.findByProcessId.mockResolvedValue([mockShortlist]);
      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue([{
        id: 'process-author-123',
        processId: mockProcessId,
        authorId: mockAuthorId,
        role: AuthorRole.SHORTLISTED,
        validationStatus: null,
        addedAt: new Date()
      }]);
      mockAuthorRepository.findByIdWithAffiliations.mockResolvedValue(mockAuthor);

      const result = await shortlistService.getShortlistsByProcess(mockProcessId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockShortlistId,
        processId: mockProcessId,
        name: 'Test Shortlist',
        authors: [mockAuthor],
        createdAt: mockShortlist.createdAt
      });
    });
  });

  describe('getShortlistById', () => {
    it('should return shortlist with authors', async () => {
      mockShortlistRepository.findById.mockResolvedValue(mockShortlist);
      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue([{
        id: 'process-author-123',
        processId: mockProcessId,
        authorId: mockAuthorId,
        role: AuthorRole.SHORTLISTED,
        validationStatus: null,
        addedAt: new Date()
      }]);
      mockAuthorRepository.findByIdWithAffiliations.mockResolvedValue(mockAuthor);

      const result = await shortlistService.getShortlistById(mockShortlistId);

      expect(result).toEqual({
        id: mockShortlistId,
        processId: mockProcessId,
        name: 'Test Shortlist',
        authors: [mockAuthor],
        createdAt: mockShortlist.createdAt
      });
    });

    it('should return null if shortlist not found', async () => {
      mockShortlistRepository.findById.mockResolvedValue(null);

      const result = await shortlistService.getShortlistById(mockShortlistId);

      expect(result).toBeNull();
    });
  });

  describe('exportShortlist', () => {
    beforeEach(() => {
      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue([{
        id: 'process-author-123',
        processId: mockProcessId,
        authorId: mockAuthorId,
        role: AuthorRole.SHORTLISTED,
        validationStatus: null,
        addedAt: new Date()
      }]);
      mockAuthorRepository.findByIdWithAffiliations.mockResolvedValue(mockAuthor);
    });

    it('should export to CSV successfully', async () => {
      // Mock fs.writeFileSync to simulate successful file creation
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      const result = await shortlistService.exportShortlist(mockProcessId, 'csv');

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/shortlist-process-123-.*\.csv/);
    });

    it('should export to XLSX successfully', async () => {
      const XLSX = require('xlsx');
      XLSX.utils = {
        book_new: jest.fn().mockReturnValue({}),
        aoa_to_sheet: jest.fn().mockReturnValue({ '!cols': [] }),
        book_append_sheet: jest.fn()
      };
      XLSX.writeFile = jest.fn();

      const result = await shortlistService.exportShortlist(mockProcessId, 'xlsx');

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/shortlist-process-123-.*\.xlsx/);
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    it('should export to DOCX successfully', async () => {
      const result = await shortlistService.exportShortlist(mockProcessId, 'docx');

      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/shortlist-process-123-.*\.docx/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return error if no shortlisted authors found', async () => {
      mockProcessAuthorRepository.findByProcessAndRole.mockResolvedValue([]);

      const result = await shortlistService.exportShortlist(mockProcessId, 'csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No shortlisted authors found for export');
    });

    it('should return error for unsupported format', async () => {
      const result = await shortlistService.exportShortlist(mockProcessId, 'pdf' as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported export format: pdf');
    });

    it('should handle export errors gracefully', async () => {
      mockProcessAuthorRepository.findByProcessAndRole.mockRejectedValue(new Error('Database error'));

      const result = await shortlistService.exportShortlist(mockProcessId, 'csv');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed: Database error');
    });
  });
});