import { PrismaClient } from '@prisma/client';
import { 
  Author, 
  AuthorRole,
  ValidationResult,
  ConflictType
} from '../types';
import { ProcessAuthorRepository, ProcessAuthorWithRelations } from '../repositories/ProcessAuthorRepository';

export interface RecommendationFilters {
  minPublications?: number;
  maxRetractions?: number;
  minClinicalTrials?: number;
  countries?: string[];
  institutions?: string[];
  researchAreas?: string[];
  excludeConflicts?: ConflictType[];
  onlyValidated?: boolean;
}

export interface SortOptions {
  field: 'name' | 'publicationCount' | 'clinicalTrials' | 'retractions' | 'country' | 'institution';
  order: 'asc' | 'desc';
}

export interface RecommendationCandidate extends Author {
  validationResult?: ValidationResult | undefined;
  relevanceScore?: number | undefined;
  primaryAffiliation?: {
    institutionName: string;
    country: string;
    department?: string | undefined;
  } | undefined;
}

export interface RecommendationResponse {
  candidates: RecommendationCandidate[];
  totalCount: number;
  filteredCount: number;
  appliedFilters: RecommendationFilters;
  sortOptions?: SortOptions | undefined;
  suggestions?: FilterSuggestion[];
}

export interface FilterSuggestion {
  type: 'relax_publications' | 'relax_retractions' | 'expand_countries' | 'expand_institutions';
  message: string;
  suggestedFilter: RecommendationFilters;
}

export class RecommendationService {
  private processAuthorRepository: ProcessAuthorRepository;

  constructor(prisma: PrismaClient) {
    this.processAuthorRepository = new ProcessAuthorRepository(prisma);
  }

  /**
   * Get validated candidates for a process
   */
  async getValidatedCandidates(processId: string): Promise<RecommendationCandidate[]> {
    const candidateAuthors = await this.processAuthorRepository.findByProcessAndRole(
      processId,
      AuthorRole.CANDIDATE
    ) as ProcessAuthorWithRelations[];

    const candidates: RecommendationCandidate[] = [];

    for (const processAuthor of candidateAuthors) {
      if (!processAuthor.author) {
        continue;
      }

      // Transform the author data to match our Author interface
      const author: Author = {
        id: processAuthor.author.id,
        name: processAuthor.author.name,
        email: processAuthor.author.email || undefined,
        affiliations: processAuthor.author.affiliations?.map((aa: any) => aa.affiliation) || [],
        publicationCount: processAuthor.author.publicationCount,
        clinicalTrials: processAuthor.author.clinicalTrials,
        retractions: processAuthor.author.retractions,
        researchAreas: processAuthor.author.researchAreas ? JSON.parse(processAuthor.author.researchAreas) : [],
        meshTerms: processAuthor.author.meshTerms ? JSON.parse(processAuthor.author.meshTerms) : []
      };

      // Parse validation result if available
      let validationResult: ValidationResult | undefined;
      if (processAuthor.validationStatus) {
        try {
          const validationData = JSON.parse(processAuthor.validationStatus);
          validationResult = {
            author,
            passed: validationData.passed,
            conflicts: validationData.conflicts || [],
            retractionFlags: validationData.retractionFlags || [],
            publicationMetrics: validationData.publicationMetrics || {
              totalPublications: author.publicationCount,
              recentPublications: 0
            }
          };
        } catch (error) {
          console.error('Error parsing validation status:', error);
        }
      }

      // Calculate relevance score (simplified implementation)
      const relevanceScore = this.calculateRelevanceScore(author, validationResult);

      // Get primary affiliation
      const primaryAffiliation = author.affiliations.length > 0 ? {
        institutionName: author.affiliations[0]!.institutionName,
        country: author.affiliations[0]!.country,
        department: author.affiliations[0]!.department
      } : undefined;

      const candidate: RecommendationCandidate = {
        ...author,
        validationResult,
        relevanceScore,
        primaryAffiliation
      };

      candidates.push(candidate);
    }

    return candidates;
  }

  /**
   * Get filtered and sorted recommendations
   */
  async getRecommendations(
    processId: string,
    filters: RecommendationFilters = {},
    sortOptions?: SortOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<RecommendationResponse> {
    // Get all validated candidates
    const allCandidates = await this.getValidatedCandidates(processId);

    // Apply filters
    const filteredCandidates = this.applyFilters(allCandidates, filters);

    // Apply sorting
    const sortedCandidates = this.applySorting(filteredCandidates, sortOptions);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const paginatedCandidates = sortedCandidates.slice(startIndex, startIndex + limit);

    // Generate suggestions if no results or few results
    const suggestions = this.generateFilterSuggestions(allCandidates, filteredCandidates, filters);

    return {
      candidates: paginatedCandidates,
      totalCount: allCandidates.length,
      filteredCount: filteredCandidates.length,
      appliedFilters: filters,
      sortOptions,
      suggestions
    };
  }

  /**
   * Apply filters to candidates
   */
  private applyFilters(
    candidates: RecommendationCandidate[],
    filters: RecommendationFilters
  ): RecommendationCandidate[] {
    return candidates.filter(candidate => {
      // Filter by minimum publications
      if (filters.minPublications !== undefined && candidate.publicationCount < filters.minPublications) {
        return false;
      }

      // Filter by maximum retractions
      if (filters.maxRetractions !== undefined && candidate.retractions > filters.maxRetractions) {
        return false;
      }

      // Filter by minimum clinical trials
      if (filters.minClinicalTrials !== undefined && candidate.clinicalTrials < filters.minClinicalTrials) {
        return false;
      }

      // Filter by countries
      if (filters.countries && filters.countries.length > 0) {
        const candidateCountries = candidate.affiliations.map(aff => aff.country.toLowerCase());
        const filterCountries = filters.countries.map(country => country.toLowerCase());
        if (!candidateCountries.some(country => filterCountries.includes(country))) {
          return false;
        }
      }

      // Filter by institutions
      if (filters.institutions && filters.institutions.length > 0) {
        const candidateInstitutions = candidate.affiliations.map(aff => aff.institutionName.toLowerCase());
        const filterInstitutions = filters.institutions.map(inst => inst.toLowerCase());
        if (!candidateInstitutions.some(inst => 
          filterInstitutions.some(filterInst => inst.includes(filterInst) || filterInst.includes(inst))
        )) {
          return false;
        }
      }

      // Filter by research areas
      if (filters.researchAreas && filters.researchAreas.length > 0) {
        const candidateAreas = candidate.researchAreas.map(area => area.toLowerCase());
        const filterAreas = filters.researchAreas.map(area => area.toLowerCase());
        if (!candidateAreas.some(area => 
          filterAreas.some(filterArea => area.includes(filterArea) || filterArea.includes(area))
        )) {
          return false;
        }
      }

      // Filter by validation status
      if (filters.onlyValidated && (!candidate.validationResult || !candidate.validationResult.passed)) {
        return false;
      }

      // Exclude specific conflicts
      if (filters.excludeConflicts && filters.excludeConflicts.length > 0 && candidate.validationResult) {
        const hasExcludedConflicts = candidate.validationResult.conflicts.some(conflict =>
          filters.excludeConflicts!.includes(conflict)
        );
        if (hasExcludedConflicts) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply sorting to candidates
   */
  private applySorting(
    candidates: RecommendationCandidate[],
    sortOptions?: SortOptions
  ): RecommendationCandidate[] {
    if (!sortOptions) {
      // Default sort by relevance score (descending) then by publication count (descending)
      return candidates.sort((a, b) => {
        const scoreA = a.relevanceScore || 0;
        const scoreB = b.relevanceScore || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }
        return b.publicationCount - a.publicationCount;
      });
    }

    return candidates.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (sortOptions.field) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'publicationCount':
          valueA = a.publicationCount;
          valueB = b.publicationCount;
          break;
        case 'clinicalTrials':
          valueA = a.clinicalTrials;
          valueB = b.clinicalTrials;
          break;
        case 'retractions':
          valueA = a.retractions;
          valueB = b.retractions;
          break;
        case 'country':
          valueA = a.primaryAffiliation?.country?.toLowerCase() || '';
          valueB = b.primaryAffiliation?.country?.toLowerCase() || '';
          break;
        case 'institution':
          valueA = a.primaryAffiliation?.institutionName?.toLowerCase() || '';
          valueB = b.primaryAffiliation?.institutionName?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (typeof valueA === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return sortOptions.order === 'asc' ? comparison : -comparison;
      } else {
        const comparison = valueA - valueB;
        return sortOptions.order === 'asc' ? comparison : -comparison;
      }
    });
  }

  /**
   * Calculate relevance score for a candidate
   */
  private calculateRelevanceScore(
    author: Author,
    validationResult?: ValidationResult
  ): number {
    let score = 0;

    // Base score from publication count (normalized to 0-40 points)
    score += Math.min(author.publicationCount * 2, 40);

    // Clinical trials bonus (0-20 points)
    score += Math.min(author.clinicalTrials * 5, 20);

    // Validation passed bonus (20 points)
    if (validationResult?.passed) {
      score += 20;
    }

    // Retraction penalty (-10 points per retraction)
    score -= author.retractions * 10;

    // Research area relevance (simplified - would need manuscript context)
    if (author.researchAreas.length > 0) {
      score += Math.min(author.researchAreas.length * 2, 10);
    }

    // MeSH terms relevance (simplified)
    if (author.meshTerms.length > 0) {
      score += Math.min(author.meshTerms.length, 10);
    }

    return Math.max(score, 0); // Ensure non-negative score
  }

  /**
   * Generate filter suggestions when results are limited
   */
  private generateFilterSuggestions(
    allCandidates: RecommendationCandidate[],
    filteredCandidates: RecommendationCandidate[],
    currentFilters: RecommendationFilters
  ): FilterSuggestion[] {
    const suggestions: FilterSuggestion[] = [];

    // If no results, suggest relaxing filters
    if (filteredCandidates.length === 0) {
      if (currentFilters.minPublications && currentFilters.minPublications > 0) {
        const suggestedMin = Math.max(0, currentFilters.minPublications - 5);
        suggestions.push({
          type: 'relax_publications',
          message: `No candidates found. Try reducing minimum publications to ${suggestedMin}`,
          suggestedFilter: { ...currentFilters, minPublications: suggestedMin }
        });
      }

      if (currentFilters.maxRetractions !== undefined && currentFilters.maxRetractions < 2) {
        suggestions.push({
          type: 'relax_retractions',
          message: 'No candidates found. Try allowing candidates with 1-2 retractions',
          suggestedFilter: { ...currentFilters, maxRetractions: 2 }
        });
      }

      if (currentFilters.countries && currentFilters.countries.length > 0) {
        const { countries, ...filtersWithoutCountries } = currentFilters;
        suggestions.push({
          type: 'expand_countries',
          message: 'No candidates found. Try expanding country selection',
          suggestedFilter: filtersWithoutCountries
        });
      }
    }

    // If very few results (less than 5), suggest expanding criteria
    else if (filteredCandidates.length < 5 && allCandidates.length > 10) {
      if (currentFilters.minPublications && currentFilters.minPublications > 3) {
        const suggestedMin = Math.max(3, currentFilters.minPublications - 3);
        suggestions.push({
          type: 'relax_publications',
          message: `Only ${filteredCandidates.length} candidates found. Consider reducing minimum publications to ${suggestedMin}`,
          suggestedFilter: { ...currentFilters, minPublications: suggestedMin }
        });
      }

      if (currentFilters.institutions && currentFilters.institutions.length > 0) {
        const { institutions, ...filtersWithoutInstitutions } = currentFilters;
        suggestions.push({
          type: 'expand_institutions',
          message: `Only ${filteredCandidates.length} candidates found. Consider expanding institution criteria`,
          suggestedFilter: filtersWithoutInstitutions
        });
      }
    }

    return suggestions;
  }

  /**
   * Get available filter options based on current candidates
   */
  async getFilterOptions(processId: string): Promise<{
    countries: string[];
    institutions: string[];
    researchAreas: string[];
    publicationRange: { min: number; max: number };
    retractionRange: { min: number; max: number };
    clinicalTrialRange: { min: number; max: number };
  }> {
    const candidates = await this.getValidatedCandidates(processId);

    const countries = new Set<string>();
    const institutions = new Set<string>();
    const researchAreas = new Set<string>();
    let minPublications = Infinity;
    let maxPublications = 0;
    let minRetractions = Infinity;
    let maxRetractions = 0;
    let minClinicalTrials = Infinity;
    let maxClinicalTrials = 0;

    candidates.forEach(candidate => {
      // Collect countries
      candidate.affiliations.forEach(aff => countries.add(aff.country));

      // Collect institutions
      candidate.affiliations.forEach(aff => institutions.add(aff.institutionName));

      // Collect research areas
      candidate.researchAreas.forEach(area => researchAreas.add(area));

      // Track ranges
      minPublications = Math.min(minPublications, candidate.publicationCount);
      maxPublications = Math.max(maxPublications, candidate.publicationCount);
      minRetractions = Math.min(minRetractions, candidate.retractions);
      maxRetractions = Math.max(maxRetractions, candidate.retractions);
      minClinicalTrials = Math.min(minClinicalTrials, candidate.clinicalTrials);
      maxClinicalTrials = Math.max(maxClinicalTrials, candidate.clinicalTrials);
    });

    return {
      countries: Array.from(countries).sort(),
      institutions: Array.from(institutions).sort(),
      researchAreas: Array.from(researchAreas).sort(),
      publicationRange: {
        min: minPublications === Infinity ? 0 : minPublications,
        max: maxPublications
      },
      retractionRange: {
        min: minRetractions === Infinity ? 0 : minRetractions,
        max: maxRetractions
      },
      clinicalTrialRange: {
        min: minClinicalTrials === Infinity ? 0 : minClinicalTrials,
        max: maxClinicalTrials
      }
    };
  }
}