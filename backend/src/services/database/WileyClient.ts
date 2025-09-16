import { DatabaseClient, DatabaseSearchOptions, DatabaseSearchResult } from './DatabaseClient';
import { Author, DatabaseType, SearchTerms, Affiliation } from '../../types';

interface WileySearchResponse {
  message: {
    'total-results': number;
    'items-per-page': number;
    query: {
      'start-index': number;
      'search-terms': string;
    };
    items: WileyArticle[];
  };
}

interface WileyArticle {
  DOI: string;
  title: string[];
  author: WileyAuthor[];
  'container-title': string[];
  published: {
    'date-parts': number[][];
  };
  'is-referenced-by-count': number;
  subject: string[];
}

interface WileyAuthor {
  given: string;
  family: string;
  sequence: string;
  affiliation: WileyAffiliation[];
  ORCID?: string;
}

interface WileyAffiliation {
  name: string;
  place?: string[];
}

// interface WileyAuthorWorks {
//   message: {
//     'total-results': number;
//     items: WileyArticle[];
//   };
// }

export class WileyClient extends DatabaseClient {
  private readonly searchUrl = 'https://api.crossref.org/works';
  private readonly memberPrefix = '311'; // Wiley's Crossref member ID

  constructor() {
    super(DatabaseType.WILEY, 'https://api.crossref.org/', undefined, 1000); // 1 request per second to be polite
  }

  async searchAuthors(
    searchTerms: SearchTerms,
    options: DatabaseSearchOptions = {}
  ): Promise<DatabaseSearchResult> {
    const startTime = Date.now();
    const maxResults = Math.min(options.maxResults || 100, 1000); // Crossref API limit
    const offset = options.offset || 0;

    try {
      const query = searchTerms.booleanQueries[DatabaseType.WILEY] || 
                   this.constructWileyQuery(searchTerms);

      const searchResponse = await this.searchCrossref(query, maxResults, offset);
      const articles = searchResponse.message.items || [];

      if (articles.length === 0) {
        return {
          database: DatabaseType.WILEY,
          authors: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          hasMore: false,
        };
      }

      // Extract unique authors from publications
      const authorsMap = new Map<string, {
        author: WileyAuthor;
        publicationCount: number;
        totalCitations: number;
        recentTitles: string[];
        subjects: Set<string>;
      }>();
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            const authorKey = `${author.family}-${author.given}`.toLowerCase();
            const citations = article['is-referenced-by-count'] || 0;
            const subjects = article.subject || [];
            
            if (!authorsMap.has(authorKey)) {
              authorsMap.set(authorKey, {
                author,
                publicationCount: 1,
                totalCitations: citations,
                recentTitles: [article.title[0] || ''],
                subjects: new Set(subjects),
              });
            } else {
              const existing = authorsMap.get(authorKey)!;
              existing.publicationCount++;
              existing.totalCitations += citations;
              existing.recentTitles.push(article.title[0] || '');
              subjects.forEach(subject => existing.subjects.add(subject));
            }
          }
        }
      }

      // Convert to Author objects
      const authors = Array.from(authorsMap.values()).map(authorData => 
        this.convertWileyAuthorToAuthor(authorData)
      );

      const totalFound = searchResponse.message['total-results'];
      const hasMore = offset + articles.length < totalFound;

      const result: DatabaseSearchResult = {
        database: DatabaseType.WILEY,
        authors,
        totalFound,
        searchTime: Date.now() - startTime,
        hasMore,
      };

      if (hasMore) {
        result.nextOffset = offset + articles.length;
      }

      return result;

    } catch (error) {
      throw new Error(`Wiley search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchByName(name: string, options: DatabaseSearchOptions = {}): Promise<Author[]> {
    const maxResults = options.maxResults || 50;
    
    try {
      const query = `author:${name}`;
      const searchResponse = await this.searchCrossref(query, maxResults);
      const articles = searchResponse.message.items || [];

      const authorsMap = new Map<string, {
        author: WileyAuthor;
        publicationCount: number;
        totalCitations: number;
        recentTitles: string[];
        subjects: Set<string>;
      }>();
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            const fullName = `${author.given} ${author.family}`;
            if (fullName.toLowerCase().includes(name.toLowerCase())) {
              const authorKey = `${author.family}-${author.given}`.toLowerCase();
              const citations = article['is-referenced-by-count'] || 0;
              const subjects = article.subject || [];
              
              if (!authorsMap.has(authorKey)) {
                authorsMap.set(authorKey, {
                  author,
                  publicationCount: 1,
                  totalCitations: citations,
                  recentTitles: [article.title[0] || ''],
                  subjects: new Set(subjects),
                });
              } else {
                const existing = authorsMap.get(authorKey)!;
                existing.publicationCount++;
                existing.totalCitations += citations;
                existing.recentTitles.push(article.title[0] || '');
                subjects.forEach(subject => existing.subjects.add(subject));
              }
            }
          }
        }
      }

      return Array.from(authorsMap.values()).map(authorData => 
        this.convertWileyAuthorToAuthor(authorData)
      );

    } catch (error) {
      console.error(`Wiley name search failed for "${name}":`, error);
      return [];
    }
  }

  async searchByEmail(email: string): Promise<Author[]> {
    // Crossref/Wiley doesn't typically index email addresses
    // This would require institutional affiliation matching
    try {
      const domain = email.split('@')[1];
      const institutionName = domain?.split('.')[0]; // Very simplified approach
      
      const query = `affiliation:${institutionName}`;
      const searchResponse = await this.searchCrossref(query, 20);
      const articles = searchResponse.message.items || [];

      const authors: Author[] = [];
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            // Check if any affiliation matches the domain
            const hasMatchingAffiliation = institutionName && author.affiliation?.some(aff => 
              aff.name.toLowerCase().includes(institutionName.toLowerCase())
            );
            
            if (hasMatchingAffiliation) {
              authors.push(this.convertWileyAuthorToAuthor({
                author,
                publicationCount: 1,
                totalCitations: article['is-referenced-by-count'] || 0,
                recentTitles: [article.title[0] || ''],
                subjects: new Set(article.subject || []),
              }));
            }
          }
        }
      }

      return authors.slice(0, 10); // Limit results

    } catch (error) {
      console.error(`Wiley email search failed for "${email}":`, error);
      return [];
    }
  }

  async getAuthorProfile(authorId: string): Promise<Author | null> {
    try {
      // Extract author name from ID (simplified approach)
      const authorName = Buffer.from(authorId.replace('wiley-', ''), 'base64').toString();
      const authors = await this.searchByName(authorName, { maxResults: 1 });
      return authors.length > 0 ? (authors[0] || null) : null;

    } catch (error) {
      console.error(`Failed to get Wiley author profile for ${authorId}:`, error);
      return null;
    }
  }

  private async searchCrossref(
    query: string,
    maxResults: number,
    offset = 0
  ): Promise<WileySearchResponse> {
    await this.delay(this.rateLimitDelay);

    const params = new URLSearchParams({
      query: query,
      rows: Math.min(maxResults, 1000).toString(),
      offset: offset.toString(),
      sort: 'relevance',
      member: this.memberPrefix, // Filter to Wiley publications
    });

    const response = await fetch(`${this.searchUrl}?${params}`, {
      headers: {
        'User-Agent': 'ScholarFinder/1.0 (mailto:support@scholarfinder.com)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Crossref API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<WileySearchResponse>;
  }

  private constructWileyQuery(searchTerms: SearchTerms): string {
    // Construct a query using title and abstract fields
    const keywordQueries = searchTerms.keywords.map(keyword => `title:${keyword} OR abstract:${keyword}`);
    return keywordQueries.join(' OR ');
  }

  private convertWileyAuthorToAuthor(authorData: {
    author: WileyAuthor;
    publicationCount: number;
    totalCitations: number;
    recentTitles: string[];
    subjects: Set<string>;
  }): Author {
    const { author, publicationCount, subjects } = authorData;
    const fullName = `${author.given} ${author.family}`;
    
    const affiliations: Affiliation[] = (author.affiliation || []).map((aff, index) => ({
      id: `wiley-aff-${index}-${Buffer.from(aff.name).toString('base64').slice(0, 8)}`,
      institutionName: aff.name,
      address: aff.place?.join(', ') || '',
      country: '', // Crossref doesn't always provide country info
    }));

    const result: Author = {
      id: this.generateAuthorId(fullName, author.ORCID),
      name: fullName,
      affiliations,
      publicationCount,
      clinicalTrials: 0, // Would need additional queries
      retractions: 0, // Would need additional queries
      researchAreas: Array.from(subjects).slice(0, 10), // Use subjects as research areas
      meshTerms: [], // Crossref doesn't provide MeSH terms
    };

    if (author.ORCID) {
      result.email = `${author.ORCID}@orcid.org`; // Use ORCID as identifier
    }

    return result;
  }
}