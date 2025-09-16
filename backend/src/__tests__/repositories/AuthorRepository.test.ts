import { PrismaClient } from '@prisma/client';
import { AuthorRepository, CreateAuthorInput, AuthorSearchOptions } from '../../repositories/AuthorRepository';

// Mock PrismaClient
const mockPrisma = {
  author: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('AuthorRepository', () => {
  let authorRepository: AuthorRepository;

  beforeEach(() => {
    authorRepository = new AuthorRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new author', async () => {
      const authorData: CreateAuthorInput = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        publicationCount: 25,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: ["cardiology", "clinical trials"],
        meshTerms: ["Heart Disease", "Clinical Trial"],
      };

      const expectedAuthor = {
        id: 'author-123',
        ...authorData,
        createdAt: new Date(),
      };

      (mockPrisma.author.create as jest.Mock).mockResolvedValue(expectedAuthor);

      const result = await authorRepository.create(authorData);

      expect(mockPrisma.author.create).toHaveBeenCalledWith({
        data: authorData,
      });
      expect(result).toEqual(expectedAuthor);
    });
  });

  describe('findById', () => {
    it('should find author by id', async () => {
      const authorId = 'author-123';
      const expectedAuthor = {
        id: authorId,
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        publicationCount: 25,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: '["cardiology"]',
        meshTerms: '["Heart Disease"]',
        createdAt: new Date(),
      };

      (mockPrisma.author.findUnique as jest.Mock).mockResolvedValue(expectedAuthor);

      const result = await authorRepository.findById(authorId);

      expect(mockPrisma.author.findUnique).toHaveBeenCalledWith({
        where: { id: authorId },
      });
      expect(result).toEqual(expectedAuthor);
    });

    it('should throw error for invalid id', async () => {
      await expect(authorRepository.findById('')).rejects.toThrow('Invalid ID provided');
    });
  });

  describe('findByEmail', () => {
    it('should find author by email', async () => {
      const email = 'john.smith@university.edu';
      const expectedAuthor = {
        id: 'author-123',
        name: 'Dr. John Smith',
        email,
        publicationCount: 25,
        clinicalTrials: 3,
        retractions: 0,
        researchAreas: '["cardiology"]',
        meshTerms: '["Heart Disease"]',
        createdAt: new Date(),
      };

      (mockPrisma.author.findFirst as jest.Mock).mockResolvedValue(expectedAuthor);

      const result = await authorRepository.findByEmail(email);

      expect(mockPrisma.author.findFirst).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(expectedAuthor);
    });

    it('should throw error for invalid email', async () => {
      await expect(authorRepository.findByEmail('')).rejects.toThrow('Invalid email provided');
    });
  });

  describe('findByName', () => {
    it('should find authors by name', async () => {
      const name = 'John Smith';
      const expectedAuthors = [
        {
          id: 'author-123',
          name: 'Dr. John Smith',
          email: 'john.smith@university.edu',
          publicationCount: 25,
          clinicalTrials: 3,
          retractions: 0,
          researchAreas: '["cardiology"]',
          meshTerms: '["Heart Disease"]',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.author.findMany as jest.Mock).mockResolvedValue(expectedAuthors);

      const result = await authorRepository.findByName(name);

      expect(mockPrisma.author.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: name,
          },
        },
      });
      expect(result).toEqual(expectedAuthors);
    });

    it('should throw error for invalid name', async () => {
      await expect(authorRepository.findByName('')).rejects.toThrow('Invalid name provided');
    });
  });

  describe('search', () => {
    it('should search authors with all options', async () => {
      const searchOptions: AuthorSearchOptions = {
        name: 'Smith',
        email: 'university.edu',
        minPublications: 10,
        maxRetractions: 1,
        researchArea: 'cardiology',
        skip: 0,
        take: 10,
      };

      const expectedAuthors = [
        {
          id: 'author-123',
          name: 'Dr. John Smith',
          email: 'john.smith@university.edu',
          publicationCount: 25,
          clinicalTrials: 3,
          retractions: 0,
          researchAreas: '["cardiology"]',
          meshTerms: '["Heart Disease"]',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.author.findMany as jest.Mock).mockResolvedValue(expectedAuthors);

      const result = await authorRepository.search(searchOptions);

      expect(mockPrisma.author.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Smith',
          },
          email: {
            contains: 'university.edu',
          },
          publicationCount: {
            gte: 10,
          },
          retractions: {
            lte: 1,
          },
          researchAreas: {
            contains: 'cardiology',
          },
        },
        skip: 0,
        take: 10,
        orderBy: { publicationCount: 'desc' },
      });
      expect(result).toEqual(expectedAuthors);
    });

    it('should search authors with minimal options', async () => {
      const searchOptions: AuthorSearchOptions = {
        name: 'Smith',
      };

      const expectedAuthors = [
        {
          id: 'author-123',
          name: 'Dr. John Smith',
          email: 'john.smith@university.edu',
          publicationCount: 25,
          clinicalTrials: 3,
          retractions: 0,
          researchAreas: '["cardiology"]',
          meshTerms: '["Heart Disease"]',
          createdAt: new Date(),
        },
      ];

      (mockPrisma.author.findMany as jest.Mock).mockResolvedValue(expectedAuthors);

      const result = await authorRepository.search(searchOptions);

      expect(mockPrisma.author.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'Smith',
          },
        },
        orderBy: { publicationCount: 'desc' },
      });
      expect(result).toEqual(expectedAuthors);
    });
  });

  describe('bulkCreate', () => {
    it('should bulk create authors', async () => {
      const authorsData: CreateAuthorInput[] = [
        {
          name: 'Dr. John Smith',
          email: 'john.smith@university.edu',
          publicationCount: 25,
        },
        {
          name: 'Dr. Jane Doe',
          email: 'jane.doe@university.edu',
          publicationCount: 30,
        },
      ];

      (mockPrisma.author.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await authorRepository.bulkCreate(authorsData);

      expect(mockPrisma.author.createMany).toHaveBeenCalledWith({
        data: authorsData,
      });
      expect(result).toBe(2);
    });
  });

  describe('findOrCreate', () => {
    it('should return existing author if found by email', async () => {
      const authorData: CreateAuthorInput = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        publicationCount: 25,
      };

      const existingAuthor = {
        id: 'author-123',
        ...authorData,
        createdAt: new Date(),
      };

      (mockPrisma.author.findFirst as jest.Mock).mockResolvedValue(existingAuthor);

      const result = await authorRepository.findOrCreate(authorData);

      expect(mockPrisma.author.findFirst).toHaveBeenCalledWith({
        where: { email: authorData.email },
      });
      expect(result).toEqual(existingAuthor);
      expect(mockPrisma.author.create).not.toHaveBeenCalled();
    });

    it('should create new author if not found', async () => {
      const authorData: CreateAuthorInput = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        publicationCount: 25,
      };

      const newAuthor = {
        id: 'author-123',
        ...authorData,
        createdAt: new Date(),
      };

      (mockPrisma.author.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.author.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.author.create as jest.Mock).mockResolvedValue(newAuthor);

      const result = await authorRepository.findOrCreate(authorData);

      expect(mockPrisma.author.create).toHaveBeenCalledWith({
        data: authorData,
      });
      expect(result).toEqual(newAuthor);
    });
  });

  describe('count', () => {
    it('should return author count', async () => {
      const expectedCount = 150;

      (mockPrisma.author.count as jest.Mock).mockResolvedValue(expectedCount);

      const result = await authorRepository.count();

      expect(mockPrisma.author.count).toHaveBeenCalled();
      expect(result).toBe(expectedCount);
    });
  });
});