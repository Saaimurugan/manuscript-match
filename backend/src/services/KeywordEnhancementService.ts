import { ManuscriptMetadata, DatabaseType, KeywordEnhancementResult, KeywordSelectionUpdate } from '../types';
import * as natural from 'natural';
import compromise from 'compromise';
import { removeStopwords } from 'stopword';

export class KeywordEnhancementService {
  private readonly tfidf = new natural.TfIdf();
  
  // Common medical/academic terms that should be preserved
  private readonly preservedTerms = new Set([
    'covid', 'sars', 'mrna', 'dna', 'rna', 'pcr', 'elisa', 'mri', 'ct', 'pet',
    'hiv', 'aids', 'cancer', 'tumor', 'therapy', 'treatment', 'diagnosis',
    'clinical', 'trial', 'study', 'research', 'analysis', 'method', 'protocol'
  ]);

  // MeSH-like medical terms (simplified subset for demonstration)
  private readonly meshTerms = new Map([
    ['cancer', ['Neoplasms', 'Carcinoma', 'Oncology']],
    ['heart', ['Cardiology', 'Cardiovascular System', 'Heart Diseases']],
    ['brain', ['Neurology', 'Central Nervous System', 'Brain Diseases']],
    ['diabetes', ['Diabetes Mellitus', 'Endocrinology', 'Glucose Metabolism']],
    ['infection', ['Infectious Diseases', 'Microbiology', 'Pathogenic Microorganisms']],
    ['therapy', ['Therapeutics', 'Treatment', 'Medical Interventions']],
    ['diagnosis', ['Diagnostic Techniques', 'Medical Diagnosis', 'Clinical Assessment']],
    ['surgery', ['Surgical Procedures', 'Operative Procedures', 'Surgery']],
    ['drug', ['Pharmaceutical Preparations', 'Pharmacology', 'Drug Therapy']],
    ['gene', ['Genetics', 'Gene Expression', 'Molecular Biology']]
  ]);

  /**
   * Generate enhanced keywords from manuscript content
   */
  async generateEnhancedKeywords(manuscript: ManuscriptMetadata): Promise<string[]> {
    try {
      const combinedText = this.combineManuscriptText(manuscript);
      const extractedKeywords = await this.extractKeywordsFromText(combinedText);
      const enhancedKeywords = this.enhanceWithSynonyms(extractedKeywords);
      
      // Combine original and enhanced keywords, removing duplicates
      const allKeywords = [...new Set([
        ...manuscript.keywords,
        ...extractedKeywords,
        ...enhancedKeywords
      ])];

      return this.filterAndRankKeywords(allKeywords, combinedText);
    } catch (error) {
      console.error('Error generating enhanced keywords:', error);
      // Fallback to original keywords
      return manuscript.keywords;
    }
  }

  /**
   * Extract MeSH terms from manuscript content
   */
  async extractMeshTerms(content: string): Promise<string[]> {
    try {
      const keywords = await this.extractKeywordsFromText(content);
      const meshTerms: string[] = [];

      for (const keyword of keywords) {
        const relatedMesh = this.findRelatedMeshTerms(keyword.toLowerCase());
        meshTerms.push(...relatedMesh);
      }

      // Remove duplicates and return top terms
      return [...new Set(meshTerms)].slice(0, 20);
    } catch (error) {
      console.error('Error extracting MeSH terms:', error);
      return [];
    }
  }

  /**
   * Generate database-specific search strings
   */
  async generateSearchStrings(keywords: string[], database: DatabaseType): Promise<string> {
    try {
      const filteredKeywords = keywords.filter(k => k.trim().length > 2);
      
      switch (database) {
        case DatabaseType.PUBMED:
          return this.generatePubMedSearchString(filteredKeywords);
        case DatabaseType.ELSEVIER:
          return this.generateElsevierSearchString(filteredKeywords);
        case DatabaseType.WILEY:
          return this.generateWileySearchString(filteredKeywords);
        case DatabaseType.TAYLOR_FRANCIS:
          return this.generateTaylorFrancisSearchString(filteredKeywords);
        default:
          return this.generateGenericSearchString(filteredKeywords);
      }
    } catch (error) {
      console.error(`Error generating search string for ${database}:`, error);
      // Fallback to simple keyword joining
      return keywords.join(' OR ');
    }
  }

  /**
   * Process keyword selection/deselection
   */
  async updateKeywordSelection(
    currentResult: KeywordEnhancementResult,
    updates: KeywordSelectionUpdate[]
  ): Promise<KeywordEnhancementResult> {
    const updatedSelection = new Set(currentResult.selectedKeywords);

    for (const update of updates) {
      if (update.selected) {
        updatedSelection.add(update.keyword);
      } else {
        updatedSelection.delete(update.keyword);
      }
    }

    const selectedKeywords = Array.from(updatedSelection);
    
    // Regenerate search strings with updated selection
    const searchStrings: Record<DatabaseType, string> = {} as Record<DatabaseType, string>;
    for (const dbType of Object.values(DatabaseType)) {
      searchStrings[dbType] = await this.generateSearchStrings(selectedKeywords, dbType);
    }

    return {
      ...currentResult,
      selectedKeywords,
      searchStrings
    };
  }

  /**
   * Complete keyword enhancement workflow
   */
  async enhanceKeywords(manuscript: ManuscriptMetadata): Promise<KeywordEnhancementResult> {
    try {
      const combinedText = this.combineManuscriptText(manuscript);
      
      const [enhancedKeywords, meshTerms] = await Promise.all([
        this.generateEnhancedKeywords(manuscript),
        this.extractMeshTerms(combinedText)
      ]);

      // Initially select all keywords
      const allKeywords = [...new Set([...manuscript.keywords, ...enhancedKeywords])];
      
      // Generate search strings for all databases
      const searchStrings: Record<DatabaseType, string> = {} as Record<DatabaseType, string>;
      for (const dbType of Object.values(DatabaseType)) {
        searchStrings[dbType] = await this.generateSearchStrings(allKeywords, dbType);
      }

      return {
        originalKeywords: manuscript.keywords,
        enhancedKeywords,
        meshTerms,
        selectedKeywords: allKeywords,
        searchStrings
      };
    } catch (error) {
      console.error('Error in keyword enhancement workflow:', error);
      
      // Fallback result with original keywords only
      const fallbackSearchStrings: Record<DatabaseType, string> = {} as Record<DatabaseType, string>;
      for (const dbType of Object.values(DatabaseType)) {
        fallbackSearchStrings[dbType] = manuscript.keywords.join(' OR ');
      }

      return {
        originalKeywords: manuscript.keywords,
        enhancedKeywords: [],
        meshTerms: [],
        selectedKeywords: manuscript.keywords,
        searchStrings: fallbackSearchStrings
      };
    }
  }

  // Private helper methods

  private combineManuscriptText(manuscript: ManuscriptMetadata): string {
    return [
      manuscript.title,
      manuscript.abstract,
      ...manuscript.keywords,
      ...manuscript.primaryFocusAreas,
      ...manuscript.secondaryFocusAreas
    ].join(' ');
  }

  private async extractKeywordsFromText(text: string): Promise<string[]> {
    // Clean and tokenize text
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Use compromise for better NLP processing
    const doc = compromise(cleanText);
    
    // Extract nouns and noun phrases
    const nouns = doc.nouns().out('array');
    const adjectives = doc.adjectives().out('array');
    
    // Combine and filter
    const candidates = [...nouns, ...adjectives]
      .filter(term => term.length > 2)
      .filter(term => removeStopwords([term]).length > 0);

    // Use TF-IDF for ranking
    this.tfidf.addDocument(cleanText);
    const tfidfScores = new Map<string, number>();
    
    candidates.forEach(term => {
      const score = this.tfidf.tfidf(term, 0);
      if (score > 0) {
        tfidfScores.set(term, score);
      }
    });

    // Return top keywords sorted by TF-IDF score
    return Array.from(tfidfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term]) => term);
  }

  private enhanceWithSynonyms(keywords: string[]): string[] {
    const enhanced: string[] = [];
    
    // Simple synonym expansion (in a real implementation, you'd use a proper thesaurus API)
    const synonymMap = new Map([
      ['treatment', ['therapy', 'intervention', 'management']],
      ['study', ['research', 'investigation', 'analysis']],
      ['method', ['approach', 'technique', 'procedure']],
      ['result', ['outcome', 'finding', 'conclusion']],
      ['patient', ['subject', 'participant', 'individual']],
      ['disease', ['disorder', 'condition', 'illness']],
      ['drug', ['medication', 'pharmaceutical', 'compound']],
      ['test', ['assay', 'examination', 'assessment']]
    ]);

    keywords.forEach(keyword => {
      const synonyms = synonymMap.get(keyword.toLowerCase());
      if (synonyms) {
        enhanced.push(...synonyms);
      }
    });

    return enhanced;
  }

  private filterAndRankKeywords(keywords: string[], text: string): string[] {
    // Filter out very common or very rare terms
    const filtered = keywords.filter(keyword => {
      const frequency = (text.match(new RegExp(keyword, 'gi')) || []).length;
      return frequency >= 1 && frequency <= 10 && keyword.length > 2;
    });

    // Prioritize preserved medical terms
    const prioritized = filtered.sort((a, b) => {
      const aPreserved = this.preservedTerms.has(a.toLowerCase()) ? 1 : 0;
      const bPreserved = this.preservedTerms.has(b.toLowerCase()) ? 1 : 0;
      return bPreserved - aPreserved;
    });

    return prioritized.slice(0, 20);
  }

  private findRelatedMeshTerms(keyword: string): string[] {
    const related: string[] = [];
    
    for (const [term, meshList] of this.meshTerms.entries()) {
      if (keyword.includes(term) || term.includes(keyword)) {
        related.push(...meshList);
      }
    }

    return related;
  }

  private generatePubMedSearchString(keywords: string[]): string {
    // PubMed uses MeSH terms and field tags
    const terms = keywords.map(keyword => {
      // Check if it's a potential MeSH term
      const meshRelated = this.findRelatedMeshTerms(keyword);
      if (meshRelated.length > 0) {
        return `("${keyword}"[MeSH Terms] OR "${keyword}"[All Fields])`;
      }
      return `"${keyword}"[All Fields]`;
    });

    return terms.join(' OR ');
  }

  private generateElsevierSearchString(keywords: string[]): string {
    // Elsevier Scopus format
    const terms = keywords.map(keyword => `TITLE-ABS-KEY("${keyword}")`);
    return terms.join(' OR ');
  }

  private generateWileySearchString(keywords: string[]): string {
    // Wiley Online Library format
    const terms = keywords.map(keyword => `"${keyword}" anywhere`);
    return terms.join(' OR ');
  }

  private generateTaylorFrancisSearchString(keywords: string[]): string {
    // Taylor & Francis format
    const terms = keywords.map(keyword => `[All: "${keyword}"]`);
    return terms.join(' OR ');
  }

  private generateGenericSearchString(keywords: string[]): string {
    // Generic boolean search
    return keywords.map(k => `"${k}"`).join(' OR ');
  }
}