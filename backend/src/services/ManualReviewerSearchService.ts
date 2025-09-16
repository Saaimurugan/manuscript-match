import { DatabaseIntegrationService } from './DatabaseIntegrationService';
import { ProcessService } from './ProcessService';
import { Author, DatabaseType } from '../types';

export interface ManualSearchResult {
  authors: Author[];
  searchTerm: string;
  searchType: 'name' | 'email';
  totalFound: number;
  searchTime: number;
  suggestions?: string[];
}

export interface SearchSuggestion {
  term: string;
  type: 'name_variation' | 'email_variation' | 'partial_match';
  confidence: number;
}

export class ManualReviewerSearchService {
  private databaseIntegrationService: DatabaseIntegrationService;
  private processService: ProcessService;

  constructor(
    databaseIntegrationService: DatabaseIntegrationService,
    processService: ProcessService
  ) {
    this.databaseIntegrationService = databaseIntegrationService;
    this.processService = processService;
  }

  /**
   * Search for authors by name across all databases
   * Requirement 5.1: WHEN a user searches for reviewers by name THEN the system SHALL return matching author profiles from the databases
   */
  async searchByName(
    name: string,
    databases?: DatabaseType[]
  ): Promise<ManualSearchResult> {
    const startTime = Date.now();
    
    try {
      const authors = await this.databaseIntegrationService.searchByName(name, databases);
      const searchTime = Date.now() - startTime;

      let suggestions: string[] = [];
      if (authors.length === 0) {
        suggestions = this.generateNameSearchSuggestions(name);
      }

      return {
        authors,
        searchTerm: name,
        searchType: 'name',
        totalFound: authors.length,
        searchTime,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      console.error('Error searching by name:', error);
      return {
        authors: [],
        searchTerm: name,
        searchType: 'name',
        totalFound: 0,
        searchTime: Date.now() - startTime,
        suggestions: this.generateNameSearchSuggestions(name),
      };
    }
  }

  /**
   * Search for authors by email across all databases
   * Requirement 5.2: WHEN a user searches by email THEN the system SHALL find corresponding author records
   */
  async searchByEmail(
    email: string,
    databases?: DatabaseType[]
  ): Promise<ManualSearchResult> {
    const startTime = Date.now();
    
    try {
      const authors = await this.databaseIntegrationService.searchByEmail(email, databases);
      const searchTime = Date.now() - startTime;

      let suggestions: string[] = [];
      if (authors.length === 0) {
        suggestions = this.generateEmailSearchSuggestions(email);
      }

      return {
        authors,
        searchTerm: email,
        searchType: 'email',
        totalFound: authors.length,
        searchTime,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      console.error('Error searching by email:', error);
      return {
        authors: [],
        searchTerm: email,
        searchType: 'email',
        totalFound: 0,
        searchTime: Date.now() - startTime,
        suggestions: this.generateEmailSearchSuggestions(email),
      };
    }
  }

  /**
   * Add a manual reviewer to the candidate pool
   * Requirement 5.3: WHEN a user adds a manual reviewer THEN the system SHALL include them in the candidate pool for validation
   */
  async addManualReviewer(
    processId: string,
    userId: string,
    author: Author
  ): Promise<boolean> {
    try {
      return await this.processService.addManualReviewer(processId, userId, author);
    } catch (error) {
      console.error('Error adding manual reviewer:', error);
      return false;
    }
  }

  /**
   * Remove a reviewer from the candidate pool
   * Requirement 5.4: WHEN a user removes a reviewer THEN the system SHALL exclude them from further processing
   */
  async removeReviewer(
    processId: string,
    userId: string,
    authorId: string
  ): Promise<boolean> {
    try {
      return await this.processService.removeManualReviewer(processId, userId, authorId);
    } catch (error) {
      console.error('Error removing reviewer:', error);
      return false;
    }
  }

  /**
   * Generate search suggestions for no-results scenarios
   * Requirement 5.5: IF manual search returns no results THEN the system SHALL suggest alternative search terms
   */
  generateSearchSuggestions(
    searchTerm: string,
    searchType: 'name' | 'email'
  ): SearchSuggestion[] {
    if (searchType === 'name') {
      return this.generateNameSuggestions(searchTerm);
    } else {
      return this.generateEmailSuggestions(searchTerm);
    }
  }

  /**
   * Get all manual reviewers added to a process
   */
  async getManualReviewers(
    processId: string,
    userId: string
  ): Promise<Author[]> {
    try {
      const candidates = await this.processService.getProcessCandidates(processId, userId);
      return candidates || [];
    } catch (error) {
      console.error('Error getting manual reviewers:', error);
      return [];
    }
  }

  /**
   * Batch add multiple reviewers
   */
  async addMultipleReviewers(
    processId: string,
    userId: string,
    authors: Author[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const author of authors) {
      try {
        const result = await this.addManualReviewer(processId, userId, author);
        if (result) {
          success++;
        } else {
          failed++;
          errors.push(`Failed to add ${author.name}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error adding ${author.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Search across multiple criteria (name and email)
   */
  async searchMultipleCriteria(
    criteria: { name?: string; email?: string },
    databases?: DatabaseType[]
  ): Promise<ManualSearchResult> {
    const startTime = Date.now();
    const allAuthors: Author[] = [];
    const searchTerms: string[] = [];

    try {
      // Search by name if provided
      if (criteria.name) {
        const nameResults = await this.databaseIntegrationService.searchByName(criteria.name, databases);
        allAuthors.push(...nameResults);
        searchTerms.push(`name:${criteria.name}`);
      }

      // Search by email if provided
      if (criteria.email) {
        const emailResults = await this.databaseIntegrationService.searchByEmail(criteria.email, databases);
        allAuthors.push(...emailResults);
        searchTerms.push(`email:${criteria.email}`);
      }

      // Deduplicate authors
      const uniqueAuthors = this.deduplicateAuthors(allAuthors);
      const searchTime = Date.now() - startTime;

      let suggestions: string[] = [];
      if (uniqueAuthors.length === 0) {
        if (criteria.name) {
          suggestions.push(...this.generateNameSearchSuggestions(criteria.name));
        }
        if (criteria.email) {
          suggestions.push(...this.generateEmailSearchSuggestions(criteria.email));
        }
      }

      return {
        authors: uniqueAuthors,
        searchTerm: searchTerms.join(' AND '),
        searchType: 'name',
        totalFound: uniqueAuthors.length,
        searchTime,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      console.error('Error in multi-criteria search:', error);
      return {
        authors: [],
        searchTerm: searchTerms.join(' AND '),
        searchType: 'name',
        totalFound: 0,
        searchTime: Date.now() - startTime,
        suggestions: [],
      };
    }
  }

  // Private helper methods

  private generateNameSearchSuggestions(name: string): string[] {
    const suggestions: string[] = [];
    const trimmedName = name.trim();

    if (!trimmedName) return suggestions;

    const nameParts = trimmedName.split(/\s+/);

    if (nameParts.length > 1) {
      // Suggest different name orders
      suggestions.push(nameParts.reverse().join(' '));
      
      // Suggest initials + last name
      const initials = nameParts.slice(0, -1).map(part => part.charAt(0).toUpperCase()).join('. ');
      const lastName = nameParts[nameParts.length - 1];
      suggestions.push(`${initials}. ${lastName}`);
      
      // Suggest first name + last initial
      const firstName = nameParts[0];
      const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase();
      if (lastInitial) {
        suggestions.push(`${firstName} ${lastInitial}.`);
      }

      // Suggest last name only
      suggestions.push(lastName);
    }

    // Suggest partial matches for longer names
    if (trimmedName.length > 4) {
      suggestions.push(trimmedName.substring(0, trimmedName.length - 1));
      if (trimmedName.length > 6) {
        suggestions.push(trimmedName.substring(0, trimmedName.length - 2));
      }
    }

    // Remove duplicates and return first 5 suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }

  private generateEmailSearchSuggestions(email: string): string[] {
    const suggestions: string[] = [];
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes('@')) {
      // If no @ symbol, suggest adding common academic domains
      const academicDomains = [
        'gmail.com', 'university.edu', 'ac.uk', 'edu', 'ac.in', 'ac.jp'
      ];
      academicDomains.forEach(domain => {
        suggestions.push(`${trimmedEmail}@${domain}`);
      });
      return suggestions.slice(0, 5);
    }

    const [localPart, domain] = trimmedEmail.split('@');
    
    if (localPart && domain) {
      // Suggest common academic domains
      const academicDomains = [
        'edu', 'ac.uk', 'ac.in', 'ac.jp', 'ac.au', 'ac.ca',
        'university.edu', 'college.edu', 'research.org'
      ];
      
      academicDomains.forEach(acadDomain => {
        if (!domain.includes(acadDomain)) {
          suggestions.push(`${localPart}@${acadDomain}`);
        }
      });

      // Suggest variations of the local part
      if (localPart.includes('.')) {
        const withoutDots = localPart.replace(/\./g, '');
        suggestions.push(`${withoutDots}@${domain}`);
      } else if (localPart.length > 6) {
        // Add dots between potential name parts
        const midPoint = Math.floor(localPart.length / 2);
        const withDot = localPart.substring(0, midPoint) + '.' + localPart.substring(midPoint);
        suggestions.push(`${withDot}@${domain}`);
      }

      // Suggest common variations
      if (!localPart.includes('_')) {
        suggestions.push(`${localPart.replace(/\./g, '_')}@${domain}`);
      }
    }

    // Remove duplicates and return first 5 suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }

  private generateNameSuggestions(searchTerm: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const nameParts = searchTerm.trim().split(/\s+/);

    if (nameParts.length > 1) {
      // Name order variations
      suggestions.push({
        term: nameParts.reverse().join(' '),
        type: 'name_variation',
        confidence: 0.8,
      });

      // Initial variations
      const initials = nameParts.slice(0, -1).map(part => part.charAt(0).toUpperCase()).join('. ');
      const lastName = nameParts[nameParts.length - 1];
      suggestions.push({
        term: `${initials}. ${lastName}`,
        type: 'name_variation',
        confidence: 0.7,
      });
    }

    // Partial matches
    if (searchTerm.length > 4) {
      suggestions.push({
        term: searchTerm.substring(0, searchTerm.length - 1),
        type: 'partial_match',
        confidence: 0.6,
      });
    }

    return suggestions.slice(0, 5);
  }

  private generateEmailSuggestions(searchTerm: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    
    if (searchTerm.includes('@')) {
      const [localPart, domain] = searchTerm.split('@');
      
      // Domain variations
      const academicDomains = ['edu', 'ac.uk', 'university.edu'];
      academicDomains.forEach(acadDomain => {
        if (domain && !domain.includes(acadDomain)) {
          suggestions.push({
            term: `${localPart}@${acadDomain}`,
            type: 'email_variation',
            confidence: 0.7,
          });
        }
      });
    }

    return suggestions.slice(0, 3);
  }

  private deduplicateAuthors(authors: Author[]): Author[] {
    const uniqueAuthors = new Map<string, Author>();
    
    authors.forEach(author => {
      // Use email as primary key, fallback to name
      const key = author.email || author.name.toLowerCase();
      
      // Keep the author with higher publication count if duplicate
      if (!uniqueAuthors.has(key) || 
          author.publicationCount > uniqueAuthors.get(key)!.publicationCount) {
        uniqueAuthors.set(key, author);
      }
    });

    return Array.from(uniqueAuthors.values());
  }
}