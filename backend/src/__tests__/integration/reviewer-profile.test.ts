import { DatabaseIntegrationService } from '../../services/DatabaseIntegrationService';
import { ReviewerProfileService } from '../../services/ReviewerProfileService';
import { Author, Affiliation } from '../../types';

// Mock external dependencies
jest.mock('../../services/DatabaseIntegrationService');

describe('Reviewer Profile Integration Tests', () => {
  let mockDatabaseService: jest.Mocked<DatabaseIntegrationService>;
  let profileService: ReviewerProfileService;

  const mockAuthor: Author = {
    id: 'pubmed-test-author-1',
    name: 'Dr. Alice Johnson',
    email: 'alice.johnson@university.edu',
    affiliations: [
      {
        id: 'aff-1',
        institutionName: 'Stanford University',
        department: 'Computer Science',
        address: '353 Jane Stanford Way, Stanford, CA 94305',
        country: 'USA'
      }
    ],
    publicationCount: 45,
    clinicalTrials: 5,
    retractions: 0,
    researchAreas: [
      'Artificial Intelligence',
      'Machine Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Deep Learning',
      'Neural Networks'
    ],
    meshTerms: [
      'Artificial Intelligence',
      'Machine Learning',
      'Neural Networks, Computer',
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Pattern Recognition',
      'Data Mining'
    ]
  };

  const mockManuscriptAuthors: Author[] = [
    {
      id: 'manuscript-author-1',
      name: 'Dr. Bob Wilson',
      email: 'bob.wilson@research.org',
      affiliations: [
        {
          id: 'aff-2',
          institutionName: 'MIT',
          department: 'CSAIL',
          address: '32 Vassar Street, Cambridge, MA 02139',
          country: 'USA'
        }
      ],
      publicationCount: 32,
      clinicalTrials: 2,
      retractions: 0,
      researchAreas: ['Robotics', 'Computer Vision', 'Machine Learning'],
      meshTerms: ['Robotics', 'Computer Vision', 'Machine Learning']
    }
  ];

  beforeEach(() => {
    mockDatabaseService = new DatabaseIntegrationService() as jest.Mocked<DatabaseIntegrationService>;
    profileService = new ReviewerProfileService(mockDatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Detailed Profile Generation', () => {
    it('should generate comprehensive profile with all components', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const profile = await profileService.getDetailedProfile(mockAuthor, {
        includeNetworkAnalysis: true,
        includePublicationHistory: true,
        includeConflictDetection: true,
        manuscriptAuthors: mockManuscriptAuthors,
        timeframeYears: 10
      });

      // Verify profile structure
      expect(profile).toMatchObject({
        author: expect.objectContaining({
          id: mockAuthor.id,
          name: mockAuthor.name,
          email: mockAuthor.email
        }),
        researchProfile: expect.objectContaining({
          primaryResearchAreas: expect.arrayContaining([
            'Artificial Intelligence',
            'Machine Learning',
            'Natural Language Processing'
          ]),
          meshTerms: expect.arrayContaining([
            expect.objectContaining({
              term: expect.any(String),
              weight: expect.any(Number),
              category: expect.any(String)
            })
          ]),
          expertiseDomains: expect.arrayContaining([
            expect.objectContaining({
              domain: expect.any(String),
              confidence: expect.any(Number),
              publicationCount: expect.any(Number),
              recentActivity: expect.any(Boolean)
            })
          ])
        }),
        networkAnalysis: expect.objectContaining({
          coAuthors: expect.any(Array),
          collaborationPatterns: expect.any(Array),
          institutionalConnections: expect.any(Array),
          networkMetrics: expect.objectContaining({
            totalCoAuthors: expect.any(Number),
            uniqueInstitutions: expect.any(Number),
            networkDensity: expect.any(Number)
          })
        }),
        publicationHistory: expect.objectContaining({
          totalPublications: mockAuthor.publicationCount,
          publicationsByYear: expect.any(Array),
          citationMetrics: expect.objectContaining({
            totalCitations: expect.any(Number),
            hIndex: expect.any(Number),
            averageCitationsPerPaper: expect.any(Number)
          })
        }),
        profileCompleteness: expect.objectContaining({
          overallScore: expect.any(Number),
          missingFields: expect.any(Array),
          dataFreshness: expect.any(Number)
        })
      });

      // Verify research profile details
      expect(profile.researchProfile.primaryResearchAreas).toHaveLength(3);
      expect(profile.researchProfile.meshTerms.length).toBeGreaterThan(0);
      expect(profile.researchProfile.expertiseDomains.length).toBeGreaterThan(0);

      // Verify all MeSH terms have proper structure
      profile.researchProfile.meshTerms.forEach(meshTerm => {
        expect(meshTerm.weight).toBeGreaterThanOrEqual(0);
        expect(meshTerm.weight).toBeLessThanOrEqual(1);
        expect(['Diseases', 'Therapeutics', 'Chemicals and Drugs', 'Anatomy', 'General'])
          .toContain(meshTerm.category);
      });

      // Verify expertise domains
      profile.researchProfile.expertiseDomains.forEach(domain => {
        expect(domain.confidence).toBeGreaterThanOrEqual(0);
        expect(domain.confidence).toBeLessThanOrEqual(1);
        expect(domain.publicationCount).toBeGreaterThan(0);
      });

      // Verify publication history
      expect(profile.publicationHistory.publicationsByYear.length).toBeGreaterThan(0);
      expect(profile.publicationHistory.citationMetrics.hIndex).toBeLessThanOrEqual(mockAuthor.publicationCount);

      // Verify profile completeness
      expect(profile.profileCompleteness.overallScore).toBeGreaterThanOrEqual(0);
      expect(profile.profileCompleteness.overallScore).toBeLessThanOrEqual(1);
    });

    it('should handle authors with minimal data', async () => {
      const minimalAuthor: Author = {
        id: 'minimal-author',
        name: 'Dr. Minimal Data',
        affiliations: [],
        publicationCount: 1,
        clinicalTrials: 0,
        retractions: 0,
        researchAreas: [],
        meshTerms: []
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(minimalAuthor);

      const profile = await profileService.getDetailedProfile(minimalAuthor);

      expect(profile).toBeDefined();
      expect(profile.author).toEqual(minimalAuthor);
      expect(profile.researchProfile.primaryResearchAreas).toHaveLength(0);
      expect(profile.researchProfile.meshTerms).toHaveLength(0);
      expect(profile.profileCompleteness.missingFields.length).toBeGreaterThan(0);
      expect(profile.profileCompleteness.overallScore).toBeLessThanOrEqual(0.5);

      // Should identify missing fields
      expect(profile.profileCompleteness.missingFields).toContain('email');
      expect(profile.profileCompleteness.missingFields).toContain('affiliations');
      expect(profile.profileCompleteness.missingFields).toContain('researchAreas');
      expect(profile.profileCompleteness.missingFields).toContain('meshTerms');
    });

    it('should categorize MeSH terms correctly', async () => {
      const authorWithMedicalTerms: Author = {
        ...mockAuthor,
        meshTerms: [
          'Heart Disease',
          'Cardiovascular Disease',
          'Cancer Therapy',
          'Radiation Therapy',
          'Aspirin',
          'Pharmaceutical Preparations',
          'Heart Anatomy',
          'Cardiac Physiology',
          'Research Methodology'
        ]
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(authorWithMedicalTerms);

      const profile = await profileService.getDetailedProfile(authorWithMedicalTerms);

      const meshTerms = profile.researchProfile.meshTerms;
      
      const diseaseTerms = meshTerms.filter(mt => mt.category === 'Diseases');
      const therapeuticTerms = meshTerms.filter(mt => mt.category === 'Therapeutics');
      const drugTerms = meshTerms.filter(mt => mt.category === 'Chemicals and Drugs');
      const anatomyTerms = meshTerms.filter(mt => mt.category === 'Anatomy');
      const generalTerms = meshTerms.filter(mt => mt.category === 'General');

      expect(diseaseTerms.length).toBeGreaterThan(0);
      expect(therapeuticTerms.length).toBeGreaterThan(0);
      expect(drugTerms.length).toBeGreaterThan(0);
      expect(anatomyTerms.length).toBeGreaterThan(0);
      expect(generalTerms.length).toBeGreaterThan(0);

      // Verify specific categorizations
      expect(diseaseTerms.some(dt => dt.term.includes('Disease'))).toBe(true);
      expect(therapeuticTerms.some(tt => tt.term.includes('Therapy'))).toBe(true);
      expect(drugTerms.some(dt => dt.term.includes('Aspirin') || dt.term.includes('Pharmaceutical'))).toBe(true);
      expect(anatomyTerms.some(at => at.term.includes('Anatomy') || at.term.includes('Physiology'))).toBe(true);
    });
  });

  describe('Network Analysis', () => {
    it('should analyze collaboration networks for multiple authors', async () => {
      const authors = [mockAuthor, mockManuscriptAuthors[0]!];

      const networkMap = await profileService.analyzeCollaborationNetwork(authors, {
        timeframeYears: 10,
        minCollaborationThreshold: 2
      });

      expect(networkMap).toBeInstanceOf(Map);
      expect(networkMap.size).toBe(2);

      // Verify each author has network analysis
      authors.forEach(author => {
        expect(networkMap.has(author.id)).toBe(true);
        
        const network = networkMap.get(author.id)!;
        expect(network).toMatchObject({
          coAuthors: expect.any(Array),
          collaborationPatterns: expect.any(Array),
          institutionalConnections: expect.any(Array),
          networkMetrics: expect.objectContaining({
            totalCoAuthors: expect.any(Number),
            uniqueInstitutions: expect.any(Number),
            internationalCollaborations: expect.any(Number),
            averageCollaborationsPerYear: expect.any(Number),
            networkDensity: expect.any(Number),
            centralityScore: expect.any(Number)
          })
        });

        // Verify network metrics are within valid ranges
        expect(network.networkMetrics.networkDensity).toBeGreaterThanOrEqual(0);
        expect(network.networkMetrics.networkDensity).toBeLessThanOrEqual(1);
        expect(network.networkMetrics.centralityScore).toBeGreaterThanOrEqual(0);
        expect(network.networkMetrics.centralityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should handle network analysis errors gracefully', async () => {
      const authors = [mockAuthor];
      
      // Mock console.error to suppress error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const networkMap = await profileService.analyzeCollaborationNetwork(authors);

      expect(networkMap).toBeInstanceOf(Map);
      expect(networkMap.size).toBe(1);
      
      const network = networkMap.get(mockAuthor.id)!;
      expect(network).toBeDefined();
      expect(network.coAuthors).toHaveLength(0);
      expect(network.networkMetrics.totalCoAuthors).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Conflict Detection', () => {
    it('should detect co-authorship conflicts accurately', async () => {
      const conflictingAuthor: Author = {
        ...mockAuthor,
        name: mockManuscriptAuthors[0]!.name, // Same name as manuscript author
        id: 'conflicting-author-1'
      };

      const candidates = [conflictingAuthor, mockAuthor];
      const manuscriptAuthors = mockManuscriptAuthors;
      const institutionalAffiliations: Affiliation[] = [];

      const conflictMap = await profileService.detectCrossAuthorConflicts(
        candidates,
        manuscriptAuthors,
        institutionalAffiliations
      );

      expect(conflictMap).toBeInstanceOf(Map);
      expect(conflictMap.size).toBe(2);

      // Check conflicts for the conflicting author
      const conflictingAuthorConflicts = conflictMap.get(conflictingAuthor.id)!;
      expect(conflictingAuthorConflicts).toBeDefined();
      
      const coAuthorshipConflicts = conflictingAuthorConflicts.filter(c => c.type === 'co_authorship');
      expect(coAuthorshipConflicts.length).toBeGreaterThan(0);
      expect(coAuthorshipConflicts[0]!.severity).toBe('high');
      expect(coAuthorshipConflicts[0]!.confidence).toBe(1.0);

      // Check no conflicts for the non-conflicting author
      const nonConflictingAuthorConflicts = conflictMap.get(mockAuthor.id)!;
      const nonConflictingCoAuthorshipConflicts = nonConflictingAuthorConflicts.filter(c => c.type === 'co_authorship');
      expect(nonConflictingCoAuthorshipConflicts.length).toBe(0);
    });

    it('should detect institutional conflicts', async () => {
      const institutionalConflictAuthor: Author = {
        ...mockAuthor,
        id: 'institutional-conflict-author',
        affiliations: [mockManuscriptAuthors[0]!.affiliations[0]!] // Same institution
      };

      const candidates = [institutionalConflictAuthor];
      const manuscriptAuthors = mockManuscriptAuthors;
      const institutionalAffiliations = mockManuscriptAuthors[0]!.affiliations;

      const conflictMap = await profileService.detectCrossAuthorConflicts(
        candidates,
        manuscriptAuthors,
        institutionalAffiliations
      );

      const conflicts = conflictMap.get(institutionalConflictAuthor.id)!;
      const institutionalConflicts = conflicts.filter(c => c.type === 'institutional');
      
      expect(institutionalConflicts.length).toBeGreaterThan(0);
      expect(institutionalConflicts[0]!.severity).toBe('medium');
      expect(institutionalConflicts[0]!.description).toContain('MIT');
      expect(institutionalConflicts[0]!.confidence).toBe(0.9);
    });

    it('should detect email-based conflicts', async () => {
      const manuscriptEmail = mockManuscriptAuthors[0]!.email;
      if (!manuscriptEmail) {
        return; // Skip test if no email
      }

      const emailConflictAuthor: Author = {
        ...mockAuthor,
        id: 'email-conflict-author',
        email: manuscriptEmail // Same email
      };

      const candidates = [emailConflictAuthor];
      const manuscriptAuthors = mockManuscriptAuthors;

      const conflictMap = await profileService.detectCrossAuthorConflicts(
        candidates,
        manuscriptAuthors,
        []
      );

      const conflicts = conflictMap.get(emailConflictAuthor.id)!;
      const coAuthorshipConflicts = conflicts.filter(c => c.type === 'co_authorship');
      
      expect(coAuthorshipConflicts.length).toBeGreaterThan(0);
      expect(coAuthorshipConflicts[0]!.severity).toBe('high');
      expect(coAuthorshipConflicts[0]!.confidence).toBe(1.0);
    });

    it('should handle multiple conflict types for same author', async () => {
      const multiConflictAuthor: Author = {
        ...mockAuthor,
        id: 'multi-conflict-author',
        name: mockManuscriptAuthors[0]!.name, // Name conflict
        affiliations: [mockManuscriptAuthors[0]!.affiliations[0]!] // Institutional conflict
      };

      const candidates = [multiConflictAuthor];
      const manuscriptAuthors = mockManuscriptAuthors;
      const institutionalAffiliations = mockManuscriptAuthors[0]!.affiliations;

      const conflictMap = await profileService.detectCrossAuthorConflicts(
        candidates,
        manuscriptAuthors,
        institutionalAffiliations
      );

      const conflicts = conflictMap.get(multiConflictAuthor.id)!;
      
      const coAuthorshipConflicts = conflicts.filter(c => c.type === 'co_authorship');
      const institutionalConflicts = conflicts.filter(c => c.type === 'institutional');
      
      expect(coAuthorshipConflicts.length).toBeGreaterThan(0);
      expect(institutionalConflicts.length).toBeGreaterThan(0);
      
      // Should have both high severity (co-authorship) and medium severity (institutional) conflicts
      const severities = conflicts.map(c => c.severity);
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
    });
  });

  describe('Publication History Analysis', () => {
    it('should generate realistic publication trends', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const profile = await profileService.getDetailedProfile(mockAuthor, {
        includePublicationHistory: true,
        timeframeYears: 10
      });

      const history = profile.publicationHistory;

      // Verify publication distribution
      expect(history.publicationsByYear).toHaveLength(11); // 10 years + current year
      expect(history.totalPublications).toBe(mockAuthor.publicationCount);

      // Verify each year has valid data
      history.publicationsByYear.forEach(yearData => {
        expect(yearData.year).toBeGreaterThan(2010);
        expect(yearData.year).toBeLessThanOrEqual(new Date().getFullYear());
        expect(yearData.count).toBeGreaterThanOrEqual(0);
        expect(yearData.citationCount).toBeGreaterThanOrEqual(0);
        expect(yearData.topJournals).toBeDefined();
        expect(Array.isArray(yearData.topJournals)).toBe(true);
      });

      // Verify journal distribution
      expect(history.journalDistribution.length).toBeGreaterThan(0);
      history.journalDistribution.forEach(journal => {
        expect(journal.journal).toBeDefined();
        expect(journal.publicationCount).toBeGreaterThan(0);
        expect(journal.impactFactor).toBeGreaterThan(0);
        expect(['Q1', 'Q2', 'Q3']).toContain(journal.quartile);
        expect(journal.fieldRelevance).toBeGreaterThan(0);
        expect(journal.fieldRelevance).toBeLessThanOrEqual(1);
      });

      // Verify citation metrics
      expect(history.citationMetrics.totalCitations).toBeGreaterThan(0);
      expect(history.citationMetrics.hIndex).toBeGreaterThanOrEqual(0);
      expect(history.citationMetrics.hIndex).toBeLessThanOrEqual(mockAuthor.publicationCount);
      expect(history.citationMetrics.averageCitationsPerPaper).toBeGreaterThan(0);
      expect(['increasing', 'stable', 'decreasing']).toContain(history.citationMetrics.recentCitationTrend);

      // Verify publication types
      expect(history.publicationTypes.length).toBeGreaterThan(0);
      const totalTypeCount = history.publicationTypes.reduce((sum, pt) => sum + pt.count, 0);
      expect(totalTypeCount).toBeLessThanOrEqual(mockAuthor.publicationCount);

      history.publicationTypes.forEach(pubType => {
        expect(['research_article', 'review', 'case_study', 'editorial', 'letter', 'other']).toContain(pubType.type);
        expect(pubType.count).toBeGreaterThan(0);
        expect(pubType.percentage).toBeGreaterThan(0);
        expect(pubType.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('should handle authors with no publications gracefully', async () => {
      const noPublicationAuthor: Author = {
        ...mockAuthor,
        publicationCount: 0
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(noPublicationAuthor);

      const profile = await profileService.getDetailedProfile(noPublicationAuthor, {
        includePublicationHistory: true
      });

      expect(profile.publicationHistory.totalPublications).toBe(0);
      expect(profile.publicationHistory.citationMetrics.totalCitations).toBe(0);
      expect(profile.publicationHistory.citationMetrics.hIndex).toBe(0);
      
      // Should still have some structure for years
      expect(profile.publicationHistory.publicationsByYear.length).toBeGreaterThan(0);
      
      // All year counts should be 0 or very low
      profile.publicationHistory.publicationsByYear.forEach(yearData => {
        expect(yearData.count).toBeLessThanOrEqual(1); // Allow for some variance in mock data
      });
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large numbers of authors efficiently', async () => {
      const manyAuthors = Array.from({ length: 50 }, (_, i) => ({
        ...mockAuthor,
        id: `author-${i}`,
        name: `Dr. Author ${i}`
      }));

      const startTime = Date.now();
      const networkMap = await profileService.analyzeCollaborationNetwork(manyAuthors);
      const endTime = Date.now();

      expect(networkMap.size).toBe(50);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle database service failures gracefully', async () => {
      mockDatabaseService.getAuthorProfile.mockRejectedValue(new Error('Database connection failed'));

      const profile = await profileService.getDetailedProfile(mockAuthor);

      // Should still return a profile using the original author data
      expect(profile).toBeDefined();
      expect(profile.author).toEqual(mockAuthor);
      expect(profile.researchProfile).toBeDefined();
      expect(profile.profileCompleteness.overallScore).toBeGreaterThan(0);
    });

    it('should handle invalid author data gracefully', async () => {
      const invalidAuthor = {
        ...mockAuthor,
        publicationCount: -1, // Invalid publication count
        meshTerms: [] // Empty mesh terms instead of null
      };

      mockDatabaseService.getAuthorProfile.mockResolvedValue(invalidAuthor);

      const profile = await profileService.getDetailedProfile(invalidAuthor);

      expect(profile).toBeDefined();
      expect(profile.researchProfile.meshTerms).toHaveLength(0); // Should handle empty array gracefully
      expect(profile.profileCompleteness.dataQuality.length).toBeGreaterThan(0); // Should identify quality issues
    });

    it('should handle concurrent profile requests', async () => {
      mockDatabaseService.getAuthorProfile.mockResolvedValue(mockAuthor);

      const authors = [mockAuthor, mockManuscriptAuthors[0]!];
      const profilePromises = authors.map(author => 
        profileService.getDetailedProfile(author)
      );

      const profiles = await Promise.all(profilePromises);

      expect(profiles).toHaveLength(2);
      profiles.forEach(profile => {
        expect(profile).toBeDefined();
        expect(profile.researchProfile).toBeDefined();
        expect(profile.profileCompleteness).toBeDefined();
      });
    });
  });
});