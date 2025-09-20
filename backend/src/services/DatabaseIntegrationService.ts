import { DatabaseClient, DatabaseSearchProgress, DatabaseSearchResult } from './database/DatabaseClient';
import { PubMedClient } from './database/PubMedClient';
import { ElsevierClient } from './database/ElsevierClient';
import { WileyClient } from './database/WileyClient';
import { TaylorFrancisClient } from './database/TaylorFrancisClient';
import { acquireConnection } from '../config/database';
import { Author, DatabaseType, SearchTerms } from '../types';

export interface DatabaseSearchStatus {
  processId: string;
  status: 'pending' | 'searching' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
  totalAuthorsFound: number;
  databases: DatabaseSearchProgress[];
  error?: string;
}

export interface DatabaseIntegrationConfig {
  pubmedApiKey?: string;
  elsevierApiKey?: string;
  enabledDatabases?: DatabaseType[];
  maxResultsPerDatabase?: number;
  searchTimeout?: number; // in milliseconds
}

export class DatabaseIntegrationService {
  private clients: Map<DatabaseType, DatabaseClient>;
  private searchStatuses: Map<string, DatabaseSearchStatus>;
  private config: DatabaseIntegrationConfig;

  constructor(config: DatabaseIntegrationConfig = {}) {
    this.config = {
      enabledDatabases: [
        DatabaseType.PUBMED,
        DatabaseType.ELSEVIER,
        DatabaseType.WILEY,
        DatabaseType.TAYLOR_FRANCIS,
      ],
      maxResultsPerDatabase: 100,
      searchTimeout: 300000, // 5 minutes
      ...config,
    };

    this.clients = new Map();
    this.searchStatuses = new Map();
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize PubMed client
    if (this.config.enabledDatabases?.includes(DatabaseType.PUBMED)) {
      this.clients.set(DatabaseType.PUBMED, new PubMedClient(this.config.pubmedApiKey));
    }

    // Initialize Elsevier client (requires API key)
    if (this.config.enabledDatabases?.includes(DatabaseType.ELSEVIER) && this.config.elsevierApiKey) {
      this.clients.set(DatabaseType.ELSEVIER, new ElsevierClient(this.config.elsevierApiKey));
    }

    // Initialize Wiley client
    if (this.config.enabledDatabases?.includes(DatabaseType.WILEY)) {
      this.clients.set(DatabaseType.WILEY, new WileyClient());
    }

    // Initialize Taylor & Francis client
    if (this.config.enabledDatabases?.includes(DatabaseType.TAYLOR_FRANCIS)) {
      this.clients.set(DatabaseType.TAYLOR_FRANCIS, new TaylorFrancisClient());
    }
  }

  async searchAuthors(
    processId: string,
    searchTerms: SearchTerms
  ): Promise<void> {
    const startTime = new Date();
    
    // Initialize search status
    const searchStatus: DatabaseSearchStatus = {
      processId,
      status: 'searching',
      startTime,
      totalAuthorsFound: 0,
      databases: Array.from(this.clients.keys()).map(database => ({
        database,
        status: 'pending',
        progress: 0,
        authorsFound: 0,
        startTime,
      })),
    };

    this.searchStatuses.set(processId, searchStatus);

    try {
      // Create search promises for all enabled databases
      const searchPromises = Array.from(this.clients.entries()).map(([database, client]) => 
        this.searchDatabase(processId, database, client, searchTerms)
      );

      // Execute searches in parallel with timeout
      const searchResults = await Promise.allSettled(
        searchPromises.map(promise => 
          this.withTimeout(promise, this.config.searchTimeout!)
        )
      );

      // Process results
      let totalAuthorsFound = 0;
      const databases = searchStatus.databases;

      searchResults.forEach((result, index) => {
        const database = Array.from(this.clients.keys())[index];
        const dbProgress = databases.find(db => db.database === database)!;

        if (result.status === 'fulfilled') {
          const searchResult = result.value;
          dbProgress.status = 'completed';
          dbProgress.progress = 100;
          dbProgress.authorsFound = searchResult.authors.length;
          dbProgress.endTime = new Date();
          totalAuthorsFound += searchResult.authors.length;
        } else {
          dbProgress.status = 'error';
          dbProgress.progress = 0;
          dbProgress.error = result.reason?.message || 'Unknown error';
          dbProgress.endTime = new Date();
        }
      });

      // Update final status
      searchStatus.status = 'completed';
      searchStatus.endTime = new Date();
      searchStatus.totalAuthorsFound = totalAuthorsFound;

    } catch (error) {
      searchStatus.status = 'error';
      searchStatus.endTime = new Date();
      searchStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.searchStatuses.set(processId, searchStatus);
  }

  private async searchDatabase(
    processId: string,
    database: DatabaseType,
    client: DatabaseClient,
    searchTerms: SearchTerms
  ): Promise<DatabaseSearchResult> {
    const searchStatus = this.searchStatuses.get(processId);
    if (!searchStatus) {
      throw new Error(`Search status not found for process ${processId}`);
    }

    const dbProgress = searchStatus.databases.find(db => db.database === database);
    if (!dbProgress) {
      throw new Error(`Database progress not found for ${database}`);
    }

    try {
      // Update status to searching
      dbProgress.status = 'searching';
      dbProgress.progress = 10;

      // Perform the search with connection management
      const result = await acquireConnection(async () => {
        return await client.searchAuthors(searchTerms, {
          maxResults: this.config.maxResultsPerDatabase || 100,
        });
      });

      // Update progress
      dbProgress.progress = 90;

      return result;

    } catch (error) {
      dbProgress.status = 'error';
      dbProgress.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async searchByName(name: string, databases?: DatabaseType[]): Promise<Author[]> {
    const targetDatabases = databases || Array.from(this.clients.keys());
    const searchPromises = targetDatabases
      .filter(db => this.clients.has(db))
      .map(async database => {
        try {
          const client = this.clients.get(database)!;
          return await acquireConnection(async () => {
            return await client.searchByName(name);
          });
        } catch (error) {
          console.error(`Search by name failed for ${database}:`, error);
          return [];
        }
      });

    const results = await Promise.allSettled(searchPromises);
    const allAuthors = results
      .filter((result): result is PromiseFulfilledResult<Author[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);

    // Deduplicate authors by name (simple approach)
    const uniqueAuthors = new Map<string, Author>();
    allAuthors.forEach(author => {
      const key = author.name.toLowerCase();
      if (!uniqueAuthors.has(key) || author.publicationCount > uniqueAuthors.get(key)!.publicationCount) {
        uniqueAuthors.set(key, author);
      }
    });

    return Array.from(uniqueAuthors.values());
  }

  async searchByEmail(email: string, databases?: DatabaseType[]): Promise<Author[]> {
    const targetDatabases = databases || Array.from(this.clients.keys());
    const searchPromises = targetDatabases
      .filter(db => this.clients.has(db))
      .map(async database => {
        try {
          const client = this.clients.get(database)!;
          return await client.searchByEmail(email);
        } catch (error) {
          console.error(`Search by email failed for ${database}:`, error);
          return [];
        }
      });

    const results = await Promise.allSettled(searchPromises);
    const allAuthors = results
      .filter((result): result is PromiseFulfilledResult<Author[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);

    // Deduplicate authors by email or name
    const uniqueAuthors = new Map<string, Author>();
    allAuthors.forEach(author => {
      const key = author.email || author.name.toLowerCase();
      if (!uniqueAuthors.has(key) || author.publicationCount > uniqueAuthors.get(key)!.publicationCount) {
        uniqueAuthors.set(key, author);
      }
    });

    return Array.from(uniqueAuthors.values());
  }

  getSearchStatus(processId: string): DatabaseSearchStatus | null {
    return this.searchStatuses.get(processId) || null;
  }

  clearSearchStatus(processId: string): void {
    this.searchStatuses.delete(processId);
  }

  async getAuthorProfile(authorId: string): Promise<Author | null> {
    // Determine which database the author belongs to based on ID prefix
    let database: DatabaseType;
    if (authorId.startsWith('pubmed-')) {
      database = DatabaseType.PUBMED;
    } else if (authorId.startsWith('elsevier-')) {
      database = DatabaseType.ELSEVIER;
    } else if (authorId.startsWith('wiley-')) {
      database = DatabaseType.WILEY;
    } else if (authorId.startsWith('taylor_francis-')) {
      database = DatabaseType.TAYLOR_FRANCIS;
    } else {
      return null;
    }

    const client = this.clients.get(database);
    if (!client) {
      return null;
    }

    try {
      return await client.getAuthorProfile(authorId);
    } catch (error) {
      console.error(`Failed to get author profile for ${authorId}:`, error);
      return null;
    }
  }

  getEnabledDatabases(): DatabaseType[] {
    return Array.from(this.clients.keys());
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Search timeout')), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // Method to get aggregated search results for a process
  async getSearchResults(_processId: string): Promise<Author[]> {
    // This would typically retrieve stored results from the database
    // For now, we'll return an empty array as this would be implemented
    // in conjunction with the repository layer
    return [];
  }
}