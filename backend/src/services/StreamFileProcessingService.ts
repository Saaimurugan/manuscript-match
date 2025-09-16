import { Readable, Transform } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse = require('pdf-parse');
import mammoth = require('mammoth');
import { ManuscriptMetadata, Author, Affiliation } from '../types';

export interface StreamProcessingOptions {
  chunkSize?: number;
  maxFileSize?: number;
  tempDir?: string;
}

export interface ProcessingProgress {
  bytesProcessed: number;
  totalBytes: number;
  percentage: number;
  stage: 'reading' | 'parsing' | 'extracting' | 'complete';
}

export class StreamFileProcessingService {
  private readonly defaultOptions: Required<StreamProcessingOptions> = {
    chunkSize: 64 * 1024, // 64KB chunks
    maxFileSize: 50 * 1024 * 1024, // 50MB max
    tempDir: path.join(process.cwd(), 'temp'),
  };

  constructor(private options: StreamProcessingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.options.tempDir!)) {
      fs.mkdirSync(this.options.tempDir!, { recursive: true });
    }
  }

  async processFileStream(
    fileStream: Readable,
    mimeType: string,
    originalName: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ManuscriptMetadata> {
    const tempFilePath = path.join(
      this.options.tempDir!,
      `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${originalName}`
    );

    try {
      // Stream file to temporary location with progress tracking
      await this.streamToFile(fileStream, tempFilePath, onProgress);
      
      // Process the file based on mime type
      const metadata = await this.processFile(tempFilePath, mimeType, onProgress);
      
      return metadata;
    } finally {
      // Clean up temporary file
      this.cleanupTempFile(tempFilePath);
    }
  }

  private async streamToFile(
    source: Readable,
    destination: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(destination);
      let bytesProcessed = 0;
      const maxSize = this.options.maxFileSize!;

      // Create a transform stream to track progress and enforce size limits
      const progressTracker = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytesProcessed += chunk.length;

          // Check file size limit
          if (bytesProcessed > maxSize) {
            return callback(new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`));
          }

          // Report progress
          if (onProgress) {
            onProgress({
              bytesProcessed,
              totalBytes: maxSize, // We don't know total size, use max as estimate
              percentage: Math.min((bytesProcessed / maxSize) * 100, 100),
              stage: 'reading'
            });
          }

          callback(null, chunk);
        }
      });

      // Handle errors
      const handleError = (error: Error) => {
        writeStream.destroy();
        this.cleanupTempFile(destination);
        reject(error);
      };

      source.on('error', handleError);
      progressTracker.on('error', handleError);
      writeStream.on('error', handleError);

      writeStream.on('finish', () => {
        if (onProgress) {
          onProgress({
            bytesProcessed,
            totalBytes: bytesProcessed,
            percentage: 100,
            stage: 'parsing'
          });
        }
        resolve();
      });

      // Pipeline the streams
      source.pipe(progressTracker).pipe(writeStream);
    });
  }

  private async processFile(
    filePath: string,
    mimeType: string,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ManuscriptMetadata> {
    const fileStats = fs.statSync(filePath);
    
    if (onProgress) {
      onProgress({
        bytesProcessed: fileStats.size,
        totalBytes: fileStats.size,
        percentage: 100,
        stage: 'extracting'
      });
    }

    let metadata: ManuscriptMetadata;

    switch (mimeType) {
      case 'application/pdf':
        metadata = await this.processPdfFile(filePath);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        metadata = await this.processWordFile(filePath);
        break;
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }

    if (onProgress) {
      onProgress({
        bytesProcessed: fileStats.size,
        totalBytes: fileStats.size,
        percentage: 100,
        stage: 'complete'
      });
    }

    return metadata;
  }

  private async processPdfFile(filePath: string): Promise<ManuscriptMetadata> {
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    
    return this.extractMetadataFromText(pdfData.text);
  }

  private async processWordFile(filePath: string): Promise<ManuscriptMetadata> {
    const result = await mammoth.extractRawText({ path: filePath });
    return this.extractMetadataFromText(result.value);
  }

  private extractMetadataFromText(text: string): ManuscriptMetadata {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract title (usually the first significant line)
    const title = this.extractTitle(lines);
    
    // Extract authors
    const authors = this.extractAuthors(text);
    
    // Extract abstract
    const abstract = this.extractAbstract(text);
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Extract affiliations
    const affiliations = this.extractAffiliations(text);

    return {
      title,
      authors,
      affiliations,
      abstract,
      keywords,
      primaryFocusAreas: this.extractFocusAreas(text, 'primary'),
      secondaryFocusAreas: this.extractFocusAreas(text, 'secondary'),
    };
  }

  private extractTitle(lines: string[]): string {
    // Look for the first substantial line that's likely a title
    for (const line of lines) {
      if (line.length > 10 && line.length < 200 && !line.toLowerCase().includes('abstract')) {
        return line;
      }
    }
    return 'Untitled Document';
  }

  private extractAuthors(text: string): Author[] {
    const authors: Author[] = [];
    
    // Simple pattern matching for author names
    const authorPatterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
      /([A-Z]\.\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
    ];

    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emails = text.match(emailPattern) || [];

    for (const pattern of authorPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((name, index) => {
          if (!authors.some(author => author.name === name)) {
            authors.push({
              id: `temp-${Date.now()}-${index}`,
              name,
              email: emails[index] || '',
              affiliations: [],
              publicationCount: 0,
              clinicalTrials: 0,
              retractions: 0,
              researchAreas: [],
              meshTerms: []
            });
          }
        });
      }
    }

    return authors.slice(0, 10); // Limit to reasonable number
  }

  private extractAbstract(text: string): string {
    const abstractMatch = text.match(/abstract[:\s]+(.*?)(?=\n\s*(?:keywords?|introduction|1\.|references)|$)/i);
    return abstractMatch && abstractMatch[1] ? abstractMatch[1].trim() : '';
  }

  private extractKeywords(text: string): string[] {
    const keywordMatch = text.match(/keywords?[:\s]+(.*?)(?=\n\s*(?:introduction|1\.|abstract)|$)/i);
    if (keywordMatch && keywordMatch[1]) {
      return keywordMatch[1]
        .split(/[,;]/)
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0)
        .slice(0, 20); // Limit keywords
    }
    return [];
  }

  private extractAffiliations(text: string): Affiliation[] {
    const affiliations: Affiliation[] = [];
    
    // Simple pattern for university/institution names
    const institutionPattern = /([A-Z][a-z]+ (?:University|Institute|College|Hospital|Center|Centre))/g;
    const institutions = text.match(institutionPattern) || [];
    
    institutions.forEach((institution, index) => {
      if (!affiliations.some(aff => aff.institutionName === institution)) {
        affiliations.push({
          id: `temp-affiliation-${Date.now()}-${index}`,
          institutionName: institution,
          department: '',
          address: '',
          country: ''
        });
      }
    });

    return affiliations.slice(0, 5); // Limit affiliations
  }

  private extractFocusAreas(text: string, type: 'primary' | 'secondary'): string[] {
    // Simple extraction based on common academic terms
    const academicTerms = [
      'machine learning', 'artificial intelligence', 'data science', 'computer science',
      'biology', 'chemistry', 'physics', 'mathematics', 'engineering', 'medicine',
      'psychology', 'sociology', 'economics', 'finance', 'business', 'management'
    ];

    const foundTerms = academicTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    );

    return type === 'primary' ? foundTerms.slice(0, 3) : foundTerms.slice(3, 6);
  }

  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to cleanup temp file:', error);
    }
  }

  // Memory-efficient text processing for large documents
  async processLargeTextStream(
    textStream: Readable,
    processor: (chunk: string) => void
  ): Promise<void> {
    let buffer = '';

    return new Promise((resolve, reject) => {
      textStream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        
        // Process complete lines
        while (buffer.includes('\n')) {
          const lineEnd = buffer.indexOf('\n');
          const line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 1);
          
          if (line.trim()) {
            processor(line);
          }
        }
      });

      textStream.on('end', () => {
        // Process remaining buffer
        if (buffer.trim()) {
          processor(buffer);
        }
        resolve();
      });

      textStream.on('error', reject);
    });
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    try {
      const tempFiles = fs.readdirSync(this.options.tempDir!);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of tempFiles) {
        const filePath = path.join(this.options.tempDir!, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const streamFileProcessingService = new StreamFileProcessingService();