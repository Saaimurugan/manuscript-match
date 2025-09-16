import { ShortlistRepository } from '../repositories/ShortlistRepository';
import { ProcessAuthorRepository } from '../repositories/ProcessAuthorRepository';
import { AuthorRepository } from '../repositories/AuthorRepository';
import { AuthorRole } from '../types';
import { AuthorWithAffiliations } from '../repositories/AuthorRepository';

import * as fs from 'fs';
import * as path from 'path';
// Simple CSV writer implementation
import * as XLSX from 'xlsx';

export interface ShortlistData {
  id: string;
  processId: string;
  name: string;
  authors: AuthorWithAffiliations[];
  createdAt: Date;
}

export interface CreateShortlistRequest {
  processId: string;
  name: string;
  authorIds: string[];
}

export interface ExportFormat {
  format: 'csv' | 'xlsx' | 'docx';
  filename: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  error?: string;
}

export class ShortlistService {
  constructor(
    private shortlistRepository: ShortlistRepository,
    private processAuthorRepository: ProcessAuthorRepository,
    private authorRepository: AuthorRepository
  ) {}

  async createShortlist(data: CreateShortlistRequest): Promise<ShortlistData> {
    try {
      // Validate that all authors exist and belong to the process
      const authors = await this.validateAuthorsForProcess(data.processId, data.authorIds);
      
      // Create the shortlist
      const shortlist = await this.shortlistRepository.create({
        processId: data.processId,
        name: data.name,
      });

      // Add authors to shortlist by updating their role
      await this.processAuthorRepository.updateAuthorRoles(
        data.processId,
        data.authorIds,
        AuthorRole.SHORTLISTED
      );

      return {
        id: shortlist.id,
        processId: shortlist.processId,
        name: shortlist.name,
        authors,
        createdAt: shortlist.createdAt,
      };
    } catch (error) {
      throw new Error(`Failed to create shortlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getShortlistsByProcess(processId: string): Promise<ShortlistData[]> {
    try {
      const shortlists = await this.shortlistRepository.findByProcessId(processId);
      
      const shortlistsWithAuthors = await Promise.all(
        shortlists.map(async (shortlist) => {
          const authors = await this.getShortlistedAuthors(processId);
          return {
            id: shortlist.id,
            processId: shortlist.processId,
            name: shortlist.name,
            authors,
            createdAt: shortlist.createdAt,
          };
        })
      );

      return shortlistsWithAuthors;
    } catch (error) {
      throw new Error(`Failed to get shortlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getShortlistById(shortlistId: string): Promise<ShortlistData | null> {
    try {
      const shortlist = await this.shortlistRepository.findById(shortlistId);
      if (!shortlist) {
        return null;
      }

      const authors = await this.getShortlistedAuthors(shortlist.processId);
      
      return {
        id: shortlist.id,
        processId: shortlist.processId,
        name: shortlist.name,
        authors,
        createdAt: shortlist.createdAt,
      };
    } catch (error) {
      throw new Error(`Failed to get shortlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportShortlist(processId: string, format: 'csv' | 'xlsx' | 'docx'): Promise<ExportResult> {
    try {
      const authors = await this.getShortlistedAuthors(processId);
      
      if (authors.length === 0) {
        return {
          success: false,
          error: 'No shortlisted authors found for export'
        };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `shortlist-${processId}-${timestamp}.${format}`;
      const exportDir = path.join(process.cwd(), 'exports');
      
      // Ensure export directory exists
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const filePath = path.join(exportDir, filename);

      switch (format) {
        case 'csv':
          await this.exportToCsv(authors, filePath);
          break;
        case 'xlsx':
          await this.exportToXlsx(authors, filePath);
          break;
        case 'docx':
          await this.exportToDocx(authors, filePath);
          break;
        default:
          return {
            success: false,
            error: `Unsupported export format: ${format}`
          };
      }

      return {
        success: true,
        filePath,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async validateAuthorsForProcess(processId: string, authorIds: string[]): Promise<AuthorWithAffiliations[]> {
    const authors: AuthorWithAffiliations[] = [];
    
    for (const authorId of authorIds) {
      // Check if author exists in the process
      const processAuthor = await this.processAuthorRepository.findByProcessAndAuthor(processId, authorId);
      if (!processAuthor) {
        throw new Error(`Author ${authorId} not found in process ${processId}`);
      }

      // Get full author details
      const author = await this.authorRepository.findByIdWithAffiliations(authorId);
      if (!author) {
        throw new Error(`Author ${authorId} not found`);
      }

      authors.push(author);
    }

    return authors;
  }

  private async getShortlistedAuthors(processId: string): Promise<AuthorWithAffiliations[]> {
    const processAuthors = await this.processAuthorRepository.findByProcessAndRole(
      processId,
      AuthorRole.SHORTLISTED
    );

    const authors = await Promise.all(
      processAuthors.map(async (pa) => {
        const author = await this.authorRepository.findByIdWithAffiliations(pa.authorId);
        if (!author) {
          throw new Error(`Author ${pa.authorId} not found`);
        }
        return author;
      })
    );

    return authors;
  }

  private async exportToCsv(authors: AuthorWithAffiliations[], filePath: string): Promise<void> {
    const headers = ['Name', 'Email', 'Institution', 'Department', 'Country', 'Publications', 'Clinical Trials', 'Retractions', 'Research Areas', 'MeSH Terms'];
    
    const csvContent = [
      headers.join(','),
      ...authors.map(author => {
        const researchAreas = author.researchAreas ? 
          (typeof author.researchAreas === 'string' ? JSON.parse(author.researchAreas) : author.researchAreas) : [];
        const meshTerms = author.meshTerms ? 
          (typeof author.meshTerms === 'string' ? JSON.parse(author.meshTerms) : author.meshTerms) : [];
        
        const row = [
          this.escapeCsvField(author.name),
          this.escapeCsvField(author.email || ''),
          this.escapeCsvField(author.affiliations?.[0]?.affiliation?.institutionName || ''),
          this.escapeCsvField(author.affiliations?.[0]?.affiliation?.department || ''),
          this.escapeCsvField(author.affiliations?.[0]?.affiliation?.country || ''),
          author.publicationCount.toString(),
          author.clinicalTrials.toString(),
          author.retractions.toString(),
          this.escapeCsvField(Array.isArray(researchAreas) ? researchAreas.join('; ') : ''),
          this.escapeCsvField(Array.isArray(meshTerms) ? meshTerms.join('; ') : '')
        ];
        
        return row.join(',');
      })
    ].join('\n');

    fs.writeFileSync(filePath, csvContent, 'utf8');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  private async exportToXlsx(authors: AuthorWithAffiliations[], filePath: string): Promise<void> {
    const workbook = XLSX.utils.book_new();
    
    const worksheetData = [
      ['Name', 'Email', 'Institution', 'Department', 'Country', 'Publications', 'Clinical Trials', 'Retractions', 'Research Areas', 'MeSH Terms']
    ];

    authors.forEach(author => {
      const researchAreas = author.researchAreas ? 
        (typeof author.researchAreas === 'string' ? JSON.parse(author.researchAreas) : author.researchAreas) : [];
      const meshTerms = author.meshTerms ? 
        (typeof author.meshTerms === 'string' ? JSON.parse(author.meshTerms) : author.meshTerms) : [];
      
      worksheetData.push([
        author.name,
        author.email || '',
        author.affiliations?.[0]?.affiliation?.institutionName || '',
        author.affiliations?.[0]?.affiliation?.department || '',
        author.affiliations?.[0]?.affiliation?.country || '',
        author.publicationCount,
        author.clinicalTrials,
        author.retractions,
        Array.isArray(researchAreas) ? researchAreas.join('; ') : '',
        Array.isArray(meshTerms) ? meshTerms.join('; ') : ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Name
      { wch: 30 }, // Email
      { wch: 30 }, // Institution
      { wch: 20 }, // Department
      { wch: 15 }, // Country
      { wch: 12 }, // Publications
      { wch: 15 }, // Clinical Trials
      { wch: 12 }, // Retractions
      { wch: 40 }, // Research Areas
      { wch: 40 }  // MeSH Terms
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shortlisted Reviewers');
    XLSX.writeFile(workbook, filePath);
  }

  private async exportToDocx(authors: AuthorWithAffiliations[], filePath: string): Promise<void> {
    // For now, create a simple text-based document
    // In a production environment, you might want to use a proper Word document library
    let content = 'SHORTLISTED PEER REVIEWERS\n';
    content += '='.repeat(50) + '\n\n';

    authors.forEach((author, index) => {
      const researchAreas = author.researchAreas ? 
        (typeof author.researchAreas === 'string' ? JSON.parse(author.researchAreas) : author.researchAreas) : [];
      const meshTerms = author.meshTerms ? 
        (typeof author.meshTerms === 'string' ? JSON.parse(author.meshTerms) : author.meshTerms) : [];
      
      content += `${index + 1}. ${author.name}\n`;
      if (author.email) {
        content += `   Email: ${author.email}\n`;
      }
      if (author.affiliations && author.affiliations.length > 0) {
        const affiliation = author.affiliations[0].affiliation;
        content += `   Institution: ${affiliation.institutionName}\n`;
        if (affiliation.department) {
          content += `   Department: ${affiliation.department}\n`;
        }
        content += `   Country: ${affiliation.country}\n`;
      }
      content += `   Publications: ${author.publicationCount}\n`;
      content += `   Clinical Trials: ${author.clinicalTrials}\n`;
      content += `   Retractions: ${author.retractions}\n`;
      if (Array.isArray(researchAreas) && researchAreas.length > 0) {
        content += `   Research Areas: ${researchAreas.join(', ')}\n`;
      }
      if (Array.isArray(meshTerms) && meshTerms.length > 0) {
        content += `   MeSH Terms: ${meshTerms.join(', ')}\n`;
      }
      content += '\n' + '-'.repeat(50) + '\n\n';
    });

    fs.writeFileSync(filePath, content, 'utf8');
  }
}