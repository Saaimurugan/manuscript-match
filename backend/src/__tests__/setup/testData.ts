import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ProcessStatus, ProcessStep } from '../../types';

export interface TestUser {
  id: string;
  email: string;
  passwordHash: string;
}

export interface TestUserWithToken {
  user: TestUser;
  token: string;
}

export async function createTestUser(
  prisma: PrismaClient,
  email: string = 'test@example.com',
  password: string = 'testpassword123'
): Promise<TestUserWithToken> {
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'USER',
    },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env['JWT_SECRET']!,
    { expiresIn: '1h' }
  );

  return { user, token };
}

export async function createTestProcess(
  prisma: PrismaClient,
  userId: string,
  title: string = 'Test Process'
) {
  return prisma.process.create({
    data: {
      userId,
      title,
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
      metadata: JSON.stringify({
        manuscriptTitle: title,
        createdAt: new Date().toISOString(),
      }),
    },
  });
}

export async function createTestActivityLog(
  prisma: PrismaClient,
  data: {
    userId: string;
    processId?: string;
    action: string;
    details?: string;
  }
) {
  return prisma.activityLog.create({
    data: {
      id: uuidv4(),
      userId: data.userId,
      processId: data.processId || null,
      action: data.action,
      details: data.details || null,
      timestamp: new Date(),
    },
  });
}

export async function createTestAuthor(
  prisma: PrismaClient,
  data: {
    name: string;
    email?: string;
    publicationCount?: number;
    clinicalTrials?: number;
    retractions?: number;
  }
) {
  return prisma.author.create({
    data: {
      name: data.name,
      email: data.email,
      publicationCount: data.publicationCount || 0,
      clinicalTrials: data.clinicalTrials || 0,
      retractions: data.retractions || 0,
      researchAreas: JSON.stringify(['test research area']),
      meshTerms: JSON.stringify(['test mesh term']),
    },
  });
}

export async function createTestAffiliation(
  prisma: PrismaClient,
  data: {
    institutionName: string;
    department?: string;
    address?: string;
    country?: string;
  }
) {
  return prisma.affiliation.create({
    data: {
      institutionName: data.institutionName,
      department: data.department,
      address: data.address || 'Test Address',
      country: data.country || 'Test Country',
    },
  });
}

export async function createTestProcessAuthor(
  prisma: PrismaClient,
  data: {
    processId: string;
    authorId: string;
    role: string;
    validationStatus?: string;
  }
) {
  return prisma.processAuthor.create({
    data: {
      processId: data.processId,
      authorId: data.authorId,
      role: data.role,
      validationStatus: data.validationStatus,
    },
  });
}

export async function createTestShortlist(
  prisma: PrismaClient,
  data: {
    processId: string;
    name: string;
  }
) {
  return prisma.shortlist.create({
    data: {
      processId: data.processId,
      name: data.name,
    },
  });
}

export async function cleanupTestData(prisma: PrismaClient) {
  // Clean up in reverse dependency order
  await prisma.activityLog.deleteMany();
  await prisma.shortlist.deleteMany();
  await prisma.processAuthor.deleteMany();
  await prisma.authorAffiliation.deleteMany();
  await prisma.process.deleteMany();
  await prisma.author.deleteMany();
  await prisma.affiliation.deleteMany();
  await prisma.user.deleteMany();
}