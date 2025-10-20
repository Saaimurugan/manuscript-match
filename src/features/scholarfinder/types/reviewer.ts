// Reviewer and Filtering Types
// Types for reviewer data and filtering functionality

import { Reviewer } from './api';

export interface ReviewerFilters {
  minPublications?: number;
  maxRetractions?: number;
  countries?: string[];
  affiliations?: string[];
  validationScore?: number;
  minConditionsMet?: number;
  publicationYears?: {
    lastYear?: number;
    last2Years?: number;
    last5Years?: number;
    last10Years?: number;
  };
  excludeCoauthors?: boolean;
  searchTerm?: string;
}

export interface SortConfig {
  column: keyof Reviewer | 'conditions_met_percentage';
  direction: 'asc' | 'desc';
}

export interface ReviewerTableColumn {
  key: keyof Reviewer | 'conditions_met_percentage';
  label: string;
  sortable: boolean;
  filterable: boolean;
  width?: string;
  render?: (value: any, reviewer: Reviewer) => React.ReactNode;
}

export interface ReviewerSelection {
  selectedIds: string[];
  selectAll: boolean;
  selectionCount: number;
}

export interface ReviewerStats {
  totalReviewers: number;
  averagePublications: number;
  averageConditionsMet: number;
  countryDistribution: Record<string, number>;
  affiliationDistribution: Record<string, number>;
}

export interface ValidationCondition {
  id: string;
  name: string;
  description: string;
  weight: number;
  required: boolean;
}

export interface ReviewerScore {
  reviewerId: string;
  totalScore: number;
  conditionScores: Record<string, number>;
  conditionsMet: number;
  totalConditions: number;
  percentage: number;
}