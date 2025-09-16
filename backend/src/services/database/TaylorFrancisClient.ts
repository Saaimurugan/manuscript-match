import { DatabaseClient, DatabaseSearchOptions, DatabaseSearchResult } from './DatabaseClient';
import { Author, DatabaseType, SearchTerms, Affiliation } from '../../types';

interface TaylorFrancisSearchResponse {
  message: {
    'total-results': number;
    'items-per-page': number;
    query: {
      'start-index': number;
      'search-terms': string;
    };
    items: TaylorFrancisArticle[];
  };
}

interface TaylorFrancisArticle {
  DOI: string;
  title: string[];
  author: TaylorFrancisAuthor[];
  'container-title': string[];
  published: {
    'date-parts': number[][];
  };
  'is-referenced-by-count': number;
  subject: string[];
  publisher: string;
}

interface TaylorFrancisAuthor {
  given: string;
  family: string;
  sequence: string;
  affiliation: TaylorFrancisAffiliation[];
  ORCID?: string;
}

interface TaylorFrancisAffiliation {
  name: string;
  place?: string[];
}

export class TaylorFrancisClient extends DatabaseClient {
  private readonly searchUrl = 'https://api.crossref.org/works';
  private readonly memberPrefix = '301'; // Taylor & Francis's Crossref member ID

  constructor() {
    super(DatabaseType.TAYLOR_FRANCIS, 'https://api.crossref.org/', undefined, 1000); // 1 request per second to be polite
  }

  async searchAuthors(
    searchTerms: SearchTerms,
    options: DatabaseSearchOptions = {}
  ): Promise<DatabaseSearchResult> {
    const startTime = Date.now();
    const maxResults = Math.min(options.maxResults || 100, 1000); // Crossref API limit
    const offset = options.offset || 0;

    try {
      const query = searchTerms.booleanQueries[DatabaseType.TAYLOR_FRANCIS] || 
                   this.constructTaylorFrancisQuery(searchTerms);

      const searchResponse = await this.searchCrossref(query, maxResults, offset);
      const articles = searchResponse.message.items || [];

      if (articles.length === 0) {
        return {
          database: DatabaseType.TAYLOR_FRANCIS,
          authors: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          hasMore: false,
        };
      }

      // Extract unique authors from publications
      const authorsMap = new Map<string, {
        author: TaylorFrancisAuthor;
        publicationCount: number;
        totalCitations: number;
        recentTitles: string[];
        subjects: Set<string>;
        journals: Set<string>;
      }>();
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            const authorKey = `${author.family}-${author.given}`.toLowerCase();
            const citations = article['is-referenced-by-count'] || 0;
            const subjects = article.subject || [];
            const journal = article['container-title']?.[0] || '';
            
            if (!authorsMap.has(authorKey)) {
              authorsMap.set(authorKey, {
                author,
                publicationCount: 1,
                totalCitations: citations,
                recentTitles: [article.title[0] || ''],
                subjects: new Set(subjects),
                journals: new Set([journal]),
              });
            } else {
              const existing = authorsMap.get(authorKey)!;
              existing.publicationCount++;
              existing.totalCitations += citations;
              existing.recentTitles.push(article.title[0] || '');
              subjects.forEach(subject => existing.subjects.add(subject));
              if (journal) existing.journals.add(journal);
            }
          }
        }
      }

      // Convert to Author objects
      const authors = Array.from(authorsMap.values()).map(authorData => 
        this.convertTaylorFrancisAuthorToAuthor(authorData)
      );

      const totalFound = searchResponse.message['total-results'];
      const hasMore = offset + articles.length < totalFound;

      const result: DatabaseSearchResult = {
        database: DatabaseType.TAYLOR_FRANCIS,
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
      throw new Error(`Taylor & Francis search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchByName(name: string, options: DatabaseSearchOptions = {}): Promise<Author[]> {
    const maxResults = options.maxResults || 50;
    
    try {
      const query = `author:${name}`;
      const searchResponse = await this.searchCrossref(query, maxResults);
      const articles = searchResponse.message.items || [];

      const authorsMap = new Map<string, {
        author: TaylorFrancisAuthor;
        publicationCount: number;
        totalCitations: number;
        recentTitles: string[];
        subjects: Set<string>;
        journals: Set<string>;
      }>();
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            const fullName = `${author.given} ${author.family}`;
            if (fullName.toLowerCase().includes(name.toLowerCase())) {
              const authorKey = `${author.family}-${author.given}`.toLowerCase();
              const citations = article['is-referenced-by-count'] || 0;
              const subjects = article.subject || [];
              const journal = article['container-title']?.[0] || '';
              
              if (!authorsMap.has(authorKey)) {
                authorsMap.set(authorKey, {
                  author,
                  publicationCount: 1,
                  totalCitations: citations,
                  recentTitles: [article.title[0] || ''],
                  subjects: new Set(subjects),
                  journals: new Set([journal]),
                });
              } else {
                const existing = authorsMap.get(authorKey)!;
                existing.publicationCount++;
                existing.totalCitations += citations;
                existing.recentTitles.push(article.title[0] || '');
                subjects.forEach(subject => existing.subjects.add(subject));
                if (journal) existing.journals.add(journal);
              }
            }
          }
        }
      }

      return Array.from(authorsMap.values()).map(authorData => 
        this.convertTaylorFrancisAuthorToAuthor(authorData)
      );

    } catch (error) {
      console.error(`Taylor & Francis name search failed for "${name}":`, error);
      return [];
    }
  }

  async searchByEmail(email: string): Promise<Author[]> {
    // Crossref/Taylor & Francis doesn't typically index email addresses
    // This would require institutional affiliation matching
    try {
      const domain = email.split('@')[1];
      if (!domain) {
        return [];
      }
      
      const institutionName = domain.split('.')[0]; // Very simplified approach
      if (!institutionName) {
        return [];
      }
      
      const query = `affiliation:${institutionName}`;
      const searchResponse = await this.searchCrossref(query, 20);
      const articles = searchResponse.message.items || [];

      const authors: Author[] = [];
      
      for (const article of articles) {
        if (article.author) {
          for (const author of article.author) {
            // Check if any affiliation matches the domain
            const hasMatchingAffiliation = author.affiliation?.some(aff => 
              aff.name && aff.name.toLowerCase().includes(institutionName.toLowerCase())
            );
            
            if (hasMatchingAffiliation) {
              authors.push(this.convertTaylorFrancisAuthorToAuthor({
                author,
                publicationCount: 1,
                totalCitations: article['is-referenced-by-count'] || 0,
                recentTitles: [article.title[0] || ''],
                subjects: new Set(article.subject || []),
                journals: new Set([article['container-title']?.[0] || '']),
              }));
            }
          }
        }
      }

      return authors.slice(0, 10); // Limit results

    } catch (error) {
      console.error(`Taylor & Francis email search failed for "${email}":`, error);
      return [];
    }
  }

  async getAuthorProfile(authorId: string): Promise<Author | null> {
    try {
      // Extract author name from ID (simplified approach)
      const authorName = Buffer.from(authorId.replace('taylor_francis-', ''), 'base64').toString();
      const authors = await this.searchByName(authorName, { maxResults: 1 });
      return authors.length > 0 ? (authors[0] || null) : null;

    } catch (error) {
      console.error(`Failed to get Taylor & Francis author profile for ${authorId}:`, error);
      return null;
    }
  }

  private async searchCrossref(
    query: string,
    maxResults: number,
    offset = 0
  ): Promise<TaylorFrancisSearchResponse> {
    await this.delay(this.rateLimitDelay);

    const params = new URLSearchParams({
      query: query,
      rows: Math.min(maxResults, 1000).toString(),
      offset: offset.toString(),
      sort: 'relevance',
      member: this.memberPrefix, // Filter to Taylor & Francis publications
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

    return response.json() as Promise<TaylorFrancisSearchResponse>;
  }

  private constructTaylorFrancisQuery(searchTerms: SearchTerms): string {
    // Construct a query using title and abstract fields
    const keywordQueries = searchTerms.keywords.map(keyword => `title:${keyword} OR abstract:${keyword}`);
    return keywordQueries.join(' OR ');
  }

  private convertTaylorFrancisAuthorToAuthor(authorData: {
    author: TaylorFrancisAuthor;
    publicationCount: number;
    totalCitations: number;
    recentTitles: string[];
    subjects: Set<string>;
    journals: Set<string>;
  }): Author {
    const { author, publicationCount, subjects, journals } = authorData;
    const fullName = `${author.given} ${author.family}`;
    
    const affiliations: Affiliation[] = (author.affiliation || []).map((aff, index) => ({
      id: `taylor_francis-aff-${index}-${Buffer.from(aff.name).toString('base64').slice(0, 8)}`,
      institutionName: aff.name,
      address: aff.place?.join(', ') || '',
      country: '', // Crossref doesn't always provide country info
    }));

    // Combine subjects and journal names as research areas
    const researchAreas = [
      ...Array.from(subjects).slice(0, 5),
      ...Array.from(journals).slice(0, 3)
    ].filter(Boolean);

    const result: Author = {
      id: this.generateAuthorId(fullName, author.ORCID),
      name: fullName,
      affiliations,
      publicationCount,
      clinicalTrials: 0, // Would need additional queries
      retractions: 0, // Would need additional queries
      researchAreas,
      meshTerms: [], // Crossref doesn't provide MeSH terms
    };

    // Add email if ORCID is available
    if (author.ORCID) {
      result.email = `${author.ORCID}@orcid.org`;
    }

    return result;
  }
}