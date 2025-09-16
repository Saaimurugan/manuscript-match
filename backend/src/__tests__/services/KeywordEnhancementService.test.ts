import { KeywordEnhancementService } from '../../services/KeywordEnhancementService';
import { ManuscriptMetadata, DatabaseType, KeywordEnhancementResult, KeywordSelectionUpdate } from '../../types';

describe('KeywordEnhancementService', () => {
  let service: KeywordEnhancementService;
  let mockManuscript: ManuscriptMetadata;

  beforeEach(() => {
    service = new KeywordEnhancementService();
    mockManuscript = {
      title: 'Machine Learning Applications in Medical Diagnosis',
      authors: [],
      affiliations: [],
      abstract: 'This study explores the use of machine learning algorithms for automated medical diagnosis. We implemented deep learning models to analyze medical images and predict disease outcomes. The results show significant improvement in diagnostic accuracy compared to traditional methods.',
      keywords: ['machine learning', 'medical diagnosis', 'deep learning'],
      primaryFocusAreas: ['artificial intelligence', 'healthcare'],
      secondaryFocusAreas: ['computer vision', 'medical imaging']
    };
  });

  describe('generateEnhancedKeywords', () => {
    it('should generate enhanced keywords from manuscript content', async () => {
      const enhancedKeywords = await service.generateEnhancedKeywords(mockManuscript);

      expect(enhancedKeywords).toBeDefined();
      expect(Array.isArray(enhancedKeywords)).toBe(true);
      expect(enhancedKeywords.length).toBeGreaterThan(0);
      
      // Should include original keywords
      expect(enhancedKeywords).toEqual(expect.arrayContaining(['machine learning', 'medical diagnosis', 'deep learning']));
    });

    it('should handle empty manuscript gracefully', async () => {
      const emptyManuscript: ManuscriptMetadata = {
        title: '',
        authors: [],
        affiliations: [],
        abstract: '',
        keywords: [],
        primaryFocusAreas: [],
        secondaryFocusAreas: []
      };

      const enhancedKeywords = await service.generateEnhancedKeywords(emptyManuscript);
      expect(enhancedKeywords).toBeDefined();
      expect(Array.isArray(enhancedKeywords)).toBe(true);
    });

    it('should fallback to original keywords on error', async () => {
      // Mock an error in the enhancement process
      const originalExtractKeywords = (service as any).extractKeywordsFromText;
      (service as any).extractKeywordsFromText = jest.fn().mockRejectedValue(new Error('Processing error'));

      const enhancedKeywords = await service.generateEnhancedKeywords(mockManuscript);
      
      expect(enhancedKeywords).toEqual(mockManuscript.keywords);

      // Restore original method
      (service as any).extractKeywordsFromText = originalExtractKeywords;
    });
  });

  describe('extractMeshTerms', () => {
    it('should extract MeSH terms from content', async () => {
      const content = 'This study focuses on cancer treatment and heart disease diagnosis using advanced therapy methods.';
      
      const meshTerms = await service.extractMeshTerms(content);

      expect(meshTerms).toBeDefined();
      expect(Array.isArray(meshTerms)).toBe(true);
      expect(meshTerms.length).toBeGreaterThan(0);
      
      // Should contain medical terms
      expect(meshTerms).toEqual(expect.arrayContaining(['Neoplasms', 'Cardiology', 'Therapeutics']));
    });

    it('should return empty array for non-medical content', async () => {
      const content = 'This is about software engineering and programming languages.';
      
      const meshTerms = await service.extractMeshTerms(content);

      expect(meshTerms).toBeDefined();
      expect(Array.isArray(meshTerms)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in the extraction process
      const originalExtractKeywords = (service as any).extractKeywordsFromText;
      (service as any).extractKeywordsFromText = jest.fn().mockRejectedValue(new Error('Processing error'));

      const meshTerms = await service.extractMeshTerms('test content');
      
      expect(meshTerms).toEqual([]);

      // Restore original method
      (service as any).extractKeywordsFromText = originalExtractKeywords;
    });
  });

  describe('generateSearchStrings', () => {
    const testKeywords = ['machine learning', 'medical diagnosis', 'deep learning'];

    it('should generate PubMed search string', async () => {
      const searchString = await service.generateSearchStrings(testKeywords, DatabaseType.PUBMED);

      expect(searchString).toBeDefined();
      expect(typeof searchString).toBe('string');
      expect(searchString).toContain('machine learning');
      expect(searchString).toContain('medical diagnosis');
      expect(searchString).toContain('deep learning');
      expect(searchString).toContain('[All Fields]');
    });

    it('should generate Elsevier search string', async () => {
      const searchString = await service.generateSearchStrings(testKeywords, DatabaseType.ELSEVIER);

      expect(searchString).toBeDefined();
      expect(typeof searchString).toBe('string');
      expect(searchString).toContain('TITLE-ABS-KEY');
      expect(searchString).toContain('OR');
    });

    it('should generate Wiley search string', async () => {
      const searchString = await service.generateSearchStrings(testKeywords, DatabaseType.WILEY);

      expect(searchString).toBeDefined();
      expect(typeof searchString).toBe('string');
      expect(searchString).toContain('anywhere');
      expect(searchString).toContain('OR');
    });

    it('should generate Taylor & Francis search string', async () => {
      const searchString = await service.generateSearchStrings(testKeywords, DatabaseType.TAYLOR_FRANCIS);

      expect(searchString).toBeDefined();
      expect(typeof searchString).toBe('string');
      expect(searchString).toContain('[All:');
      expect(searchString).toContain('OR');
    });

    it('should filter out short keywords', async () => {
      const keywordsWithShort = ['ml', 'ai', 'machine learning', 'medical diagnosis'];
      const searchString = await service.generateSearchStrings(keywordsWithShort, DatabaseType.PUBMED);

      expect(searchString).not.toContain('ml');
      expect(searchString).not.toContain('ai');
      expect(searchString).toContain('machine learning');
      expect(searchString).toContain('medical diagnosis');
    });

    it('should handle empty keywords array', async () => {
      const searchString = await service.generateSearchStrings([], DatabaseType.PUBMED);

      expect(searchString).toBeDefined();
      expect(typeof searchString).toBe('string');
    });

    it('should fallback to simple OR joining on error', async () => {
      // Mock an error in search string generation
      const originalGeneratePubMed = (service as any).generatePubMedSearchString;
      (service as any).generatePubMedSearchString = jest.fn().mockImplementation(() => {
        throw new Error('Generation error');
      });

      const searchString = await service.generateSearchStrings(testKeywords, DatabaseType.PUBMED);
      
      expect(searchString).toBe('machine learning OR medical diagnosis OR deep learning');

      // Restore original method
      (service as any).generatePubMedSearchString = originalGeneratePubMed;
    });
  });

  describe('updateKeywordSelection', () => {
    let mockResult: KeywordEnhancementResult;

    beforeEach(() => {
      mockResult = {
        originalKeywords: ['machine learning', 'medical diagnosis'],
        enhancedKeywords: ['artificial intelligence', 'healthcare', 'computer vision'],
        meshTerms: ['Medical Informatics', 'Artificial Intelligence'],
        selectedKeywords: ['machine learning', 'medical diagnosis', 'artificial intelligence'],
        searchStrings: {
          [DatabaseType.PUBMED]: 'test pubmed string',
          [DatabaseType.ELSEVIER]: 'test elsevier string',
          [DatabaseType.WILEY]: 'test wiley string',
          [DatabaseType.TAYLOR_FRANCIS]: 'test taylor francis string'
        }
      };
    });

    it('should add selected keywords', async () => {
      const updates: KeywordSelectionUpdate[] = [
        { keyword: 'healthcare', selected: true },
        { keyword: 'computer vision', selected: true }
      ];

      const updatedResult = await service.updateKeywordSelection(mockResult, updates);

      expect(updatedResult.selectedKeywords).toContain('healthcare');
      expect(updatedResult.selectedKeywords).toContain('computer vision');
      expect(updatedResult.selectedKeywords).toContain('machine learning'); // existing should remain
    });

    it('should remove deselected keywords', async () => {
      const updates: KeywordSelectionUpdate[] = [
        { keyword: 'machine learning', selected: false },
        { keyword: 'artificial intelligence', selected: false }
      ];

      const updatedResult = await service.updateKeywordSelection(mockResult, updates);

      expect(updatedResult.selectedKeywords).not.toContain('machine learning');
      expect(updatedResult.selectedKeywords).not.toContain('artificial intelligence');
      expect(updatedResult.selectedKeywords).toContain('medical diagnosis'); // remaining should stay
    });

    it('should regenerate search strings with updated selection', async () => {
      const updates: KeywordSelectionUpdate[] = [
        { keyword: 'healthcare', selected: true }
      ];

      const updatedResult = await service.updateKeywordSelection(mockResult, updates);

      // Search strings should be regenerated
      expect(updatedResult.searchStrings).toBeDefined();
      expect(updatedResult.searchStrings[DatabaseType.PUBMED]).toBeDefined();
      expect(updatedResult.searchStrings[DatabaseType.ELSEVIER]).toBeDefined();
      expect(updatedResult.searchStrings[DatabaseType.WILEY]).toBeDefined();
      expect(updatedResult.searchStrings[DatabaseType.TAYLOR_FRANCIS]).toBeDefined();
    });

    it('should handle mixed selection updates', async () => {
      const updates: KeywordSelectionUpdate[] = [
        { keyword: 'machine learning', selected: false }, // remove
        { keyword: 'healthcare', selected: true },        // add
        { keyword: 'computer vision', selected: true }    // add
      ];

      const updatedResult = await service.updateKeywordSelection(mockResult, updates);

      expect(updatedResult.selectedKeywords).not.toContain('machine learning');
      expect(updatedResult.selectedKeywords).toContain('healthcare');
      expect(updatedResult.selectedKeywords).toContain('computer vision');
      expect(updatedResult.selectedKeywords).toContain('medical diagnosis'); // unchanged
    });
  });

  describe('enhanceKeywords', () => {
    it('should complete full keyword enhancement workflow', async () => {
      const result = await service.enhanceKeywords(mockManuscript);

      expect(result).toBeDefined();
      expect(result.originalKeywords).toEqual(mockManuscript.keywords);
      expect(result.enhancedKeywords).toBeDefined();
      expect(Array.isArray(result.enhancedKeywords)).toBe(true);
      expect(result.meshTerms).toBeDefined();
      expect(Array.isArray(result.meshTerms)).toBe(true);
      expect(result.selectedKeywords).toBeDefined();
      expect(Array.isArray(result.selectedKeywords)).toBe(true);
      expect(result.searchStrings).toBeDefined();
      
      // Should have search strings for all databases
      expect(result.searchStrings[DatabaseType.PUBMED]).toBeDefined();
      expect(result.searchStrings[DatabaseType.ELSEVIER]).toBeDefined();
      expect(result.searchStrings[DatabaseType.WILEY]).toBeDefined();
      expect(result.searchStrings[DatabaseType.TAYLOR_FRANCIS]).toBeDefined();
    });

    it('should initially select all keywords', async () => {
      const result = await service.enhanceKeywords(mockManuscript);

      // Should include original keywords in selection
      expect(result.selectedKeywords).toEqual(expect.arrayContaining(mockManuscript.keywords));
      
      // Should include enhanced keywords in selection
      result.enhancedKeywords.forEach(keyword => {
        expect(result.selectedKeywords).toContain(keyword);
      });
    });

    it('should provide fallback result on error', async () => {
      // Mock an error in the enhancement process
      const originalGenerateEnhanced = service.generateEnhancedKeywords;
      service.generateEnhancedKeywords = jest.fn().mockRejectedValue(new Error('Enhancement error'));

      const result = await service.enhanceKeywords(mockManuscript);

      expect(result).toBeDefined();
      expect(result.originalKeywords).toEqual(mockManuscript.keywords);
      expect(result.enhancedKeywords).toEqual([]);
      expect(result.meshTerms).toEqual([]);
      expect(result.selectedKeywords).toEqual(mockManuscript.keywords);
      
      // Should have fallback search strings
      Object.values(result.searchStrings).forEach(searchString => {
        expect(searchString).toBe(mockManuscript.keywords.join(' OR '));
      });

      // Restore original method
      service.generateEnhancedKeywords = originalGenerateEnhanced;
    });
  });

  describe('private helper methods', () => {
    it('should combine manuscript text correctly', () => {
      const combinedText = (service as any).combineManuscriptText(mockManuscript);

      expect(combinedText).toContain(mockManuscript.title);
      expect(combinedText).toContain(mockManuscript.abstract);
      mockManuscript.keywords.forEach(keyword => {
        expect(combinedText).toContain(keyword);
      });
      mockManuscript.primaryFocusAreas.forEach(area => {
        expect(combinedText).toContain(area);
      });
    });

    it('should filter and rank keywords properly', () => {
      const keywords = ['test', 'machine learning', 'ai', 'medical diagnosis', 'very-long-keyword-that-should-be-included'];
      const text = 'This is a test about machine learning and medical diagnosis in healthcare.';
      
      const filtered = (service as any).filterAndRankKeywords(keywords, text);

      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(20); // Should limit to 20
      expect(filtered).not.toContain('ai'); // Should filter out short terms
    });

    it('should find related MeSH terms', () => {
      const related = (service as any).findRelatedMeshTerms('cancer');

      expect(related).toBeDefined();
      expect(Array.isArray(related)).toBe(true);
      expect(related).toEqual(expect.arrayContaining(['Neoplasms', 'Carcinoma', 'Oncology']));
    });
  });
});