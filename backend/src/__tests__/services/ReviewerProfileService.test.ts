import { ReviewerProfileService, ProfileAnalysisOptions } from '../../services/ReviewerProfileService';
import { DatabaseIntegrationService } from '../../services/DatabaseIntegrationService';
import { Author } from '../../types';

// Mock the DatabaseIntegrationService
jest.mock('../../services/DatabaseIntegrationService');

describe('ReviewerProfileService', () => {
  let service: ReviewerProfileService;
  let mockDatabaseService: jest.Mocked<DatabaseIntegrationService>;

  const mockAuthor: Author = {
    id: 'test-author-1',
    name: 'Dr. Jane Smith',
    email: 'jane.smith@university.edu',
    affiliations: [
      {
        id: 'aff-1',
        institutionName: 'University of Science',
        department: 'Computer Science',
        address: '123 University Ave',
        country: 'USA'
      }
    ],
    publicationCount: 25,
    clinicalTrials: 3,
    retractions: 0,
    researchAreas: [
      'Machine Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Deep Learning',
      'Artificial Intelligence'
    ],
    meshTerms: [
      'Machine Learning',
      'Neural Networks',
      'Deep Learning',
      'Computer Vision',
      'Natural Language Processing'
    ]
  };

  const mockManuscriptAuthors: Author[] = [
    {
      id: 'manuscript-author-1',
      name: 'Dr. John Doe',
      email: 'john.doe@research.org',
      affiliations: [
        {
          id: 'aff-2',
          institutionName: 'Research Institute',
          address: '456 Research Blvd',
          country: 'USA'
        }
      ],
      publicationCount: 15,
      clinicalTrials: 1,
      retractions: 0,
      researchAreas: ['Bioinformatics', 'Genomics'],
      meshTerms: ['Genomics', 'Bioinformatics']
    }
  ];

  beforeEach(() => {
    mockDatabaseService = new DatabaseIntegrationService() as jest.Mocked<DatabaseIntegrationService>;
    service = new ReviewerProfileService(mockDatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetailedProfile', () => {
    it('should return a complete detailed profile with all components', async () => {
      // Mock the database service to return enhanced profile
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const options: ProfileAnalysisOptions = {
        includeNetworkAnalysis: true,
        includePublicationHistory: true,
        includeConflictDetection: true,
        manuscriptAuthors: mockManuscriptAuthors,
        timeframeYears: 10
      };

      const result = await service.getDetailedProfile(mockAuthor, options);

      expect(result).toBeDefined();
      expect(result.author).toEqual(mockAuthor);
      expect(result.researchProfile).toBeDefined();
      expect(result.networkAnalysis).toBeDefined();
      expect(result.publicationHistory).toBeDefined();
      expect(result.conflictIndicators).toBeDefined();
      expect(result.profileCompleteness).toBeDefined();

      // Verify research profile structure
      expect(result.researchProfile.primaryResearchAreas).toHaveLength(3);
      expect(result.researchProfile.primaryResearchAreas).toEqual([
        'Machine Learning',
        'Natural Language Processing',
        'Computer Vision'
      ]);
      expect(result.researchProfile.meshTerms).toHaveLength(5);
      expect(result.researchProfile.expertiseDomains).toHaveLength(3);

      // Verify network analysis structure
      expect(result.networkAnalysis.coAuthors).toBeDefined();
      expect(result.networkAnalysis.collaborationPatterns).toBeDefined();
      expect(result.networkAnalysis.institutionalConnections).toBeDefined();
      expect(result.networkAnalysis.networkMetrics).toBeDefined();

      // Verify publication history structure
      expect(result.publicationHistory.totalPublications).toBe(25);
      expect(result.publicationHistory.publicationsByYear).toBeDefined();
      expect(result.publicationHistory.journalDistribution).toBeDefined();
      expect(result.publicationHistory.citationMetrics).toBeDefined();

      // Verify profile completeness
      expect(result.profileCompleteness.overallScore).toBeGreaterThan(0);
      expect(result.profileCompleteness.overallScore).toBeLessThanOrEqual(1);
      expect(result.profileCompleteness.dataFreshness).toBeGreaterThanOrEqual(0);
      expect(result.profileCompleteness.dataFreshness).toBeLessThanOrEqual(1);
    });

    it('should handle missing optional components gracefully', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const options: ProfileAnalysisOptions = {
        includeNetworkAnalysis: false,
        includePublicationHistory: false,
        includeConflictDetection: false
      };

      const result = await service.getDetailedProfile(mockAuthor, options);

      expect(result).toBeDefined();
      expect(result.researchProfile).toBeDefined();
      
      // Should have empty network analysis
      expect(result.networkAnalysis.coAuthors).toHaveLength(0);
      expect(result.networkAnalysis.networkMetrics.totalCoAuthors).toBe(0);
      
      // Should have empty publication history
      expect(result.publicationHistory.totalPublications).toBe(0);
      expect(result.publicationHistory.publicationsByYear).toHaveLength(0);
      
      // Should have no conflict indicators
      expect(result.conflictIndicators).toHaveLength(0);
    });

    it('should handle database service errors gracefully', async () => {
      mockDatabaseService.getAuthorProfile.mockRejectedValue(new Error('Database error'));

      const result = await service.getDetailedProfile(mockAuthor);

      // Should still return a profile using the original author data
      expect(result).toBeDefined();
      expect(result.author).toEqual(mockAuthor);
      expect(result.researchProfile).toBeDefined();
    });

    it('should throw error for invalid author', async () => {
      const invalidAuthor = null as any;
      
      await expect(service.getDetailedProfile(invalidAuthor)).rejects.toThrow();
    });
  });

  describe('analyzeCollaborationNetwork', () => {
    it('should analyze collaboration network for multiple authors', async () => {
      const authors = [mockAuthor, mockManuscriptAuthors[0]!];
      
      const result = await service.analyzeCollaborationNetwork(authors);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.has(mockAuthor.id)).toBe(true);
      expect(result.has(mockManuscriptAuthors[0]!.id)).toBe(true);

      const authorNetwork = result.get(mockAuthor.id);
      expect(authorNetwork).toBeDefined();
      expect(authorNetwork!.networkMetrics).toBeDefined();
      expect(authorNetwork!.coAuthors).toBeDefined();
    });

    it('should handle errors for individual authors gracefully', async () => {
      const authors = [mockAuthor];
      
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.analyzeCollaborationNetwork(authors);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      
      const authorNetwork = result.get(mockAuthor.id);
      expect(authorNetwork).toBeDefined();
      expect(authorNetwork!.coAuthors).toHaveLength(0);

      consoleSpy.mockRestore();
    });
  });

  describe('detectCrossAuthorConflicts', () => {
    it('should detect conflicts across multiple candidate authors', async () => {
      const candidates = [mockAuthor];
      const manuscriptAuthors = mockManuscriptAuthors;
      const institutionalAffiliations = mockAuthor.affiliations;

      const result = await service.detectCrossAuthorConflicts(
        candidates,
        manuscriptAuthors,
        institutionalAffiliations
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.has(mockAuthor.id)).toBe(true);

      const conflicts = result.get(mockAuthor.id);
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should detect institutional conflicts', async () => {
      const candidateWithSameInstitution: Author = {
        ...mockAuthor,
        id: 'candidate-same-inst',
        name: 'Dr. Same Institution',
        affiliations: [mockManuscriptAuthors[0]!.affiliations[0]!] // Same institution
      };

      const result = await service.detectCrossAuthorConflicts(
        [candidateWithSameInstitution],
        mockManuscriptAuthors,
        mockManuscriptAuthors[0]!.affiliations
      );

      const conflicts = result.get(candidateWithSameInstitution.id);
      expect(conflicts).toBeDefined();
      
      const institutionalConflicts = conflicts!.filter(c => c.type === 'institutional');
      expect(institutionalConflicts.length).toBeGreaterThan(0);
      expect(institutionalConflicts[0]!.severity).toBe('medium');
    });

    it('should handle errors for individual candidates gracefully', async () => {
      const candidates = [mockAuthor];
      
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.detectCrossAuthorConflicts(
        candidates,
        mockManuscriptAuthors,
        []
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      
      const conflicts = result.get(mockAuthor.id);
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Research Profile Analysis', () => {
    it('should correctly categorize MeSH terms', async () => {
      const authorWithMedicalTerms: Author = {
        ...mockAuthor,
        meshTerms: [
          'Heart Disease',
          'Cancer Therapy',
          'Pharmaceutical Drug',
          'Brain Anatomy',
          'General Term'
        ]
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(authorWithMedicalTerms);

      const result = await service.getDetailedProfile(authorWithMedicalTerms);

      expect(result.researchProfile.meshTerms).toHaveLength(5);
      
      const diseaseTerms = result.researchProfile.meshTerms.filter(mt => mt.category === 'Diseases');
      const therapeuticTerms = result.researchProfile.meshTerms.filter(mt => mt.category === 'Therapeutics');
      const drugTerms = result.researchProfile.meshTerms.filter(mt => mt.category === 'Chemicals and Drugs');
      const anatomyTerms = result.researchProfile.meshTerms.filter(mt => mt.category === 'Anatomy');
      const generalTerms = result.researchProfile.meshTerms.filter(mt => mt.category === 'General');

      expect(diseaseTerms.length).toBe(1);
      expect(therapeuticTerms.length).toBe(1);
      expect(drugTerms.length).toBe(1);
      expect(anatomyTerms.length).toBe(1);
      expect(generalTerms.length).toBe(1);
    });

    it('should calculate expertise domains based on publication count', async () => {
      const highPublicationAuthor: Author = {
        ...mockAuthor,
        publicationCount: 100
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(highPublicationAuthor);

      const result = await service.getDetailedProfile(highPublicationAuthor);

      expect(result.researchProfile.expertiseDomains).toHaveLength(3);
      
      result.researchProfile.expertiseDomains.forEach(domain => {
        expect(domain.confidence).toBeGreaterThan(0);
        expect(domain.confidence).toBeLessThanOrEqual(1);
        expect(domain.publicationCount).toBeGreaterThan(0);
        expect(domain.recentActivity).toBe(true);
      });
    });

    it('should extract research keywords from areas and MeSH terms', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor);

      expect(result.researchProfile.researchKeywords).toBeDefined();
      expect(result.researchProfile.researchKeywords.length).toBeGreaterThan(0);
      expect(result.researchProfile.researchKeywords.length).toBeLessThanOrEqual(20);

      // Should contain keywords from research areas
      const hasMLKeyword = result.researchProfile.researchKeywords.some(
        keyword => keyword.includes('machine') || keyword.includes('learning')
      );
      expect(hasMLKeyword).toBe(true);
    });
  });

  describe('Publication History Analysis', () => {
    it('should generate realistic publication distribution over years', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor, { timeframeYears: 5 });

      expect(result.publicationHistory.publicationsByYear).toHaveLength(6); // 5 years + current year
      
      const totalFromYears = result.publicationHistory.publicationsByYear
        .reduce((sum, py) => sum + py.count, 0);
      
      // Should be reasonably close to the author's total publication count
      expect(totalFromYears).toBeGreaterThanOrEqual(0);
      expect(totalFromYears).toBeLessThanOrEqual(mockAuthor.publicationCount * 2); // Allow for variance
    });

    it('should calculate citation metrics based on publication count', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor);

      const metrics = result.publicationHistory.citationMetrics;
      expect(metrics.totalCitations).toBeGreaterThan(0);
      expect(metrics.hIndex).toBeGreaterThanOrEqual(0);
      expect(metrics.hIndex).toBeLessThanOrEqual(mockAuthor.publicationCount);
      expect(metrics.i10Index).toBeGreaterThanOrEqual(0);
      expect(metrics.averageCitationsPerPaper).toBeGreaterThan(0);
      expect(['increasing', 'stable', 'decreasing']).toContain(metrics.recentCitationTrend);
    });

    it('should generate appropriate journal distribution', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor);

      expect(result.publicationHistory.journalDistribution.length).toBeGreaterThan(0);
      expect(result.publicationHistory.journalDistribution.length).toBeLessThanOrEqual(5);

      result.publicationHistory.journalDistribution.forEach(journal => {
        expect(journal.publicationCount).toBeGreaterThan(0);
        expect(journal.impactFactor).toBeGreaterThan(0);
        expect(['Q1', 'Q2', 'Q3']).toContain(journal.quartile);
        expect(journal.fieldRelevance).toBeGreaterThan(0);
        expect(journal.fieldRelevance).toBeLessThanOrEqual(1);
      });
    });

    it('should analyze publication trends correctly', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor, { timeframeYears: 10 });

      if (result.publicationHistory.recentTrends.length > 0) {
        result.publicationHistory.recentTrends.forEach(trend => {
          expect(['productivity', 'impact', 'collaboration', 'internationalization']).toContain(trend.metric);
          expect(['increasing', 'stable', 'decreasing']).toContain(trend.trend);
          expect(trend.confidence).toBeGreaterThan(0);
          expect(trend.confidence).toBeLessThanOrEqual(1);
          expect(trend.timeframe).toBeDefined();
        });
      }
    });
  });

  describe('Profile Completeness Assessment', () => {
    it('should assess complete profile correctly', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor);

      expect(result.profileCompleteness.overallScore).toBeGreaterThan(0.5);
      expect(result.profileCompleteness.missingFields.length).toBeLessThan(3);
      expect(result.profileCompleteness.dataQuality).toBeDefined();
      expect(result.profileCompleteness.lastUpdated).toBeInstanceOf(Date);
      expect(result.profileCompleteness.dataFreshness).toBeGreaterThanOrEqual(0);
      expect(result.profileCompleteness.dataFreshness).toBeLessThanOrEqual(1);
    });

    it('should identify missing fields correctly', async () => {
      const incompleteAuthor: Author = {
        id: mockAuthor.id,
        name: mockAuthor.name,
        affiliations: [],
        publicationCount: mockAuthor.publicationCount,
        clinicalTrials: mockAuthor.clinicalTrials,
        retractions: mockAuthor.retractions,
        researchAreas: [],
        meshTerms: []
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(incompleteAuthor);

      const result = await service.getDetailedProfile(incompleteAuthor);

      expect(result.profileCompleteness.missingFields).toContain('email');
      expect(result.profileCompleteness.missingFields).toContain('affiliations');
      expect(result.profileCompleteness.missingFields).toContain('researchAreas');
      expect(result.profileCompleteness.missingFields).toContain('meshTerms');
      expect(result.profileCompleteness.overallScore).toBeLessThanOrEqual(0.5);
    });

    it('should assess data quality correctly', async () => {
      const lowQualityAuthor: Author = {
        ...mockAuthor,
        publicationCount: 0,
        meshTerms: ['single-term']
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(lowQualityAuthor);

      const result = await service.getDetailedProfile(lowQualityAuthor);

      const publicationQuality = result.profileCompleteness.dataQuality.find(
        dq => dq.field === 'publicationCount'
      );
      expect(publicationQuality).toBeDefined();
      expect(publicationQuality!.quality).toBe('low');

      const meshQuality = result.profileCompleteness.dataQuality.find(
        dq => dq.field === 'meshTerms'
      );
      expect(meshQuality).toBeDefined();
      expect(meshQuality!.quality).toBe('low');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect co-authorship conflicts', async () => {
      const conflictingAuthor: Author = {
        ...mockAuthor,
        name: mockManuscriptAuthors[0]!.name // Same name as manuscript author
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(conflictingAuthor);

      const result = await service.getDetailedProfile(conflictingAuthor, {
        includeConflictDetection: true,
        manuscriptAuthors: mockManuscriptAuthors
      });

      const coAuthorshipConflicts = result.conflictIndicators.filter(
        ci => ci.type === 'co_authorship'
      );
      expect(coAuthorshipConflicts.length).toBeGreaterThan(0);
      expect(coAuthorshipConflicts[0]!.severity).toBe('high');
      expect(coAuthorshipConflicts[0]!.confidence).toBe(1.0);
    });

    it('should detect email-based conflicts', async () => {
      const manuscriptEmail = mockManuscriptAuthors[0]!.email;
      if (!manuscriptEmail) {
        // Skip test if manuscript author has no email
        return;
      }

      const conflictingAuthor: Author = {
        id: mockAuthor.id,
        name: mockAuthor.name,
        email: manuscriptEmail, // Same email as manuscript author
        affiliations: mockAuthor.affiliations,
        publicationCount: mockAuthor.publicationCount,
        clinicalTrials: mockAuthor.clinicalTrials,
        retractions: mockAuthor.retractions,
        researchAreas: mockAuthor.researchAreas,
        meshTerms: mockAuthor.meshTerms
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(conflictingAuthor);

      const result = await service.getDetailedProfile(conflictingAuthor, {
        includeConflictDetection: true,
        manuscriptAuthors: mockManuscriptAuthors
      });

      const coAuthorshipConflicts = result.conflictIndicators.filter(
        ci => ci.type === 'co_authorship'
      );
      expect(coAuthorshipConflicts.length).toBeGreaterThan(0);
      expect(coAuthorshipConflicts[0]!.severity).toBe('high');
    });

    it('should not detect conflicts for different authors', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const result = await service.getDetailedProfile(mockAuthor, {
        includeConflictDetection: true,
        manuscriptAuthors: mockManuscriptAuthors
      });

      const coAuthorshipConflicts = result.conflictIndicators.filter(
        ci => ci.type === 'co_authorship'
      );
      expect(coAuthorshipConflicts.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', () => {
      expect(() => new ReviewerProfileService(mockDatabaseService)).not.toThrow();
    });

    it('should handle null/undefined authors gracefully', async () => {
      const nullAuthor = null as any;
      
      await expect(service.getDetailedProfile(nullAuthor)).rejects.toThrow();
    });

    it('should handle empty author arrays in network analysis', async () => {
      const result = await service.analyzeCollaborationNetwork([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle empty arrays in conflict detection', async () => {
      const result = await service.detectCrossAuthorConflicts([], [], []);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });
});