import { PrismaClient } from '@prisma/client';
import { 
  Author, 
  ValidationResult, 
  ConflictType, 
  RetractionFlag, 
  PublicationMetrics, 
  ManuscriptMetadata,
  AuthorRole 
} from '../types';
import { ProcessAuthorRepository, ProcessAuthorWithRelations } from '../repositories/ProcessAuthorRepository';

export interface ValidationConfig {
  minPublications: number;
  maxRetractions: number;
  minRecentPublications: number;
  recentYears: number;
  checkInstitutionalConflicts: boolean;
  checkCoAuthorConflicts: boolean;
  collaborationYears: number;
}

export interface ValidationStepResult {
  stepName: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface AuthorValidationResult extends ValidationResult {
  validationSteps: ValidationStepResult[];
}

export interface ProcessValidationResult {
  processId: string;
  totalCandidates: number;
  validatedCandidates: number;
  validationResults: AuthorValidationResult[];
  validationConfig: ValidationConfig;
  completedAt: Date;
}

export class AuthorValidationService {
  private processAuthorRepository: ProcessAuthorRepository;

  constructor(prisma: PrismaClient) {
    this.processAuthorRepository = new ProcessAuthorRepository(prisma);
  }

  /**
   * Validate all candidate authors for a process
   */
  async validateProcessAuthors(
    processId: string,
    manuscriptMetadata: ManuscriptMetadata,
    config: ValidationConfig = this.getDefaultConfig()
  ): Promise<ProcessValidationResult> {
    // Get all candidate authors for the process
    const candidateAuthors = await this.processAuthorRepository.findByProcessAndRole(
      processId,
      AuthorRole.CANDIDATE
    ) as ProcessAuthorWithRelations[];

    const validationResults: AuthorValidationResult[] = [];
    let validatedCount = 0;

    // Validate each candidate author
    for (const processAuthor of candidateAuthors) {
      if (!processAuthor.author) {
        continue;
      }

      // Transform the author data to match our Author interface
      const author: Author = {
        id: processAuthor.author.id,
        name: processAuthor.author.name,
        email: processAuthor.author.email || undefined,
        affiliations: processAuthor.author.affiliations?.map(aa => aa.affiliation) || [],
        publicationCount: processAuthor.author.publicationCount,
        clinicalTrials: processAuthor.author.clinicalTrials,
        retractions: processAuthor.author.retractions,
        researchAreas: processAuthor.author.researchAreas ? JSON.parse(processAuthor.author.researchAreas) : [],
        meshTerms: processAuthor.author.meshTerms ? JSON.parse(processAuthor.author.meshTerms) : []
      };

      const result = await this.validateAuthor(
        author,
        manuscriptMetadata,
        config
      );

      validationResults.push(result);

      if (result.passed) {
        validatedCount++;
      }

      // Update the validation status in the database
      await this.processAuthorRepository.updateValidationStatus(
        processAuthor.id,
        JSON.stringify({
          passed: result.passed,
          conflicts: result.conflicts,
          retractionFlags: result.retractionFlags,
          publicationMetrics: result.publicationMetrics,
          validationSteps: result.validationSteps,
          validatedAt: new Date().toISOString()
        })
      );
    }

    return {
      processId,
      totalCandidates: candidateAuthors.length,
      validatedCandidates: validatedCount,
      validationResults,
      validationConfig: config,
      completedAt: new Date()
    };
  }

  /**
   * Validate a single author against all validation rules
   */
  async validateAuthor(
    author: Author,
    manuscriptMetadata: ManuscriptMetadata,
    config: ValidationConfig
  ): Promise<AuthorValidationResult> {
    const validationSteps: ValidationStepResult[] = [];
    const conflicts: ConflictType[] = [];
    let retractionFlags: RetractionFlag[] = [];
    let passed = true;

    // Step 1: Check if author is a manuscript author
    const manuscriptAuthorCheck = this.checkManuscriptAuthorConflict(author, manuscriptMetadata);
    validationSteps.push(manuscriptAuthorCheck);
    if (!manuscriptAuthorCheck.passed) {
      conflicts.push(ConflictType.MANUSCRIPT_AUTHOR);
      passed = false;
    }

    // Step 2: Check co-author conflicts if enabled
    if (config.checkCoAuthorConflicts) {
      const coAuthorCheck = await this.checkCoAuthorConflicts(
        author, 
        manuscriptMetadata, 
        config.collaborationYears
      );
      validationSteps.push(coAuthorCheck);
      if (!coAuthorCheck.passed) {
        conflicts.push(ConflictType.CO_AUTHOR);
        passed = false;
      }
    }

    // Step 3: Check institutional conflicts if enabled
    if (config.checkInstitutionalConflicts) {
      const institutionalCheck = this.checkInstitutionalConflicts(author, manuscriptMetadata);
      validationSteps.push(institutionalCheck);
      if (!institutionalCheck.passed) {
        conflicts.push(ConflictType.INSTITUTIONAL);
        passed = false;
      }
    }

    // Step 4: Check publication thresholds
    const publicationCheck = this.checkPublicationThresholds(author, config);
    validationSteps.push(publicationCheck);
    if (!publicationCheck.passed) {
      passed = false;
    }

    // Step 5: Check retractions
    const retractionCheck = await this.checkRetractions(author, config.maxRetractions);
    validationSteps.push(retractionCheck);
    if (!retractionCheck.passed) {
      passed = false;
    }
    if (retractionCheck.details?.retractions) {
      retractionFlags = retractionCheck.details.retractions;
    }

    // Calculate publication metrics
    const publicationMetrics = this.calculatePublicationMetrics(author, config);

    return {
      author,
      passed,
      conflicts,
      retractionFlags,
      publicationMetrics,
      validationSteps
    };
  }

  /**
   * Check if the candidate author is one of the manuscript authors
   */
  private checkManuscriptAuthorConflict(
    candidate: Author,
    manuscriptMetadata: ManuscriptMetadata
  ): ValidationStepResult {
    const isManuscriptAuthor = manuscriptMetadata.authors.some(manuscriptAuthor => {
      // Check by email if both have emails
      if (candidate.email && manuscriptAuthor.email) {
        return candidate.email.toLowerCase() === manuscriptAuthor.email.toLowerCase();
      }
      
      // Check by name similarity
      const candidateName = candidate.name.toLowerCase().trim();
      const manuscriptAuthorName = manuscriptAuthor.name.toLowerCase().trim();
      
      return candidateName === manuscriptAuthorName || 
             this.calculateNameSimilarity(candidateName, manuscriptAuthorName) > 0.9;
    });

    return {
      stepName: 'Manuscript Author Check',
      passed: !isManuscriptAuthor,
      message: isManuscriptAuthor 
        ? 'Author is one of the manuscript authors' 
        : 'Author is not a manuscript author',
      details: { isManuscriptAuthor }
    };
  }

  /**
   * Check for co-author conflicts (recent collaborations)
   */
  private async checkCoAuthorConflicts(
    candidate: Author,
    manuscriptMetadata: ManuscriptMetadata,
    collaborationYears: number
  ): Promise<ValidationStepResult> {
    // This is a simplified implementation
    // In a real system, you would query external databases for collaboration history
    const hasRecentCollaborations = await this.hasRecentCollaborations(
      candidate,
      manuscriptMetadata.authors,
      collaborationYears
    );

    return {
      stepName: 'Co-author Conflict Check',
      passed: !hasRecentCollaborations,
      message: hasRecentCollaborations
        ? `Author has recent collaborations with manuscript authors (within ${collaborationYears} years)`
        : 'No recent collaborations detected',
      details: { collaborationYears, hasRecentCollaborations }
    };
  }

  /**
   * Check for institutional conflicts
   */
  private checkInstitutionalConflicts(
    candidate: Author,
    manuscriptMetadata: ManuscriptMetadata
  ): ValidationStepResult {
    const candidateInstitutions = candidate.affiliations.map(aff => 
      aff.institutionName.toLowerCase().trim()
    );

    const manuscriptInstitutions = manuscriptMetadata.affiliations.map(aff => 
      aff.institutionName.toLowerCase().trim()
    );

    const hasInstitutionalConflict = candidateInstitutions.some(candidateInst =>
      manuscriptInstitutions.some(manuscriptInst =>
        candidateInst === manuscriptInst ||
        this.calculateInstitutionSimilarity(candidateInst, manuscriptInst) > 0.8
      )
    );

    return {
      stepName: 'Institutional Conflict Check',
      passed: !hasInstitutionalConflict,
      message: hasInstitutionalConflict
        ? 'Author shares institutional affiliation with manuscript authors'
        : 'No institutional conflicts detected',
      details: { 
        candidateInstitutions: candidate.affiliations.map(a => a.institutionName),
        manuscriptInstitutions: manuscriptMetadata.affiliations.map(a => a.institutionName),
        hasInstitutionalConflict
      }
    };
  }

  /**
   * Check publication thresholds
   */
  private checkPublicationThresholds(
    author: Author,
    config: ValidationConfig
  ): ValidationStepResult {
    const meetsMinPublications = author.publicationCount >= config.minPublications;
    const meetsRetractionThreshold = author.retractions <= config.maxRetractions;
    
    const passed = meetsMinPublications && meetsRetractionThreshold;
    
    const issues: string[] = [];
    if (!meetsMinPublications) {
      issues.push(`Publication count (${author.publicationCount}) below minimum (${config.minPublications})`);
    }
    if (!meetsRetractionThreshold) {
      issues.push(`Retraction count (${author.retractions}) exceeds maximum (${config.maxRetractions})`);
    }

    return {
      stepName: 'Publication Threshold Check',
      passed,
      message: passed 
        ? 'Author meets publication requirements'
        : `Publication requirements not met: ${issues.join(', ')}`,
      details: {
        publicationCount: author.publicationCount,
        minPublications: config.minPublications,
        retractionCount: author.retractions,
        maxRetractions: config.maxRetractions,
        meetsMinPublications,
        meetsRetractionThreshold
      }
    };
  }

  /**
   * Check for retractions
   */
  private async checkRetractions(
    author: Author,
    maxRetractions: number
  ): Promise<ValidationStepResult> {
    // Get detailed retraction information
    const retractions = await this.getAuthorRetractions(author);
    const passed = retractions.length <= maxRetractions;

    return {
      stepName: 'Retraction Check',
      passed,
      message: passed
        ? `Author has ${retractions.length} retractions (within limit of ${maxRetractions})`
        : `Author has ${retractions.length} retractions (exceeds limit of ${maxRetractions})`,
      details: {
        retractionCount: retractions.length,
        maxRetractions,
        retractions
      }
    };
  }

  /**
   * Calculate publication metrics for an author
   */
  private calculatePublicationMetrics(
    author: Author,
    _config: ValidationConfig
  ): PublicationMetrics {
    // This is a simplified implementation
    // In a real system, you would calculate recent publications based on actual dates
    const estimatedRecentPublications = Math.floor(author.publicationCount * 0.3); // Assume 30% are recent

    return {
      totalPublications: author.publicationCount,
      recentPublications: estimatedRecentPublications,
      // hIndex and citationCount are optional, so we don't include them
    };
  }

  /**
   * Get detailed retraction information for an author
   */
  private async getAuthorRetractions(author: Author): Promise<RetractionFlag[]> {
    // This is a simplified implementation
    // In a real system, you would query retraction databases
    const retractions: RetractionFlag[] = [];
    
    // Use the retraction count from the author record to generate mock retraction data
    for (let i = 0; i < author.retractions; i++) {
      retractions.push({
        publicationTitle: `Retracted Publication ${i + 1}`,
        journal: 'Unknown Journal',
        retractionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
        reason: 'Data integrity concerns'
      });
    }

    return retractions;
  }

  /**
   * Check if author has recent collaborations with manuscript authors
   */
  private async hasRecentCollaborations(
    candidate: Author,
    manuscriptAuthors: Author[],
    _collaborationYears: number
  ): Promise<boolean> {
    // This is a simplified implementation
    // In a real system, you would query publication databases for co-authorships
    
    // For now, we'll use a simple heuristic based on research areas overlap
    const candidateAreas = candidate.researchAreas.map(area => area.toLowerCase());
    
    for (const manuscriptAuthor of manuscriptAuthors) {
      const manuscriptAreas = manuscriptAuthor.researchAreas.map(area => area.toLowerCase());
      const overlap = candidateAreas.filter(area => manuscriptAreas.includes(area));
      
      // If there's significant research area overlap, assume potential collaboration
      if (overlap.length >= 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate name similarity between two names
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate institution name similarity
   */
  private calculateInstitutionSimilarity(inst1: string, inst2: string): number {
    // Check for common institution name patterns
    const commonWords = ['university', 'college', 'institute', 'hospital', 'medical', 'center'];
    
    // Remove common words and compare
    const clean1 = inst1.split(' ').filter(word => !commonWords.includes(word)).join(' ');
    const clean2 = inst2.split(' ').filter(word => !commonWords.includes(word)).join(' ');
    
    return this.calculateNameSimilarity(clean1, clean2);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1, // deletion
          matrix[j - 1]![i]! + 1, // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Get default validation configuration
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      minPublications: 5,
      maxRetractions: 0,
      minRecentPublications: 2,
      recentYears: 5,
      checkInstitutionalConflicts: true,
      checkCoAuthorConflicts: true,
      collaborationYears: 3
    };
  }

  /**
   * Re-validate authors when rules change
   */
  async revalidateProcessAuthors(
    processId: string,
    manuscriptMetadata: ManuscriptMetadata,
    newConfig: ValidationConfig
  ): Promise<ProcessValidationResult> {
    // Clear existing validation results
    const candidateAuthors = await this.processAuthorRepository.findByProcessAndRole(
      processId,
      AuthorRole.CANDIDATE
    );

    for (const processAuthor of candidateAuthors) {
      await this.processAuthorRepository.updateValidationStatus(processAuthor.id, '');
    }

    // Re-run validation with new config
    return this.validateProcessAuthors(processId, manuscriptMetadata, newConfig);
  }

  /**
   * Get validation results for a process
   */
  async getProcessValidationResults(processId: string): Promise<AuthorValidationResult[]> {
    const candidateAuthors = await this.processAuthorRepository.findByProcessAndRole(
      processId,
      AuthorRole.CANDIDATE
    ) as ProcessAuthorWithRelations[];

    const results: AuthorValidationResult[] = [];

    for (const processAuthor of candidateAuthors) {
      if (!processAuthor.author || !processAuthor.validationStatus) {
        continue;
      }

      try {
        const validationData = JSON.parse(processAuthor.validationStatus);
        
        // Transform the author data to match our Author interface
        const author: Author = {
          id: processAuthor.author.id,
          name: processAuthor.author.name,
          email: processAuthor.author.email || undefined,
          affiliations: processAuthor.author.affiliations?.map(aa => aa.affiliation) || [],
          publicationCount: processAuthor.author.publicationCount,
          clinicalTrials: processAuthor.author.clinicalTrials,
          retractions: processAuthor.author.retractions,
          researchAreas: processAuthor.author.researchAreas ? JSON.parse(processAuthor.author.researchAreas) : [],
          meshTerms: processAuthor.author.meshTerms ? JSON.parse(processAuthor.author.meshTerms) : []
        };

        results.push({
          author,
          passed: validationData.passed,
          conflicts: validationData.conflicts || [],
          retractionFlags: validationData.retractionFlags || [],
          publicationMetrics: validationData.publicationMetrics || {
            totalPublications: author.publicationCount,
            recentPublications: 0
          },
          validationSteps: validationData.validationSteps || []
        });
      } catch (error) {
        console.error('Error parsing validation status:', error);
      }
    }

    return results;
  }
}