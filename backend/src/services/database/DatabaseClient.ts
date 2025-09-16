import { Author, DatabaseType, SearchTerms } from '../../types';

export interface DatabaseSearchOptions {
  maxResults?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'citations';
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface DatabaseSearchResult {
  database: DatabaseType;
  authors: Author[];
  totalFound: number;
  searchTime: number;
  hasMore: boolean;
  nextOffset?: number;
}

export interface DatabaseSearchProgress {
  database: DatabaseType;
  status: 'pending' | 'searching' | 'completed' | 'error';
  progress: number; // 0-100
  authorsFound: number;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export abstract class DatabaseClient {
  protected readonly database: DatabaseType;
  protected readonly baseUrl: string;
  protected readonly apiKey: string | undefined;
  protected readonly rateLimitDelay: number;

  constructor(database: DatabaseType, baseUrl: string, apiKey?: string, rateLimitDelay = 1000) {
    this.database = database;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.rateLimitDelay = rateLimitDelay;
  }

  abstract searchAuthors(
    searchTerms: SearchTerms,
    options?: DatabaseSearchOptions
  ): Promise<DatabaseSearchResult>;

  abstract searchByName(name: string, options?: DatabaseSearchOptions): Promise<Author[]>;

  abstract searchByEmail(email: string): Promise<Author[]>;

  abstract getAuthorProfile(authorId: string): Promise<Author | null>;

  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ScholarFinder/1.0',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`${this.database} API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateAuthorId(name: string, email?: string): string {
    const identifier = email || name.toLowerCase().replace(/\s+/g, '-');
    return `${this.database}-${Buffer.from(identifier).toString('base64').slice(0, 16)}`;
  }

  protected parseAuthorName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: '', lastName: parts[0] || '' };
    }
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  }

  protected extractEmailFromText(text: string): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : undefined;
  }
}