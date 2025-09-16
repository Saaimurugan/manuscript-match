import { DatabaseClient, DatabaseSearchOptions, DatabaseSearchResult } from './DatabaseClient';
import { Author, DatabaseType, SearchTerms, Affiliation } from '../../types';

interface PubMedSearchResponse {
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
  };
}

interface PubMedSummaryResponse {
  result: {
    [pmid: string]: {
      uid: string;
      title: string;
      authors: Array<{
        name: string;
        authtype: string;
        clusterid?: string;
      }>;
      source: string;
      pubdate: string;
      epubdate: string;
      volume: string;
      issue: string;
      pages: string;
      articleids: Array<{
        idtype: string;
        value: string;
      }>;
      fulljournalname: string;
    };
  };
}

interface PubMedAuthorDetails {
  name: string;
  affiliations: string[];
  publicationCount: number;
  recentPublications: string[];
  meshTerms: string[];
}

export class PubMedClient extends DatabaseClient {
  private readonly eSearchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
  private readonly eSummaryUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
  // private readonly eFetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

  constructor(apiKey?: string) {
    super(DatabaseType.PUBMED, 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', apiKey, 334); // NCBI rate limit: 3 requests per second
  }

  async searchAuthors(
    searchTerms: SearchTerms,
    options: DatabaseSearchOptions = {}
  ): Promise<DatabaseSearchResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || 100;
    const offset = options.offset || 0;

    try {
      // Use the boolean query for PubMed if available, otherwise construct from keywords
      const query = searchTerms.booleanQueries[DatabaseType.PUBMED] || 
                   this.constructPubMedQuery(searchTerms);

      // Search for publications
      const searchResponse = await this.searchPublications(query, maxResults, offset);
      const pmids = searchResponse.esearchresult.idlist;

      if (pmids.length === 0) {
        return {
          database: DatabaseType.PUBMED,
          authors: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          hasMore: false,
        };
      }

      // Get publication summaries
      const summaries = await this.getPublicationSummaries(pmids);
      
      // Extract unique authors from publications
      const authorsMap = new Map<string, PubMedAuthorDetails>();
      
      for (const pmid of pmids) {
        const publication = summaries.result[pmid];
        if (publication && publication.authors) {
          for (const pubAuthor of publication.authors) {
            if (pubAuthor.authtype === 'Author') {
              const authorKey = pubAuthor.name.toLowerCase();
              if (!authorsMap.has(authorKey)) {
                authorsMap.set(authorKey, {
                  name: pubAuthor.name,
                  affiliations: [],
                  publicationCount: 1,
                  recentPublications: [publication.title],
                  meshTerms: [],
                });
              } else {
                const existing = authorsMap.get(authorKey)!;
                existing.publicationCount++;
                existing.recentPublications.push(publication.title);
              }
            }
          }
        }
      }

      // Convert to Author objects
      const authors = await Promise.all(
        Array.from(authorsMap.entries()).map(([_, details]) => 
          this.convertToAuthor(details)
        )
      );

      const totalFound = parseInt(searchResponse.esearchresult.count);
      const hasMore = offset + pmids.length < totalFound;

      return {
        database: DatabaseType.PUBMED,
        authors,
        totalFound,
        searchTime: Date.now() - startTime,
        hasMore,
        ...(hasMore && { nextOffset: offset + pmids.length }),
      };

    } catch (error) {
      throw new Error(`PubMed search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchByName(name: string, options: DatabaseSearchOptions = {}): Promise<Author[]> {
    const maxResults = options.maxResults || 50;
    
    try {
      // Search for publications by author name
      const query = `${name}[Author]`;
      const searchResponse = await this.searchPublications(query, maxResults);
      const pmids = searchResponse.esearchresult.idlist;

      if (pmids.length === 0) {
        return [];
      }

      const summaries = await this.getPublicationSummaries(pmids);
      const authorDetails = this.extractAuthorFromPublications(name, summaries, pmids);
      
      return authorDetails ? [await this.convertToAuthor(authorDetails)] : [];

    } catch (error) {
      console.error(`PubMed name search failed for "${name}":`, error);
      return [];
    }
  }

  async searchByEmail(email: string): Promise<Author[]> {
    // PubMed doesn't typically index email addresses directly
    // This is a placeholder implementation
    try {
      const query = `${email}[Affiliation]`;
      const searchResponse = await this.searchPublications(query, 10);
      
      if (searchResponse.esearchresult.idlist.length === 0) {
        return [];
      }

      // This would require more sophisticated parsing of affiliation data
      // For now, return empty array as PubMed email search is limited
      return [];

    } catch (error) {
      console.error(`PubMed email search failed for "${email}":`, error);
      return [];
    }
  }

  async getAuthorProfile(authorId: string): Promise<Author | null> {
    // Extract author name from the ID (simplified approach)
    const authorName = Buffer.from(authorId.replace('pubmed-', ''), 'base64').toString();
    const authors = await this.searchByName(authorName);
    return authors.length > 0 ? (authors[0] || null) : null;
  }

  private async searchPublications(
    query: string,
    maxResults: number,
    offset = 0
  ): Promise<PubMedSearchResponse> {
    await this.delay(this.rateLimitDelay);

    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: maxResults.toString(),
      retstart: offset.toString(),
      retmode: 'json',
      sort: 'relevance',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const response = await fetch(`${this.eSearchUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`PubMed search failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<PubMedSearchResponse>;
  }

  private async getPublicationSummaries(pmids: string[]): Promise<PubMedSummaryResponse> {
    await this.delay(this.rateLimitDelay);

    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    });

    if (this.apiKey) {
      params.append('api_key', this.apiKey);
    }

    const response = await fetch(`${this.eSummaryUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`PubMed summary fetch failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<PubMedSummaryResponse>;
  }

  private constructPubMedQuery(searchTerms: SearchTerms): string {
    const keywordQueries = searchTerms.keywords.map(keyword => `${keyword}[Title/Abstract]`);
    const meshQueries = searchTerms.meshTerms.map(term => `${term}[MeSH Terms]`);
    
    const allQueries = [...keywordQueries, ...meshQueries];
    return allQueries.join(' OR ');
  }

  private extractAuthorFromPublications(
    targetName: string,
    summaries: PubMedSummaryResponse,
    pmids: string[]
  ): PubMedAuthorDetails | null {
    const targetNameLower = targetName.toLowerCase();
    let bestMatch: PubMedAuthorDetails | null = null;
    let maxPublications = 0;

    for (const pmid of pmids) {
      const publication = summaries.result[pmid];
      if (publication && publication.authors) {
        for (const author of publication.authors) {
          if (author.authtype === 'Author' && 
              author.name.toLowerCase().includes(targetNameLower)) {
            
            if (!bestMatch || bestMatch.name !== author.name) {
              const details: PubMedAuthorDetails = {
                name: author.name,
                affiliations: [],
                publicationCount: 1,
                recentPublications: [publication.title],
                meshTerms: [],
              };
              
              if (!bestMatch || details.publicationCount > maxPublications) {
                bestMatch = details;
                maxPublications = details.publicationCount;
              }
            } else if (bestMatch.name === author.name) {
              bestMatch.publicationCount++;
              bestMatch.recentPublications.push(publication.title);
            }
          }
        }
      }
    }

    return bestMatch;
  }

  private async convertToAuthor(details: PubMedAuthorDetails): Promise<Author> {
    const affiliations: Affiliation[] = details.affiliations.map((affName, index) => ({
      id: `pubmed-aff-${index}-${Buffer.from(affName).toString('base64').slice(0, 8)}`,
      institutionName: affName,
      address: '',
      country: '',
    }));

    return {
      id: this.generateAuthorId(details.name),
      name: details.name,
      affiliations,
      publicationCount: details.publicationCount,
      clinicalTrials: 0, // PubMed doesn't directly provide this
      retractions: 0, // Would need additional queries to retraction databases
      researchAreas: details.recentPublications.slice(0, 5), // Use recent publication titles as research areas
      meshTerms: details.meshTerms,
    };
  }
}