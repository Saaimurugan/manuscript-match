import { PrismaClient } from '@prisma/client';
import { ProcessRepository, CreateProcessInput, UpdateProcessInput } from '../repositories/ProcessRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { AuthorRepository } from '../repositories/AuthorRepository';
import { AffiliationRepository } from '../repositories/AffiliationRepository';
import { ProcessAuthorRepository } from '../repositories/ProcessAuthorRepository';
import { ProcessStatus, ProcessStep, ProcessMetadata, PaginatedResponse, ManuscriptMetadata, AuthorRole, KeywordEnhancementResult } from '../types';


export interface ProcessListOptions {
  page?: number;
  limit?: number;
  status?: ProcessStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProcessWithMetadata {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: ProcessStatus;
  currentStep: ProcessStep;
  metadata: ProcessMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProcessService {
  private processRepository: ProcessRepository;
  private activityLogRepository: ActivityLogRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.processRepository = new ProcessRepository(prisma);
    this.activityLogRepository = new ActivityLogRepository(prisma);
  }

  async createProcess(userId: string, data: { title: string; description?: string }): Promise<ProcessWithMetadata> {
    const metadata = data.description ? JSON.stringify({ description: data.description }) : undefined;
    
    const createData: CreateProcessInput = {
      userId,
      title: data.title,
      status: ProcessStatus.CREATED,
      currentStep: ProcessStep.UPLOAD,
      metadata,
    };

    const process = await this.processRepository.create(createData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId: process.id,
      action: 'PROCESS_CREATED',
      details: JSON.stringify({ title: data.title, description: data.description }),
    });

    return this.formatProcess(process);
  }

  async getProcessById(processId: string, userId: string): Promise<ProcessWithMetadata | null> {
    const process = await this.processRepository.findById(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    return this.formatProcess(process);
  }

  async getProcessWithDetails(processId: string, userId: string): Promise<any | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    return {
      ...this.formatProcess(process),
      user: process.user,
      authors: process.processAuthors?.map(pa => ({
        ...pa.author,
        role: pa.role,
        validationStatus: pa.validationStatus ? JSON.parse(pa.validationStatus) : null,
        addedAt: pa.addedAt,
      })) || [],
      shortlists: process.shortlists || [],
      recentActivity: process.activityLogs || [],
    };
  }

  async getUserProcesses(
    userId: string, 
    options: ProcessListOptions = {}
  ): Promise<PaginatedResponse<ProcessWithMetadata>> {
    const { page = 1, limit = 20, status, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    const skip = (page - 1) * limit;

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const findOptions: any = {
      skip,
      take: limit,
    };
    
    if (status) {
      findOptions.status = status;
    }

    const processes = await this.processRepository.findByUserId(userId, findOptions);

    const total = await this.processRepository.countByUserId(userId);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: processes.map(p => this.formatProcess(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async updateProcessStep(
    processId: string, 
    userId: string, 
    step: ProcessStep, 
    status?: ProcessStatus
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const updatedProcess = await this.processRepository.updateStep(processId, step, status);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'STEP_UPDATED',
      details: JSON.stringify({ 
        previousStep: existingProcess.currentStep,
        newStep: step,
        previousStatus: existingProcess.status,
        newStatus: status || existingProcess.status,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async updateProcess(
    processId: string, 
    userId: string, 
    data: UpdateProcessInput & { description?: string }
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    // Handle description by updating metadata
    let updateData: UpdateProcessInput = { ...data };
    if (data.description !== undefined) {
      const existingMetadata = existingProcess.metadata ? JSON.parse(existingProcess.metadata) : {};
      const newMetadata = { ...existingMetadata, description: data.description };
      updateData.metadata = JSON.stringify(newMetadata);
      delete (updateData as any).description; // Remove description from the update data
    }

    const updatedProcess = await this.processRepository.update(processId, updateData);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_UPDATED',
      details: JSON.stringify({ 
        changes: data,
        previousTitle: existingProcess.title,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async deleteProcess(processId: string, userId: string): Promise<boolean> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return false;
    }

    // Log the activity before deletion
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'PROCESS_DELETED',
      details: JSON.stringify({ 
        title: existingProcess.title,
        status: existingProcess.status,
        step: existingProcess.currentStep,
      }),
    });

    await this.processRepository.delete(processId);
    return true;
  }

  async getProcessStats(userId: string): Promise<{
    total: number;
    byStatus: Record<ProcessStatus, number>;
    byStep: Record<ProcessStep, number>;
  }> {
    const processes = await this.processRepository.findByUserId(userId);
    
    const stats = {
      total: processes.length,
      byStatus: {} as Record<ProcessStatus, number>,
      byStep: {} as Record<ProcessStep, number>,
    };

    // Initialize counters
    Object.values(ProcessStatus).forEach(status => {
      stats.byStatus[status] = 0;
    });
    Object.values(ProcessStep).forEach(step => {
      stats.byStep[step] = 0;
    });

    // Count processes
    processes.forEach(process => {
      stats.byStatus[process.status as ProcessStatus]++;
      stats.byStep[process.currentStep as ProcessStep]++;
    });

    return stats;
  }

  async storeManuscriptMetadata(
    processId: string,
    userId: string,
    metadata: ManuscriptMetadata,
    fileName: string
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    // Create process metadata
    const processMetadata: ProcessMetadata = {
      manuscriptTitle: metadata.title,
      uploadedFileName: fileName,
      extractedAt: new Date(),
      totalCandidates: 0,
      validatedCandidates: 0,
    };

    // Update process with metadata
    const updatedProcess = await this.processRepository.update(processId, {
      title: metadata.title || existingProcess.title,
      metadata: JSON.stringify(processMetadata),
    });

    // Store authors and affiliations
    await this.storeAuthorsAndAffiliations(processId, metadata);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'METADATA_EXTRACTED',
      details: JSON.stringify({ 
        fileName,
        title: metadata.title,
        authorCount: metadata.authors.length,
        affiliationCount: metadata.affiliations.length,
        keywordCount: metadata.keywords.length,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  async getProcessMetadata(processId: string, userId: string): Promise<ManuscriptMetadata | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    // Get manuscript authors
    const manuscriptAuthors = process.processAuthors
      ?.filter(pa => pa.role === AuthorRole.MANUSCRIPT_AUTHOR)
      .map(pa => pa.author) || [];

    // Get affiliations from authors
    const affiliations = manuscriptAuthors
      .flatMap(author => author.affiliations || [])
      .filter((affiliation, index, self) => 
        index === self.findIndex(a => a.id === affiliation.id)
      );

    // Extract metadata from process metadata
    const processMetadata = process.metadata ? JSON.parse(process.metadata) : {};

    return {
      title: processMetadata.manuscriptTitle || process.title,
      authors: manuscriptAuthors,
      affiliations,
      abstract: processMetadata.abstract || '',
      keywords: processMetadata.keywords || [],
      primaryFocusAreas: processMetadata.primaryFocusAreas || [],
      secondaryFocusAreas: processMetadata.secondaryFocusAreas || [],
    };
  }

  async updateProcessMetadata(
    processId: string,
    userId: string,
    metadata: ManuscriptMetadata
  ): Promise<ProcessWithMetadata | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    // Update process metadata
    const existingMetadata = existingProcess.metadata ? JSON.parse(existingProcess.metadata) : {};
    const updatedMetadata: ProcessMetadata = {
      ...existingMetadata,
      manuscriptTitle: metadata.title,
      abstract: metadata.abstract,
      keywords: metadata.keywords,
      primaryFocusAreas: metadata.primaryFocusAreas,
      secondaryFocusAreas: metadata.secondaryFocusAreas,
    };

    // Update process
    const updatedProcess = await this.processRepository.update(processId, {
      title: metadata.title,
      metadata: JSON.stringify(updatedMetadata),
    });

    // Update authors and affiliations
    await this.updateAuthorsAndAffiliations(processId, metadata);

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'METADATA_UPDATED',
      details: JSON.stringify({ 
        title: metadata.title,
        authorCount: metadata.authors.length,
        affiliationCount: metadata.affiliations.length,
        keywordCount: metadata.keywords.length,
      }),
    });

    return this.formatProcess(updatedProcess);
  }

  private async storeAuthorsAndAffiliations(
    processId: string,
    metadata: ManuscriptMetadata
  ): Promise<void> {
    const authorRepository = new AuthorRepository(this.prisma);
    const affiliationRepository = new AffiliationRepository(this.prisma);
    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);

    // Store affiliations first
    const affiliationMap = new Map<string, string>();
    for (const affiliation of metadata.affiliations) {
      const storedAffiliation = await affiliationRepository.create({
        institutionName: affiliation.institutionName,
        ...(affiliation.department && { department: affiliation.department }),
        address: affiliation.address,
        country: affiliation.country,
      });
      affiliationMap.set(affiliation.id, storedAffiliation.id);
    }

    // Store authors and link to process
    for (const author of metadata.authors) {
      // Map affiliation IDs
      const mappedAffiliations = author.affiliations.map(affiliation => ({
        ...affiliation,
        id: affiliationMap.get(affiliation.id) || affiliation.id,
      }));

      const storedAuthor = await authorRepository.create({
        name: author.name,
        ...(author.email && { email: author.email }),
        publicationCount: author.publicationCount,
        clinicalTrials: author.clinicalTrials,
        retractions: author.retractions,
        researchAreas: author.researchAreas,
        meshTerms: author.meshTerms,
      });

      // Link author to process as manuscript author
      await processAuthorRepository.create({
        processId,
        authorId: storedAuthor.id,
        role: AuthorRole.MANUSCRIPT_AUTHOR,
      });

      // Link author to affiliations
      for (const affiliation of mappedAffiliations) {
        await authorRepository.addAffiliation(storedAuthor.id, affiliation.id);
      }
    }
  }

  private async updateAuthorsAndAffiliations(
    processId: string,
    metadata: ManuscriptMetadata
  ): Promise<void> {
    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);

    // Remove existing manuscript authors
    await processAuthorRepository.removeByProcessAndRole(processId, AuthorRole.MANUSCRIPT_AUTHOR);

    // Store new authors and affiliations
    await this.storeAuthorsAndAffiliations(processId, metadata);
  }

  async getProcessAuthors(processId: string, userId: string): Promise<any[] | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    // Get manuscript authors with their affiliations
    const manuscriptAuthors = process.processAuthors
      ?.filter(pa => pa.role === AuthorRole.MANUSCRIPT_AUTHOR)
      .map(pa => ({
        id: pa.author.id,
        name: pa.author.name,
        email: pa.author.email,
        publicationCount: pa.author.publicationCount,
        clinicalTrials: pa.author.clinicalTrials,
        retractions: pa.author.retractions,
        researchAreas: pa.author.researchAreas ? JSON.parse(pa.author.researchAreas) : [],
        meshTerms: pa.author.meshTerms ? JSON.parse(pa.author.meshTerms) : [],
        affiliations: pa.author.affiliations?.map((aa: any) => ({
          id: aa.affiliation.id,
          institutionName: aa.affiliation.institutionName,
          department: aa.affiliation.department,
          address: aa.affiliation.address,
          country: aa.affiliation.country,
        })) || [],
        role: pa.role,
        addedAt: pa.addedAt,
      })) || [];

    return manuscriptAuthors;
  }

  async updateProcessAuthors(
    processId: string,
    userId: string,
    authors: any[]
  ): Promise<any[] | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const authorRepository = new AuthorRepository(this.prisma);
    const affiliationRepository = new AffiliationRepository(this.prisma);
    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);

    // Remove existing manuscript authors
    await processAuthorRepository.removeByProcessAndRole(processId, AuthorRole.MANUSCRIPT_AUTHOR);

    // Store updated authors
    const updatedAuthors = [];
    for (const authorData of authors) {
      // Create or update affiliations first
      const affiliationIds = [];
      if (authorData.affiliations && Array.isArray(authorData.affiliations)) {
        for (const affiliationData of authorData.affiliations) {
          const affiliation = await affiliationRepository.findOrCreate({
            institutionName: affiliationData.institutionName,
            department: affiliationData.department,
            address: affiliationData.address,
            country: affiliationData.country,
          });
          affiliationIds.push(affiliation.id);
        }
      }

      // Create or update author
      const author = await authorRepository.findOrCreate({
        name: authorData.name,
        email: authorData.email,
        publicationCount: authorData.publicationCount || 0,
        clinicalTrials: authorData.clinicalTrials || 0,
        retractions: authorData.retractions || 0,
        researchAreas: authorData.researchAreas || [],
        meshTerms: authorData.meshTerms || [],
      });

      // Link author to process
      await processAuthorRepository.create({
        processId,
        authorId: author.id,
        role: AuthorRole.MANUSCRIPT_AUTHOR,
      });

      // Link author to affiliations
      for (const affiliationId of affiliationIds) {
        await authorRepository.addAffiliation(author.id, affiliationId);
      }

      updatedAuthors.push({
        id: author.id,
        name: author.name,
        email: author.email,
        publicationCount: author.publicationCount,
        clinicalTrials: author.clinicalTrials,
        retractions: author.retractions,
        researchAreas: author.researchAreas ? JSON.parse(author.researchAreas) : [],
        meshTerms: author.meshTerms ? JSON.parse(author.meshTerms) : [],
        affiliations: authorData.affiliations || [],
        role: AuthorRole.MANUSCRIPT_AUTHOR,
      });
    }

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'AUTHORS_UPDATED',
      details: JSON.stringify({ 
        authorCount: authors.length,
      }),
    });

    return updatedAuthors;
  }

  async getProcessAffiliations(processId: string, userId: string): Promise<any[] | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    // Get unique affiliations from manuscript authors
    const affiliationsMap = new Map();
    
    process.processAuthors
      ?.filter(pa => pa.role === AuthorRole.MANUSCRIPT_AUTHOR)
      .forEach(pa => {
        pa.author.affiliations?.forEach((aa: any) => {
          const affiliation = aa.affiliation;
          if (!affiliationsMap.has(affiliation.id)) {
            affiliationsMap.set(affiliation.id, {
              id: affiliation.id,
              institutionName: affiliation.institutionName,
              department: affiliation.department,
              address: affiliation.address,
              country: affiliation.country,
            });
          }
        });
      });

    return Array.from(affiliationsMap.values());
  }

  async updateProcessAffiliations(
    processId: string,
    userId: string,
    affiliations: any[]
  ): Promise<any[] | null> {
    const existingProcess = await this.processRepository.findById(processId);
    
    if (!existingProcess || existingProcess.userId !== userId) {
      return null;
    }

    const affiliationRepository = new AffiliationRepository(this.prisma);

    // Update or create affiliations
    const updatedAffiliations = [];
    for (const affiliationData of affiliations) {
      const affiliation = await affiliationRepository.findOrCreate({
        institutionName: affiliationData.institutionName,
        department: affiliationData.department,
        address: affiliationData.address,
        country: affiliationData.country,
      });

      updatedAffiliations.push({
        id: affiliation.id,
        institutionName: affiliation.institutionName,
        department: affiliation.department,
        address: affiliation.address,
        country: affiliation.country,
      });
    }

    // Log the activity
    await this.activityLogRepository.create({
      userId,
      processId,
      action: 'AFFILIATIONS_UPDATED',
      details: JSON.stringify({ 
        affiliationCount: affiliations.length,
      }),
    });

    return updatedAffiliations;
  }

  private formatProcess(process: any): ProcessWithMetadata {
    const metadata = process.metadata ? JSON.parse(process.metadata) : null;
    const description = metadata?.description || undefined;
    
    return {
      id: process.id,
      userId: process.userId,
      title: process.title,
      description,
      status: process.status as ProcessStatus,
      currentStep: process.currentStep as ProcessStep,
      metadata,
      createdAt: process.createdAt,
      updatedAt: process.updatedAt,
    };
  }

  // Keyword Enhancement Methods

  async storeKeywordEnhancement(
    processId: string, 
    userId: string, 
    enhancementResult: KeywordEnhancementResult
  ): Promise<void> {
    // Verify process ownership using existing pattern
    const process = await this.processRepository.findById(processId);
    if (!process || process.userId !== userId) {
      throw new Error('Process not found');
    }

    // Store the keyword enhancement result in the process metadata
    const currentMetadata = process.metadata ? JSON.parse(process.metadata) as ProcessMetadata : {};
    const updatedMetadata: ProcessMetadata = {
      ...currentMetadata,
      keywordEnhancement: enhancementResult
    };

    await this.processRepository.update(processId, {
      metadata: JSON.stringify(updatedMetadata)
    });

    // Log the activity
    await this.activityLogRepository.create({
      processId,
      userId,
      action: 'keyword_enhancement_stored',
      details: JSON.stringify({
        originalKeywords: enhancementResult.originalKeywords.length,
        enhancedKeywords: enhancementResult.enhancedKeywords.length,
        meshTerms: enhancementResult.meshTerms.length,
        selectedKeywords: enhancementResult.selectedKeywords.length
      })
    });
  }

  async getKeywordEnhancement(processId: string, userId: string): Promise<KeywordEnhancementResult | null> {
    const process = await this.processRepository.findById(processId);
    if (!process || process.userId !== userId) {
      return null;
    }

    const metadata = process.metadata ? JSON.parse(process.metadata) as ProcessMetadata : null;
    return metadata?.keywordEnhancement || null;
  }

  // Manual Reviewer Search Methods

  async addManualReviewer(
    processId: string,
    userId: string,
    author: import('../types').Author
  ): Promise<boolean> {
    const process = await this.processRepository.findById(processId);
    if (!process || process.userId !== userId) {
      return false;
    }

    const authorRepository = new AuthorRepository(this.prisma);
    const affiliationRepository = new AffiliationRepository(this.prisma);
    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);

    try {
      // Store affiliations first
      const affiliationIds = [];
      for (const affiliation of author.affiliations) {
        const storedAffiliation = await affiliationRepository.findOrCreate({
          institutionName: affiliation.institutionName,
          ...(affiliation.department && { department: affiliation.department }),
          address: affiliation.address,
          country: affiliation.country,
        });
        affiliationIds.push(storedAffiliation.id);
      }

      // Create or find the author
      const storedAuthor = await authorRepository.findOrCreate({
        name: author.name,
        ...(author.email && { email: author.email }),
        publicationCount: author.publicationCount,
        clinicalTrials: author.clinicalTrials,
        retractions: author.retractions,
        researchAreas: author.researchAreas,
        meshTerms: author.meshTerms,
      });

      // Link author to affiliations
      for (const affiliationId of affiliationIds) {
        await authorRepository.addAffiliation(storedAuthor.id, affiliationId);
      }

      // Check if author is already linked to this process as a candidate
      const existingLink = await processAuthorRepository.findByProcessAndAuthor(
        processId,
        storedAuthor.id
      );

      if (!existingLink) {
        // Link author to process as candidate
        await processAuthorRepository.create({
          processId,
          authorId: storedAuthor.id,
          role: AuthorRole.CANDIDATE,
        });
      }

      // Log the activity
      await this.activityLogRepository.create({
        userId,
        processId,
        action: 'MANUAL_REVIEWER_ADDED',
        details: JSON.stringify({
          authorName: author.name,
          authorEmail: author.email,
          publicationCount: author.publicationCount,
        }),
      });

      return true;
    } catch (error) {
      console.error('Error adding manual reviewer:', error);
      return false;
    }
  }

  async removeManualReviewer(
    processId: string,
    userId: string,
    authorId: string
  ): Promise<boolean> {
    const process = await this.processRepository.findById(processId);
    if (!process || process.userId !== userId) {
      return false;
    }

    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);
    const authorRepository = new AuthorRepository(this.prisma);

    try {
      // Get author details for logging
      const author = await authorRepository.findById(authorId);
      
      // Remove the link between process and author
      const removed = await processAuthorRepository.removeByProcessAndAuthor(
        processId,
        authorId
      );

      if (removed && author) {
        // Log the activity
        await this.activityLogRepository.create({
          userId,
          processId,
          action: 'MANUAL_REVIEWER_REMOVED',
          details: JSON.stringify({
            authorName: author.name,
            authorEmail: author.email,
          }),
        });
      }

      return removed;
    } catch (error) {
      console.error('Error removing manual reviewer:', error);
      return false;
    }
  }

  /**
   * Add a candidate author to a process (simplified version for testing)
   */
  async addCandidateAuthor(
    processId: string,
    authorData: {
      name: string;
      email?: string;
      publicationCount?: number;
      clinicalTrials?: number;
      retractions?: number;
      researchAreas?: string[];
      meshTerms?: string[];
      affiliations?: Array<{
        institutionName: string;
        department?: string;
        address: string;
        country: string;
      }>;
    }
  ): Promise<boolean> {
    const authorRepository = new AuthorRepository(this.prisma);
    const affiliationRepository = new AffiliationRepository(this.prisma);
    const processAuthorRepository = new ProcessAuthorRepository(this.prisma);

    try {
      // Store affiliations first
      const affiliationIds = [];
      for (const affiliation of authorData.affiliations || []) {
        const storedAffiliation = await affiliationRepository.findOrCreate({
          institutionName: affiliation.institutionName,
          ...(affiliation.department && { department: affiliation.department }),
          address: affiliation.address,
          country: affiliation.country,
        });
        affiliationIds.push(storedAffiliation.id);
      }

      // Create or find the author
      const storedAuthor = await authorRepository.findOrCreate({
        name: authorData.name,
        ...(authorData.email && { email: authorData.email }),
        publicationCount: authorData.publicationCount || 0,
        clinicalTrials: authorData.clinicalTrials || 0,
        retractions: authorData.retractions || 0,
        researchAreas: authorData.researchAreas || [],
        meshTerms: authorData.meshTerms || [],
      });

      // Link author to affiliations
      for (const affiliationId of affiliationIds) {
        await authorRepository.addAffiliation(storedAuthor.id, affiliationId);
      }

      // Check if author is already linked to this process
      const existingLink = await processAuthorRepository.findByProcessAndAuthor(
        processId,
        storedAuthor.id
      );

      if (!existingLink) {
        // Link author to process as candidate
        await processAuthorRepository.create({
          processId,
          authorId: storedAuthor.id,
          role: AuthorRole.CANDIDATE,
        });
      }

      return true;
    } catch (error) {
      console.error('Error adding candidate author:', error);
      return false;
    }
  }

  async getProcessCandidates(
    processId: string,
    userId: string,
    role?: AuthorRole
  ): Promise<any[] | null> {
    const process = await this.processRepository.findByIdWithRelations(processId);
    
    if (!process || process.userId !== userId) {
      return null;
    }

    // Get candidate authors with their affiliations
    const candidates = process.processAuthors
      ?.filter(pa => !role || pa.role === role)
      .map(pa => ({
        id: pa.author.id,
        name: pa.author.name,
        email: pa.author.email,
        publicationCount: pa.author.publicationCount,
        clinicalTrials: pa.author.clinicalTrials,
        retractions: pa.author.retractions,
        researchAreas: pa.author.researchAreas ? JSON.parse(pa.author.researchAreas) : [],
        meshTerms: pa.author.meshTerms ? JSON.parse(pa.author.meshTerms) : [],
        affiliations: pa.author.affiliations?.map((aa: any) => ({
          id: aa.affiliation.id,
          institutionName: aa.affiliation.institutionName,
          department: aa.affiliation.department,
          address: aa.affiliation.address,
          country: aa.affiliation.country,
        })) || [],
        role: pa.role,
        validationStatus: pa.validationStatus ? JSON.parse(pa.validationStatus) : null,
        addedAt: pa.addedAt,
      })) || [];

    return candidates;
  }

  async generateSearchSuggestions(
    searchTerm: string,
    searchType: 'name' | 'email'
  ): Promise<string[]> {
    // Generate search suggestions based on the search term
    const suggestions: string[] = [];

    if (searchType === 'name') {
      // For name searches, suggest variations
      const nameParts = searchTerm.trim().split(/\s+/);
      
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
      }
      
      // Suggest partial matches
      if (searchTerm.length > 3) {
        suggestions.push(searchTerm.substring(0, searchTerm.length - 1));
        suggestions.push(searchTerm.substring(1));
      }
    } else if (searchType === 'email') {
      // For email searches, suggest domain variations
      const emailParts = searchTerm.split('@');
      if (emailParts.length === 2) {
        const [localPart, domain] = emailParts;
        
        // Suggest common academic domains
        const academicDomains = [
          'edu', 'ac.uk', 'ac.in', 'ac.jp', 'ac.au', 'ac.ca',
          'university.edu', 'college.edu', 'research.org'
        ];
        
        academicDomains.forEach(acadDomain => {
          if (domain && !domain.includes(acadDomain)) {
            suggestions.push(`${localPart}@${acadDomain}`);
          }
        });
        
        // Suggest variations of the local part
        if (localPart && localPart.includes('.')) {
          const withoutDots = localPart.replace(/\./g, '');
          suggestions.push(`${withoutDots}@${domain}`);
        } else if (localPart && localPart.length > 6) {
          // Add dots between potential name parts
          const midPoint = Math.floor(localPart.length / 2);
          const withDot = localPart.substring(0, midPoint) + '.' + localPart.substring(midPoint);
          suggestions.push(`${withDot}@${domain}`);
        }
      }
    }

    // Remove duplicates and return unique suggestions
    return [...new Set(suggestions)].slice(0, 5);
  }
}