import { DatabaseClient, DatabaseSearchOptions, DatabaseSearchResult } from './DatabaseClient';
import { Author, DatabaseType, SearchTerms, Affiliation } from '../../types';

interface ElsevierSearchResponse {
  'search-results': {
    'opensearch:totalResults': string;
    'opensearch:startIndex': string;
    'opensearch:itemsPerPage': string;
    entry?: ElsevierEntry[];
  };
}

interface ElsevierEntry {
  '@_fa': string;
  'dc:identifier': string;
  'dc:title': string;
  'dc:creator': string;
  'prism:publicationName': string;
  'prism:coverDate': string;
  'citedby-count': string;
  'author': ElsevierAuthor[];
  'affiliation': ElsevierAffiliation[];
}

interface ElsevierAuthor {
  '@_fa': string;
  'author-url': string;
  'authid': string;
  'authname': string;
  'surname': string;
  'given-name': string;
  'initials': string;
  'afid': string[];
}

interface ElsevierAffiliation {
  '@_fa': string;
  'affilname': string;
  'affiliation-city': string;
  'affiliation-country': string;
  'afid': string;
}

interface ElsevierAuthorProfile {
  'author-retrieval-response': {
    'coredata': {
      'dc:identifier': string;
      'eid': string;
      'document-count': string;
      'cited-by-count': string;
      'citation-count': string;
      'h-index': string;
    };
    'author-profile': {
      'preferred-name': {
        'ce:given-name': string;
        'ce:surname': string;
      };
      'name-variant': Array<{
        'ce:given-name': string;
        'ce:surname': string;
      }>;
    };
    'affiliation-current': ElsevierAffiliation[];
    'subject-areas': {
      'subject-area': Array<{
        '@_fa': string;
        '$': string;
        '@code': string;
        '@abbrev': string;
      }>;
    };
  };
}

export class ElsevierClient extends DatabaseClient {
  private readonly searchUrl = 'https://api.elsevier.com/content/search/scopus';
  // private readonly authorUrl = 'https://api.elsevier.com/content/author';

  constructor(apiKey: string) {
    super(DatabaseType.ELSEVIER, 'https://api.elsevier.com/content/', apiKey, 1000); // 1 request per second for free tier
  }

  async searchAuthors(
    searchTerms: SearchTerms,
    options: DatabaseSearchOptions = {}
  ): Promise<DatabaseSearchResult> {
    const startTime = Date.now();
    const maxResults = Math.min(options.maxResults || 100, 200); // Elsevier API limit
    const offset = options.offset || 0;

    try {
      const query = searchTerms.booleanQueries[DatabaseType.ELSEVIER] || 
                   this.constructElsevierQuery(searchTerms);

      const searchResponse = await this.searchScopus(query, maxResults, offset);
      const entries = searchResponse['search-results'].entry || [];

      if (entries.length === 0) {
        return {
          database: DatabaseType.ELSEVIER,
          authors: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          hasMore: false,
        };
      }

      // Extract unique authors from publications
      const authorsMap = new Map<string, ElsevierAuthor & { publicationCount: number; affiliations: ElsevierAffiliation[] }>();
      
      for (const entry of entries) {
        if (entry.author) {
          for (const author of entry.author) {
            const authorKey = `${author.authid}`;
            if (!authorsMap.has(authorKey)) {
              authorsMap.set(authorKey, {
                ...author,
                publicationCount: 1,
                affiliations: entry.affiliation || [],
              });
            } else {
              const existing = authorsMap.get(authorKey)!;
              existing.publicationCount++;
            }
          }
        }
      }

      // Convert to Author objects
      const authors = Array.from(authorsMap.values()).map(authorData => 
        this.convertElsevierAuthorToAuthor(authorData)
      );

      const totalFound = parseInt(searchResponse['search-results']['opensearch:totalResults']);
      const hasMore = offset + entries.length < totalFound;

      const result: DatabaseSearchResult = {
        database: DatabaseType.ELSEVIER,
        authors,
        totalFound,
        searchTime: Date.now() - startTime,
        hasMore,
      };

      if (hasMore) {
        result.nextOffset = offset + entries.length;
      }

      return result;

    } catch (error) {
      throw new Error(`Elsevier search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchByName(name: string, options: DatabaseSearchOptions = {}): Promise<Author[]> {
    const maxResults = options.maxResults || 50;
    
    try {
      const query = `AUTHOR-NAME(${name})`;
      const searchResponse = await this.searchScopus(query, maxResults);
      const entries = searchResponse['search-results'].entry || [];

      const authorsMap = new Map<string, ElsevierAuthor & { publicationCount: number; affiliations: ElsevierAffiliation[] }>();
      
      for (const entry of entries) {
        if (entry.author) {
          for (const author of entry.author) {
            const fullName = `${author['given-name'] || ''} ${author.surname || ''}`.trim();
            if (fullName.toLowerCase().includes(name.toLowerCase())) {
              const authorKey = author.authid;
              if (!authorsMap.has(authorKey)) {
                authorsMap.set(authorKey, {
                  ...author,
                  publicationCount: 1,
                  affiliations: entry.affiliation || [],
                });
              } else {
                const existing = authorsMap.get(authorKey)!;
                existing.publicationCount++;
              }
            }
          }
        }
      }

      return Array.from(authorsMap.values()).map(authorData => 
        this.convertElsevierAuthorToAuthor(authorData)
      );

    } catch (error) {
      console.error(`Elsevier name search failed for "${name}":`, error);
      return [];
    }
  }

  async searchByEmail(email: string): Promise<Author[]> {
    // Elsevier/Scopus doesn't typically index email addresses directly
    // This would require institutional affiliation matching
    try {
      const domain = email.split('@')[1];
      const query = `AFFIL(${domain})`;
      
      const searchResponse = await this.searchScopus(query, 20);
      const entries = searchResponse['search-results'].entry || [];

      // This is a simplified approach - in practice, you'd need more sophisticated matching
      const authors: Author[] = [];
      
      for (const entry of entries) {
        if (entry.author) {
          for (const author of entry.author) {
            authors.push(this.convertElsevierAuthorToAuthor({
              ...author,
              publicationCount: 1,
              affiliations: entry.affiliation || [],
            }));
          }
        }
      }

      return authors.slice(0, 10); // Limit results

    } catch (error) {
      console.error(`Elsevier email search failed for "${email}":`, error);
      return [];
    }
  }

  async getAuthorProfile(authorId: string): Promise<Author | null> {
    try {
      const elsevierAuthorId = authorId.replace('elsevier-', '');
      const response = await this.makeRequest<ElsevierAuthorProfile>(
        `/author/author_id/${elsevierAuthorId}`,
        {
          headers: {
            'X-ELS-APIKey': this.apiKey!,
            'Accept': 'application/json',
          },
        }
      );

      return this.convertElsevierProfileToAuthor(response);

    } catch (error) {
      console.error(`Failed to get Elsevier author profile for ${authorId}:`, error);
      return null;
    }
  }

  private async searchScopus(
    query: string,
    maxResults: number,
    offset = 0
  ): Promise<ElsevierSearchResponse> {
    await this.delay(this.rateLimitDelay);

    const params = new URLSearchParams({
      query: query,
      count: Math.min(maxResults, 200).toString(), // Elsevier API limit
      start: offset.toString(),
      sort: 'relevancy',
      field: 'dc:identifier,dc:title,dc:creator,prism:publicationName,prism:coverDate,citedby-count,author,affiliation',
    });

    const response = await fetch(`${this.searchUrl}?${params}`, {
      headers: {
        'X-ELS-APIKey': this.apiKey!,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Elsevier API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<ElsevierSearchResponse>;
  }

  private constructElsevierQuery(searchTerms: SearchTerms): string {
    const keywordQueries = searchTerms.keywords.map(keyword => `TITLE-ABS-KEY(${keyword})`);
    return keywordQueries.join(' OR ');
  }

  private convertElsevierAuthorToAuthor(
    authorData: ElsevierAuthor & { publicationCount: number; affiliations: ElsevierAffiliation[] }
  ): Author {
    const fullName = `${authorData['given-name'] || ''} ${authorData.surname || ''}`.trim() || authorData.authname;
    
    const affiliations: Affiliation[] = authorData.affiliations.map(aff => ({
      id: `elsevier-aff-${aff.afid}`,
      institutionName: aff.affilname,
      address: aff['affiliation-city'] || '',
      country: aff['affiliation-country'] || '',
    }));

    return {
      id: `elsevier-${authorData.authid}`,
      name: fullName,
      affiliations,
      publicationCount: authorData.publicationCount,
      clinicalTrials: 0, // Would need additional queries
      retractions: 0, // Would need additional queries
      researchAreas: [], // Would need subject area mapping
      meshTerms: [],
    };
  }

  private convertElsevierProfileToAuthor(profile: ElsevierAuthorProfile): Author {
    const coredata = profile['author-retrieval-response'].coredata;
    const authorProfile = profile['author-retrieval-response']['author-profile'];
    
    const fullName = `${authorProfile['preferred-name']['ce:given-name']} ${authorProfile['preferred-name']['ce:surname']}`;
    
    const affiliations: Affiliation[] = (profile['author-retrieval-response']['affiliation-current'] || []).map(aff => ({
      id: `elsevier-aff-${aff.afid}`,
      institutionName: aff.affilname,
      address: aff['affiliation-city'] || '',
      country: aff['affiliation-country'] || '',
    }));

    const subjectAreas = profile['author-retrieval-response']['subject-areas']?.['subject-area'] || [];
    const researchAreas = subjectAreas.map(area => area.$);

    return {
      id: coredata['dc:identifier'].replace('AUTHOR_ID:', 'elsevier-'),
      name: fullName,
      affiliations,
      publicationCount: parseInt(coredata['document-count']) || 0,
      clinicalTrials: 0,
      retractions: 0,
      researchAreas,
      meshTerms: [],
    };
  }
}