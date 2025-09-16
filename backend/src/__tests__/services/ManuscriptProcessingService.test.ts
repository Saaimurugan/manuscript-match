import { ManuscriptProcessingService } from '../../services/ManuscriptProcessingService';

describe('ManuscriptProcessingService', () => {
  let service: ManuscriptProcessingService;

  beforeEach(() => {
    service = new ManuscriptProcessingService();
  });

  describe('validateFile', () => {
    it('should validate a valid PDF file', () => {
      const buffer = Buffer.from('PDF content');
      const result = service.validateFile(buffer, 'test.pdf', 'application/pdf');
      
      expect(result.isValid).toBe(true);
      expect(result.fileInfo).toEqual({
        size: buffer.length,
        mimeType: 'application/pdf',
        extension: '.pdf'
      });
    });

    it('should validate a valid DOCX file', () => {
      const buffer = Buffer.from('DOCX content');
      const result = service.validateFile(buffer, 'test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      expect(result.isValid).toBe(true);
      expect(result.fileInfo).toEqual({
        size: buffer.length,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: '.docx'
      });
    });

    it('should validate a valid DOC file', () => {
      const buffer = Buffer.from('DOC content');
      const result = service.validateFile(buffer, 'test.doc', 'application/msword');
      
      expect(result.isValid).toBe(true);
      expect(result.fileInfo).toEqual({
        size: buffer.length,
        mimeType: 'application/msword',
        extension: '.doc'
      });
    });

    it('should reject files that are too large', () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const result = service.validateFile(largeBuffer, 'large.pdf', 'application/pdf');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size exceeds maximum limit');
    });

    it('should reject unsupported mime types', () => {
      const buffer = Buffer.from('text content');
      const result = service.validateFile(buffer, 'test.txt', 'text/plain');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should reject invalid file extensions', () => {
      const buffer = Buffer.from('PDF content');
      const result = service.validateFile(buffer, 'test.txt', 'application/pdf');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject empty files', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = service.validateFile(emptyBuffer, 'test.pdf', 'application/pdf');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File is empty');
    });
  });

  describe('extractMetadata', () => {
    it('should handle file validation errors', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const result = await service.extractMetadata(largeBuffer, 'large.pdf', 'application/pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds maximum limit');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle unsupported file types', async () => {
      const buffer = Buffer.from('text content');
      const result = await service.extractMetadata(buffer, 'test.txt', 'text/plain');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should handle empty text extraction', async () => {
      // Mock the extractTextContent method to return empty string
      const mockExtractTextContent = jest.spyOn(service as any, 'extractTextContent');
      mockExtractTextContent.mockResolvedValue('');

      const buffer = Buffer.from('PDF content');
      const result = await service.extractMetadata(buffer, 'test.pdf', 'application/pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No text content could be extracted');
      
      mockExtractTextContent.mockRestore();
    });

    it('should successfully extract metadata from valid content', async () => {
      const mockContent = `
        Title: A Study on Machine Learning Applications
        
        Authors: John Doe, Jane Smith
        
        Affiliations:
        1. University of Technology, Computer Science Department, New York, USA
        2. Research Institute, AI Lab, California, USA
        
        Abstract: This paper presents a comprehensive study on machine learning applications in various domains. The research explores different algorithms and their effectiveness in solving real-world problems.
        
        Keywords: machine learning, artificial intelligence, algorithms, data science
        
        Introduction: Machine learning has become increasingly important...
      `;

      // Mock the extractTextContent method
      const mockExtractTextContent = jest.spyOn(service as any, 'extractTextContent');
      mockExtractTextContent.mockResolvedValue(mockContent);

      const buffer = Buffer.from('PDF content');
      const result = await service.extractMetadata(buffer, 'test.pdf', 'application/pdf');
      
      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.title).toContain('Machine Learning Applications');
      expect(result.metadata!.authors).toHaveLength(2);
      expect(result.metadata?.authors[0]?.name).toBe('John Doe');
      expect(result.metadata?.authors[1]?.name).toBe('Jane Smith');
      expect(result.metadata!.abstract).toContain('comprehensive study');
      expect(result.metadata!.keywords).toContain('machine learning');
      expect(result.processingTime).toBeGreaterThan(0);
      
      mockExtractTextContent.mockRestore();
    });

    it('should handle processing errors gracefully', async () => {
      // Mock the extractTextContent method to throw an error
      const mockExtractTextContent = jest.spyOn(service as any, 'extractTextContent');
      mockExtractTextContent.mockRejectedValue(new Error('Processing failed'));

      const buffer = Buffer.from('PDF content');
      const result = await service.extractMetadata(buffer, 'test.pdf', 'application/pdf');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
      
      mockExtractTextContent.mockRestore();
    });
  });

  describe('text extraction methods', () => {
    describe('extractPdfText', () => {
      it('should handle PDF parsing errors', async () => {
        const invalidPdfBuffer = Buffer.from('invalid pdf content');
        
        await expect(
          (service as any).extractPdfText(invalidPdfBuffer)
        ).rejects.toThrow('PDF parsing failed');
      });
    });

    describe('extractWordText', () => {
      it('should handle Word document parsing errors', async () => {
        const invalidDocBuffer = Buffer.from('invalid doc content');
        
        await expect(
          (service as any).extractWordText(invalidDocBuffer)
        ).rejects.toThrow('Word document parsing failed');
      });
    });
  });

  describe('content parsing methods', () => {
    describe('extractTitle', () => {
      it('should extract title from title: pattern', () => {
        const text = 'Title: Machine Learning in Healthcare\n\nAbstract: This is the abstract...';
        const title = (service as any).extractTitle(text);
        
        expect(title).toBe('Machine Learning in Healthcare');
      });

      it('should extract title from first substantial line', () => {
        const text = 'Machine Learning Applications in Modern Healthcare Systems\n\nAbstract: This is the abstract...';
        const title = (service as any).extractTitle(text);
        
        expect(title).toBe('Machine Learning Applications in Modern Healthcare Systems');
      });

      it('should return null for very short lines', () => {
        const text = 'ML\n\nAbstract: This is the abstract...';
        const title = (service as any).extractTitle(text);
        
        expect(title).toBeNull();
      });

      it('should return null for very long lines', () => {
        const longTitle = 'A'.repeat(250);
        const text = `${longTitle}\n\nAbstract: This is the abstract...`;
        const title = (service as any).extractTitle(text);
        
        expect(title).toBeNull();
      });
    });

    describe('extractAbstract', () => {
      it('should extract abstract with Abstract: pattern', () => {
        const text = 'Title: Test\n\nAbstract: This is a comprehensive study on machine learning applications in healthcare. The research explores various algorithms and their effectiveness.\n\nKeywords: machine learning';
        const abstract = (service as any).extractAbstract(text);
        
        expect(abstract).toContain('comprehensive study on machine learning');
      });

      it('should extract abstract with Abstract pattern (no colon)', () => {
        const text = 'Title: Test\n\nAbstract\nThis is a comprehensive study on machine learning applications in healthcare.\n\nKeywords: machine learning';
        const abstract = (service as any).extractAbstract(text);
        
        expect(abstract).toContain('comprehensive study on machine learning');
      });

      it('should return null for short abstracts', () => {
        const text = 'Title: Test\n\nAbstract: Short\n\nKeywords: machine learning';
        const abstract = (service as any).extractAbstract(text);
        
        expect(abstract).toBeNull();
      });

      it('should return null when no abstract found', () => {
        const text = 'Title: Test\n\nIntroduction: This is the introduction...';
        const abstract = (service as any).extractAbstract(text);
        
        expect(abstract).toBeNull();
      });
    });

    describe('extractKeywords', () => {
      it('should extract keywords with Keywords: pattern', () => {
        const text = 'Abstract: Test abstract\n\nKeywords: machine learning, artificial intelligence, data science\n\nIntroduction: Test';
        const keywords = (service as any).extractKeywords(text);
        
        expect(keywords).toEqual(['machine learning', 'artificial intelligence', 'data science']);
      });

      it('should extract keywords with Key words: pattern', () => {
        const text = 'Abstract: Test abstract\n\nKey words: machine learning; artificial intelligence; data science\n\nIntroduction: Test';
        const keywords = (service as any).extractKeywords(text);
        
        expect(keywords).toEqual(['machine learning', 'artificial intelligence', 'data science']);
      });

      it('should limit keywords to 20', () => {
        const manyKeywords = Array.from({ length: 25 }, (_, i) => `keyword${i + 1}`).join(', ');
        const text = `Abstract: Test abstract\n\nKeywords: ${manyKeywords}\n\nIntroduction: Test`;
        const keywords = (service as any).extractKeywords(text);
        
        expect(keywords).toHaveLength(20);
      });

      it('should filter out very long keywords', () => {
        const longKeyword = 'a'.repeat(60);
        const text = `Abstract: Test abstract\n\nKeywords: machine learning, ${longKeyword}, data science\n\nIntroduction: Test`;
        const keywords = (service as any).extractKeywords(text);
        
        expect(keywords).toEqual(['machine learning', 'data science']);
      });

      it('should fall back to implicit keywords when no explicit keywords found', () => {
        const text = 'Machine learning applications in healthcare data science research artificial intelligence algorithms';
        const keywords = (service as any).extractKeywords(text);
        
        expect(keywords.length).toBeGreaterThan(0);
        expect(keywords).toContain('machine');
        expect(keywords).toContain('learning');
      });
    });

    describe('extractAuthorsAndAffiliations', () => {
      it('should extract authors from Authors: pattern', () => {
        const text = 'Title: Test\n\nAuthors: John Doe, Jane Smith, Bob Johnson\n\nAbstract: Test abstract';
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.authors).toHaveLength(3);
        expect(result.authors[0].name).toBe('John Doe');
        expect(result.authors[1].name).toBe('Jane Smith');
        expect(result.authors[2].name).toBe('Bob Johnson');
      });

      it('should extract authors from by: pattern', () => {
        const text = 'Title: Test\n\nby: John Doe, Jane Smith\n\nAbstract: Test abstract';
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.authors).toHaveLength(2);
        expect(result.authors[0].name).toBe('John Doe');
        expect(result.authors[1].name).toBe('Jane Smith');
      });

      it('should extract affiliations from Affiliations: pattern', () => {
        const text = `Title: Test
        
        Authors: John Doe, Jane Smith
        
        Affiliations:
        1. University of Technology, Computer Science Department, New York, USA
        2. Research Institute, AI Lab, California, USA
        
        Abstract: Test abstract`;
        
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.affiliations).toHaveLength(2);
        expect(result.affiliations[0].institutionName).toContain('University of Technology');
        expect(result.affiliations[1].institutionName).toContain('Research Institute');
      });

      it('should create placeholder author when no authors found', () => {
        const text = 'Title: Test\n\nAbstract: Test abstract';
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.authors).toHaveLength(1);
        expect(result.authors[0].name).toBe('Unknown Author');
      });

      it('should limit authors to 20', () => {
        const manyAuthors = Array.from({ length: 25 }, (_, i) => `Author ${i + 1}`).join(', ');
        const text = `Title: Test\n\nAuthors: ${manyAuthors}\n\nAbstract: Test abstract`;
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.authors).toHaveLength(20);
      });

      it('should limit affiliations to 10', () => {
        const manyAffiliations = Array.from({ length: 15 }, (_, i) => `${i + 1}. Institution ${i + 1}, Department, City, Country`).join('\n');
        const text = `Title: Test
        
        Authors: John Doe
        
        Affiliations:
        ${manyAffiliations}
        
        Abstract: Test abstract`;
        
        const result = (service as any).extractAuthorsAndAffiliations(text);
        
        expect(result.affiliations).toHaveLength(10);
      });
    });

    describe('generateFocusAreas', () => {
      it('should generate focus areas from keywords and content', () => {
        const text = 'Machine learning applications in healthcare artificial intelligence data science algorithms';
        const keywords = ['machine learning', 'healthcare', 'AI'];
        const result = (service as any).generateFocusAreas(text, keywords);
        
        expect(result.primary).toHaveLength(5);
        expect(result.secondary).toHaveLength(5);
        expect(result.primary).toContain('machine learning');
        expect(result.primary).toContain('healthcare');
      });

      it('should limit focus areas to specified lengths', () => {
        const text = 'test content';
        const keywords = Array.from({ length: 20 }, (_, i) => `keyword${i + 1}`);
        const result = (service as any).generateFocusAreas(text, keywords);
        
        expect(result.primary).toHaveLength(5);
        expect(result.secondary).toHaveLength(5);
      });
    });
  });

  describe('utility methods', () => {
    describe('cleanText', () => {
      it('should normalize line endings and whitespace', () => {
        const messyText = 'Line 1\r\nLine 2\r\n\n\nLine 3    with   spaces\n\n\n\nLine 4';
        const cleaned = (service as any).cleanText(messyText);
        
        expect(cleaned).not.toContain('\r');
        expect(cleaned).not.toMatch(/\n{3,}/);
        expect(cleaned).not.toMatch(/\s{2,}/);
        expect(cleaned.trim()).toBe(cleaned);
      });
    });

    describe('parseAuthorNames', () => {
      it('should parse comma-separated author names', () => {
        const authorsText = 'John Doe, Jane Smith, Bob Johnson';
        const names = (service as any).parseAuthorNames(authorsText);
        
        expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
      });

      it('should parse semicolon-separated author names', () => {
        const authorsText = 'John Doe; Jane Smith; Bob Johnson';
        const names = (service as any).parseAuthorNames(authorsText);
        
        expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
      });

      it('should remove numbering from author names', () => {
        const authorsText = '1. John Doe, 2. Jane Smith, 3. Bob Johnson';
        const names = (service as any).parseAuthorNames(authorsText);
        
        expect(names).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson']);
      });

      it('should filter out very short names', () => {
        const authorsText = 'John Doe, J, Jane Smith';
        const names = (service as any).parseAuthorNames(authorsText);
        
        expect(names).toEqual(['John Doe', 'Jane Smith']);
      });

      it('should limit to 20 authors', () => {
        const manyAuthors = Array.from({ length: 25 }, (_, i) => `Author ${i + 1}`).join(', ');
        const names = (service as any).parseAuthorNames(manyAuthors);
        
        expect(names).toHaveLength(20);
      });
    });

    describe('parseAffiliations', () => {
      it('should parse multi-line affiliations', () => {
        const affiliationsText = `University of Technology, Computer Science Department, New York, USA
Research Institute, AI Lab, California, USA
Medical Center, Radiology Department, Texas, USA`;
        
        const affiliations = (service as any).parseAffiliations(affiliationsText);
        
        expect(affiliations).toHaveLength(3);
        expect(affiliations[0].institutionName).toContain('University of Technology');
        expect(affiliations[1].institutionName).toContain('Research Institute');
        expect(affiliations[2].institutionName).toContain('Medical Center');
      });

      it('should filter out very short affiliations', () => {
        const affiliationsText = `University of Technology, Computer Science Department, New York, USA
Short
Medical Center, Radiology Department, Texas, USA`;
        
        const affiliations = (service as any).parseAffiliations(affiliationsText);
        
        expect(affiliations).toHaveLength(2);
        expect(affiliations[0].institutionName).toContain('University of Technology');
        expect(affiliations[1].institutionName).toContain('Medical Center');
      });

      it('should limit to 10 affiliations', () => {
        const manyAffiliations = Array.from({ length: 15 }, (_, i) => 
          `Institution ${i + 1}, Department ${i + 1}, City ${i + 1}, Country ${i + 1}`
        ).join('\n');
        
        const affiliations = (service as any).parseAffiliations(manyAffiliations);
        
        expect(affiliations).toHaveLength(10);
      });
    });

    describe('extractImplicitKeywords', () => {
      it('should extract frequent words as keywords', () => {
        const text = 'machine learning machine learning data science data science artificial intelligence algorithms';
        const keywords = (service as any).extractImplicitKeywords(text);
        
        expect(keywords).toContain('machine');
        expect(keywords).toContain('learning');
        expect(keywords).toContain('data');
        expect(keywords).toContain('science');
      });

      it('should filter out stop words', () => {
        const text = 'the machine learning and data science are important for the future';
        const keywords = (service as any).extractImplicitKeywords(text);
        
        expect(keywords).not.toContain('the');
        expect(keywords).not.toContain('and');
        expect(keywords).not.toContain('are');
        expect(keywords).not.toContain('for');
      });

      it('should require minimum word frequency', () => {
        const text = 'machine learning data science artificial intelligence algorithms';
        const keywords = (service as any).extractImplicitKeywords(text);
        
        // Single occurrence words should not be included
        expect(keywords).toHaveLength(0);
      });

      it('should limit to 10 keywords', () => {
        const repeatedWords = Array.from({ length: 15 }, (_, i) => 
          `keyword${i + 1} keyword${i + 1} keyword${i + 1}`
        ).join(' ');
        
        const keywords = (service as any).extractImplicitKeywords(repeatedWords);
        
        expect(keywords).toHaveLength(10);
      });
    });
  });
});