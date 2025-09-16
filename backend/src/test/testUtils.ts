import { PrismaClient } from '@prisma/client';
import { Express } from 'express';
import supertest from 'supertest';
import { createTestApp } from '../__tests__/setup/testApp';
import { cleanupTestData, createTestUser, TestUserWithToken } from '../__tests__/setup/testData';

export class TestContext {
  public app: Express;
  public request: supertest.SuperTest<supertest.Test>;
  public prisma: PrismaClient;
  public testUser?: TestUserWithToken;

  constructor() {
    this.app = createTestApp();
    this.request = supertest(this.app);
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db'
        }
      }
    });
  }

  async setup(): Promise<void> {
    await this.prisma.$connect();
    await cleanupTestData(this.prisma);
  }

  async createAuthenticatedUser(email?: string, password?: string): Promise<TestUserWithToken> {
    this.testUser = await createTestUser(this.prisma, email, password);
    return this.testUser;
  }

  async cleanup(): Promise<void> {
    await cleanupTestData(this.prisma);
    await this.prisma.$disconnect();
  }

  getAuthHeaders(token?: string): { Authorization: string } {
    const authToken = token || this.testUser?.token;
    if (!authToken) {
      throw new Error('No authentication token available. Call createAuthenticatedUser() first.');
    }
    return { Authorization: `Bearer ${authToken}` };
  }
}

export function createTestContext(): TestContext {
  return new TestContext();
}

// Performance testing utilities
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

export class PerformanceTracker {
  private metrics: PerformanceMetrics[] = [];

  startTracking(): void {
    this.metrics = [];
  }

  recordMetric(responseTime: number): void {
    this.metrics.push({
      responseTime,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    });
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / this.metrics.length;
  }

  getMaxResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.responseTime));
  }

  getMinResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return Math.min(...this.metrics.map(m => m.responseTime));
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Mock data generators
export const mockManuscriptData = {
  title: 'Test Manuscript Title',
  authors: [
    { name: 'John Doe', email: 'john.doe@university.edu' },
    { name: 'Jane Smith', email: 'jane.smith@research.org' }
  ],
  abstract: 'This is a test abstract for manuscript processing.',
  keywords: ['test', 'manuscript', 'research'],
  primaryFocusAreas: ['Computer Science', 'Machine Learning'],
  secondaryFocusAreas: ['Data Science', 'Artificial Intelligence']
};

export const mockAuthorData = {
  name: 'Dr. Test Author',
  email: 'test.author@university.edu',
  publicationCount: 25,
  clinicalTrials: 3,
  retractions: 0,
  researchAreas: ['Machine Learning', 'Data Science'],
  meshTerms: ['Algorithms', 'Computer Science']
};

export const mockAffiliationData = {
  institutionName: 'Test University',
  department: 'Computer Science Department',
  address: '123 University Ave, Test City, TC 12345',
  country: 'United States'
};

// Database seeding utilities
export async function seedTestDatabase(prisma: PrismaClient): Promise<void> {
  // Create test users
  const users = await Promise.all([
    createTestUser(prisma, 'user1@test.com', 'password123'),
    createTestUser(prisma, 'user2@test.com', 'password123'),
    createTestUser(prisma, 'admin@test.com', 'adminpass123')
  ]);

  // Create test authors
  const authors = await Promise.all([
    prisma.author.create({
      data: {
        name: 'Dr. Alice Johnson',
        email: 'alice.johnson@university.edu',
        publicationCount: 45,
        clinicalTrials: 8,
        retractions: 0,
        researchAreas: JSON.stringify(['Machine Learning', 'Computer Vision']),
        meshTerms: JSON.stringify(['Algorithms', 'Image Processing'])
      }
    }),
    prisma.author.create({
      data: {
        name: 'Prof. Bob Wilson',
        email: 'bob.wilson@research.org',
        publicationCount: 67,
        clinicalTrials: 12,
        retractions: 1,
        researchAreas: JSON.stringify(['Natural Language Processing', 'AI']),
        meshTerms: JSON.stringify(['Language Models', 'Deep Learning'])
      }
    })
  ]);

  // Create test affiliations
  const affiliations = await Promise.all([
    prisma.affiliation.create({
      data: {
        institutionName: 'Stanford University',
        department: 'Computer Science',
        address: 'Stanford, CA 94305',
        country: 'United States'
      }
    }),
    prisma.affiliation.create({
      data: {
        institutionName: 'MIT',
        department: 'CSAIL',
        address: 'Cambridge, MA 02139',
        country: 'United States'
      }
    })
  ]);

  console.log('Test database seeded successfully');
}

// Test file utilities
export function createMockPdfBuffer(): Buffer {
  // Create a minimal PDF buffer for testing
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF Content) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`;
  return Buffer.from(pdfContent);
}

export function createMockWordBuffer(): Buffer {
  // Create a minimal Word document buffer for testing
  return Buffer.from('PK\x03\x04\x14\x00\x00\x00\x08\x00Test Word Document Content');
}