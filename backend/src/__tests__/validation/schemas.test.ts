import {
  createShortlistSchema,
  updateShortlistSchema,
  createActivityLogSchema,
  activityLogSearchSchema,
  manuscriptMetadataSchema,
  searchTermsSchema,
  fileUploadSchema,
  databaseSearchResultSchema,
  validationResultSchema,
} from '../../validation/schemas';
import { DatabaseType } from '../../types';

describe('Validation Schemas', () => {
  describe('Shortlist Schemas', () => {
    describe('createShortlistSchema', () => {
      it('should validate valid shortlist data', () => {
        const validData = {
          processId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Top Reviewers',
        };

        const { error } = createShortlistSchema.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid shortlist data', () => {
        const invalidData = {
          processId: 'invalid-uuid',
          name: '',
        };

        const { error } = createShortlistSchema.validate(invalidData);
        expect(error).toBeDefined();
      });
    });

    describe('updateShortlistSchema', () => {
      it('should validate valid update data', () => {
        const validData = {
          name: 'Updated Shortlist Name',
        };

        const { error } = updateShortlistSchema.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject empty update data', () => {
        const invalidData = {};

        const { error } = updateShortlistSchema.validate(invalidData);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Activity Log Schemas', () => {
    describe('createActivityLogSchema', () => {
      it('should validate valid activity log data', () => {
        const validData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          processId: '123e4567-e89b-12d3-a456-426614174001',
          action: 'PROCESS_CREATED',
          details: 'User created a new process',
        };

        const { error } = createActivityLogSchema.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should validate minimal activity log data', () => {
        const validData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'LOGIN',
        };

        const { error } = createActivityLogSchema.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should reject invalid activity log data', () => {
        const invalidData = {
          userId: 'invalid-uuid',
          action: '',
        };

        const { error } = createActivityLogSchema.validate(invalidData);
        expect(error).toBeDefined();
      });
    });

    describe('activityLogSearchSchema', () => {
      it('should validate valid search data', () => {
        const validData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          action: 'PROCESS',
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
          page: 1,
          limit: 20,
        };

        const { error } = activityLogSearchSchema.validate(validData);
        expect(error).toBeUndefined();
      });

      it('should apply defaults for pagination', () => {
        const validData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
        };

        const { error, value } = activityLogSearchSchema.validate(validData);
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(20);
      });
    });
  });

  describe('Manuscript Metadata Schema', () => {
    it('should validate valid manuscript metadata', () => {
      const validData = {
        title: 'A Study on Machine Learning Applications',
        authors: [
          {
            name: 'Dr. John Smith',
            email: 'john.smith@university.edu',
            publicationCount: 25,
          },
        ],
        affiliations: [
          {
            institutionName: 'University of Technology',
            address: '123 University Ave',
            country: 'United States',
          },
        ],
        abstract: 'This study explores the applications of machine learning in healthcare.',
        keywords: ['machine learning', 'healthcare', 'AI'],
        primaryFocusAreas: ['artificial intelligence', 'medical technology'],
        secondaryFocusAreas: ['data science'],
      };

      const { error } = manuscriptMetadataSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid manuscript metadata', () => {
      const invalidData = {
        title: '',
        authors: [],
        affiliations: [],
        abstract: '',
        keywords: [],
        primaryFocusAreas: [],
      };

      const { error } = manuscriptMetadataSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Search Terms Schema', () => {
    it('should validate valid search terms', () => {
      const validData = {
        keywords: ['machine learning', 'healthcare'],
        meshTerms: ['Artificial Intelligence', 'Medical Informatics'],
        booleanQueries: {
          [DatabaseType.PUBMED]: '("machine learning" AND healthcare)',
          [DatabaseType.ELSEVIER]: 'machine learning AND healthcare',
        },
      };

      const { error } = searchTermsSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate minimal search terms', () => {
      const validData = {
        keywords: ['machine learning'],
      };

      const { error } = searchTermsSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject empty keywords', () => {
      const invalidData = {
        keywords: [],
      };

      const { error } = searchTermsSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('File Upload Schema', () => {
    it('should validate valid PDF file', () => {
      const validData = {
        filename: 'manuscript.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
      };

      const { error } = fileUploadSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate valid Word file', () => {
      const validData = {
        filename: 'manuscript.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2 * 1024 * 1024, // 2MB
      };

      const { error } = fileUploadSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject file too large', () => {
      const invalidData = {
        filename: 'manuscript.pdf',
        mimetype: 'application/pdf',
        size: 100 * 1024 * 1024, // 100MB
      };

      const { error } = fileUploadSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid mimetype', () => {
      const invalidData = {
        filename: 'manuscript.txt',
        mimetype: 'text/plain',
        size: 1024,
      };

      const { error } = fileUploadSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Database Search Result Schema', () => {
    it('should validate valid search result', () => {
      const validData = {
        database: DatabaseType.PUBMED,
        authors: [
          {
            name: 'Dr. John Smith',
            email: 'john.smith@university.edu',
            publicationCount: 25,
          },
        ],
        totalFound: 150,
        searchTime: 2.5,
      };

      const { error } = databaseSearchResultSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid database type', () => {
      const invalidData = {
        database: 'invalid-database',
        authors: [],
        totalFound: 0,
        searchTime: 1.0,
      };

      const { error } = databaseSearchResultSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Validation Result Schema', () => {
    it('should validate valid validation result', () => {
      const validData = {
        passed: true,
        conflicts: [],
        retractionFlags: [
          {
            publicationTitle: 'Retracted Study',
            journal: 'Journal of Medicine',
            retractionDate: new Date('2023-01-01'),
            reason: 'Data fabrication',
          },
        ],
        publicationMetrics: {
          totalPublications: 50,
          recentPublications: 10,
          hIndex: 15,
          citationCount: 1200,
        },
      };

      const { error } = validationResultSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate minimal validation result', () => {
      const validData = {
        passed: false,
        conflicts: ['manuscript_author'],
        retractionFlags: [],
        publicationMetrics: {
          totalPublications: 25,
          recentPublications: 5,
        },
      };

      const { error } = validationResultSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });
});