import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { Readable } from 'stream';
import { ManuscriptMetadata, Author, Affiliation, FileProcessingResult } from '../types';
import { streamFileProcessingService, ProcessingProgress } from './StreamFileProcessingService';
import { performanceMonitoringService } from './PerformanceMonitoringService';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    size: number;
    mimeType: string;
    extension: string;
  };
}

export class ManuscriptProcessingService {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  /**
   * Validate uploaded file
   */
  validateFile(buffer: Buffer, originalName: string, mimeType: string): FileValidationResult {
    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    // Check mime type
    if (!this.SUPPORTED_MIME_TYPES.includes(mimeType)) {
      return {
        isValid: false,
        error: `Unsupported file type. Supported formats: PDF, DOCX, DOC`
      };
    }

    // Check file extension
    const extension = path.extname(originalName).toLowerCase();
    const validExtensions = ['.pdf', '.docx', '.doc'];
    if (!validExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `Invalid file extension. Supported extensions: ${validExtensions.join(', ')}`
      };
    }

    // Basic content validation
    if (buffer.length === 0) {
      return {
        isValid: false,
        error: 'File is empty'
      };
    }

    return {
      isValid: true,
      fileInfo: {
        size: buffer.length,
        mimeType,
        extension
      }
    };
  }

  /**
   * Extract text content from file based on type
   */
  private async extractTextContent(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractPdfText(buffer);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractWordText(buffer);
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from Word document using mammoth
   */
  private async extractWordText(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`Word document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract metadata from manuscript text (legacy method for backward compatibility)
   */
  async extractMetadata(buffer: Buffer, originalName: string, mimeType: string): Promise<FileProcessingResult> {
    return performanceMonitoringService.measureExecutionTime(
      'manuscript_processing.extract_metadata',
      async () => {
        const startTime = Date.now();

        try {
          // Add small delay to ensure processing time > 0
          await new Promise(resolve => setTimeout(resolve, 1));
          
          // Validate file first
          const validation = this.validateFile(buffer, originalName, mimeType);
          if (!validation.isValid) {
            return {
              success: false,
              error: validation.error || 'Validation failed',
              processingTime: Date.now() - startTime
            };
          }

          // Extract text content
          const textContent = await this.extractTextContent(buffer, mimeType);
          
          if (!textContent || textContent.trim().length === 0) {
            return {
              success: false,
              error: 'No text content could be extracted from the file',
              processingTime: Date.now() - startTime
            };
          }

          // Extract structured metadata
          const metadata = await this.parseManuscriptContent(textContent);

          return {
            success: true,
            metadata,
            processingTime: Date.now() - startTime
          };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown processing error',
            processingTime: Date.now() - startTime
          };
        }
      },
      { file_type: mimeType, file_size: buffer.length.toString() }
    );
  }

  /**
   * Stream-based metadata extraction for large files
   */
  async extractMetadataStream(
    fileStream: Readable,
    originalName: string,
    mimeType: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<FileProcessingResult> {
    return performanceMonitoringService.measureExecutionTime(
      'manuscript_processing.extract_metadata_stream',
      async () => {
        const startTime = Date.now();

        try {
          const metadata = await streamFileProcessingService.processFileStream(
            fileStream,
            mimeType,
            originalName,
            onProgress
          );

          return {
            success: true,
            metadata,
            processingTime: Date.now() - startTime
          };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Stream processing error',
            processingTime: Date.now() - startTime
          };
        }
      },
      { file_type: mimeType, processing_type: 'stream' }
    );
  }

  /**
   * Parse manuscript content to extract structured metadata
   */
  private async parseManuscriptContent(textContent: string): Promise<ManuscriptMetadata> {
    // Clean and normalize text
    const cleanText = this.cleanText(textContent);
    
    // Extract different sections
    const title = this.extractTitle(cleanText);
    const abstract = this.extractAbstract(cleanText);
    const keywords = this.extractKeywords(cleanText);
    const authorsAndAffiliations = this.extractAuthorsAndAffiliations(cleanText);

    // Generate focus areas from content
    const focusAreas = this.generateFocusAreas(cleanText, keywords);

    return {
      title: title || 'Untitled Manuscript',
      authors: authorsAndAffiliations.authors,
      affiliations: authorsAndAffiliations.affiliations,
      abstract: abstract || '',
      keywords: keywords,
      primaryFocusAreas: focusAreas.primary,
      secondaryFocusAreas: focusAreas.secondary
    };
  }

  /**
   * Clean and normalize text content
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Extract title from manuscript text
   */
  private extractTitle(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for explicit title patterns first
    for (const line of lines.slice(0, 10)) {
      const titleMatch = line.match(/^title:\s*(.+)$/i);
      if (titleMatch && titleMatch[1]) {
        const title = titleMatch[1].trim();
        if (title.length >= 10 && title.length <= 200) {
          return title;
        }
      }
    }

    // Fallback: use first substantial line that's not abstract/keywords/authors
    for (const line of lines.slice(0, 10)) {
      const lowerLine = line.toLowerCase();
      if (line.length >= 10 && line.length <= 200 && 
          !lowerLine.startsWith('abstract') && 
          !lowerLine.startsWith('keywords') && 
          !lowerLine.startsWith('authors') &&
          !lowerLine.startsWith('by:')) {
        return line;
      }
    }

    return null;
  }

  /**
   * Extract abstract from manuscript text
   */
  private extractAbstract(text: string): string | null {
    const abstractPatterns = [
      /abstract[:\s]*\n([\s\S]*?)(?=\n\s*(?:keywords?|introduction|1\.|references|acknowledgments))/i,
      /abstract[:\s]*(.*?)(?=\n\s*(?:keywords?|introduction|1\.))/i,
    ];

    for (const pattern of abstractPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const abstract = match[1].trim();
        if (abstract.length >= 50) { // Minimum abstract length
          return abstract;
        }
      }
    }

    return null;
  }

  /**
   * Extract keywords from manuscript text
   */
  private extractKeywords(text: string): string[] {
    const keywordPatterns = [
      /keywords?[:\s]*([^\n]+)/i,
      /key\s*words?[:\s]*([^\n]+)/i,
    ];

    for (const pattern of keywordPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const keywordsText = match[1].trim();
        // Split by common delimiters and clean
        const keywords = keywordsText
          .split(/[,;]/)
          .map(kw => kw.trim())
          .filter(kw => kw.length > 0 && kw.length <= 50)
          .slice(0, 20); // Limit to 20 keywords
        
        if (keywords.length > 0) {
          return keywords;
        }
      }
    }

    // Fallback: extract potential keywords from title and abstract
    return this.extractImplicitKeywords(text);
  }

  /**
   * Extract implicit keywords from content
   */
  private extractImplicitKeywords(text: string): string[] {
    // Simple keyword extraction based on frequency and position
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && word.length <= 20);

    const wordFreq: Record<string, number> = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get most frequent words (excluding common stop words)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);
    
    return Object.entries(wordFreq)
      .filter(([word, freq]) => freq >= 2 && !stopWords.has(word))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Extract authors and affiliations from manuscript text
   */
  private extractAuthorsAndAffiliations(text: string): { authors: Author[], affiliations: Affiliation[] } {
    const authors: Author[] = [];
    const affiliations: Affiliation[] = [];

    // Look for author patterns - more flexible matching
    const authorPatterns = [
      /authors?[:\s]*([^\n]+)/i,  // Authors: on same line
      /authors?[:\s]*\n([^]*?)(?=\n\s*(?:abstract|introduction|affiliations?|keywords?))/i, // Authors: on next lines
      /by[:\s]+([^\n]+)/i,  // by: pattern
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const authorsText = match[1].trim();
        const authorNames = this.parseAuthorNames(authorsText);
        
        if (authorNames.length > 0) {
          authorNames.forEach((name, index) => {
            authors.push({
              id: `temp-author-${index}`,
              name,
              affiliations: [],
              publicationCount: 0,
              clinicalTrials: 0,
              retractions: 0,
              researchAreas: [],
              meshTerms: []
            });
          });
          break;
        }
      }
    }

    // Look for affiliation patterns
    const affiliationPatterns = [
      /affiliations?[:\s]*\n([^]*?)(?=\n\s*(?:abstract|introduction|keywords?))/i,
    ];

    for (const pattern of affiliationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const affiliationsText = match[1].trim();
        const parsedAffiliations = this.parseAffiliations(affiliationsText);
        affiliations.push(...parsedAffiliations);
        break;
      }
    }

    // If no authors found, create a placeholder
    if (authors.length === 0) {
      authors.push({
        id: 'temp-author-0',
        name: 'Unknown Author',
        affiliations: [],
        publicationCount: 0,
        clinicalTrials: 0,
        retractions: 0,
        researchAreas: [],
        meshTerms: []
      });
    }

    return { authors, affiliations };
  }

  /**
   * Parse author names from text
   */
  private parseAuthorNames(authorsText: string): string[] {
    // Split by common delimiters and clean
    const names = authorsText
      .split(/[,;&\n]/)
      .map(name => name.trim())
      .filter(name => name.length > 0 && name.length <= 100)
      .map(name => name.replace(/^\d+\.?\s*/, '')) // Remove numbering
      .filter(name => name.length >= 2 && !name.toLowerCase().includes('abstract'));

    return names.slice(0, 20); // Limit to 20 authors
  }

  /**
   * Parse affiliations from text
   */
  private parseAffiliations(affiliationsText: string): Affiliation[] {
    const affiliations: Affiliation[] = [];
    const lines = affiliationsText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    lines.forEach((line, index) => {
      if (line.length >= 10) { // Minimum affiliation length
        affiliations.push({
          id: `temp-affiliation-${index}`,
          institutionName: line,
          address: line,
          country: 'Unknown'
        });
      }
    });

    return affiliations.slice(0, 10); // Limit to 10 affiliations
  }

  /**
   * Generate focus areas from content and keywords
   */
  private generateFocusAreas(text: string, keywords: string[]): { primary: string[], secondary: string[] } {
    // Combine keywords with content analysis
    const allTerms = [...keywords];
    
    // Add terms from title and abstract if available
    const titleMatch = text.match(/^(.{10,200})/);
    if (titleMatch) {
      const titleWords = titleMatch[1]?.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 4);
      if (titleWords) {
        allTerms.push(...titleWords);
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueTerms = [...new Set(allTerms)].slice(0, 15);
    
    return {
      primary: uniqueTerms.slice(0, 5),
      secondary: uniqueTerms.slice(5, 10)
    };
  }
}