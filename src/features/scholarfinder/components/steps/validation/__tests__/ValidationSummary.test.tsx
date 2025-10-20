/**
 * ValidationSummary Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ValidationSummary } from '../ValidationSummary';
import type { ValidationSummary as ValidationSummaryType } from '../../../../types/api';

describe('ValidationSummary', () => {
  const mockSummary: ValidationSummaryType = {
    total_authors: 200,
    authors_validated: 180,
    conditions_applied: [
      'No co-authorship conflicts',
      'Minimum publication count',
      'Recent publication activity',
      'Geographic diversity'
    ],
    average_conditions_met: 6.5
  };

  const defaultProps = {
    summary: mockSummary,
    validationCriteria: [
      'No co-authorship conflicts',
      'Minimum publication count',
      'Recent publication activity',
      'Geographic diversity',
      'Email availability',
      'Institution verification'
    ],
    totalAuthorsProcessed: 200
  };

  it('renders validation completion header correctly', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Validation Completed Successfully')).toBeInTheDocument();
    expect(screen.getByText(/Author validation has been completed with detailed quality assessment/)).toBeInTheDocument();
  });

  it('displays key metrics correctly', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Authors Validated')).toBeInTheDocument();
    expect(screen.getByText('90% success rate')).toBeInTheDocument();
    
    expect(screen.getByText('Validation Rules')).toBeInTheDocument();
    
    expect(screen.getByText('Avg. Conditions Met')).toBeInTheDocument();
    
    // Check for specific numbers in context
    const authorsValidatedSection = screen.getByText('Authors Validated').closest('div');
    expect(authorsValidatedSection).toHaveTextContent('180');
    
    const validationRulesSection = screen.getByText('Validation Rules').closest('div');
    expect(validationRulesSection).toHaveTextContent('4');
    
    const avgConditionsSection = screen.getByText('Avg. Conditions Met').closest('div');
    expect(avgConditionsSection).toHaveTextContent('6.5');
  });

  it('shows excellent quality level for high scores', () => {
    const highScoreSummary = { ...mockSummary, average_conditions_met: 7.5 };
    render(<ValidationSummary {...defaultProps} summary={highScoreSummary} />);
    
    expect(screen.getByText('Overall Quality: Excellent')).toBeInTheDocument();
    expect(screen.getByText(/Outstanding validation results!/)).toBeInTheDocument();
  });

  it('shows good quality level for medium scores', () => {
    const mediumScoreSummary = { ...mockSummary, average_conditions_met: 5.5 };
    render(<ValidationSummary {...defaultProps} summary={mediumScoreSummary} />);
    
    expect(screen.getByText('Overall Quality: Good')).toBeInTheDocument();
    expect(screen.getByText(/Good validation results/)).toBeInTheDocument();
  });

  it('shows fair quality level for lower scores', () => {
    const lowScoreSummary = { ...mockSummary, average_conditions_met: 3.5 };
    render(<ValidationSummary {...defaultProps} summary={lowScoreSummary} />);
    
    expect(screen.getByText('Overall Quality: Fair')).toBeInTheDocument();
    expect(screen.getByText(/Acceptable validation results/)).toBeInTheDocument();
  });

  it('shows needs review quality level for very low scores', () => {
    const veryLowScoreSummary = { ...mockSummary, average_conditions_met: 2.0 };
    render(<ValidationSummary {...defaultProps} summary={veryLowScoreSummary} />);
    
    expect(screen.getByText('Overall Quality: Needs Review')).toBeInTheDocument();
    expect(screen.getByText(/Validation results suggest careful review/)).toBeInTheDocument();
  });

  it('displays validation statistics correctly', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Total Authors Found')).toBeInTheDocument();
    expect(screen.getByText('Successfully Validated')).toBeInTheDocument();
    expect(screen.getByText('180 (90%)')).toBeInTheDocument();
    expect(screen.getByText('Authors Processed')).toBeInTheDocument();
    
    // Check for specific numbers in context
    const totalAuthorsSection = screen.getByText('Total Authors Found').closest('div');
    expect(totalAuthorsSection).toHaveTextContent('200');
    
    const authorsProcessedSection = screen.getByText('Authors Processed').closest('div');
    expect(authorsProcessedSection).toHaveTextContent('200');
  });

  it('shows applied validation criteria as badges', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Applied Validation Criteria')).toBeInTheDocument();
    expect(screen.getByText('No co-authorship conflicts')).toBeInTheDocument();
    expect(screen.getByText('Minimum publication count')).toBeInTheDocument();
    expect(screen.getByText('Recent publication activity')).toBeInTheDocument();
    expect(screen.getByText('Geographic diversity')).toBeInTheDocument();
  });

  it('shows additional criteria when validation criteria exceed applied conditions', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Additional criteria checked:')).toBeInTheDocument();
    expect(screen.getByText('Email availability')).toBeInTheDocument();
    expect(screen.getByText('Institution verification')).toBeInTheDocument();
  });

  it('displays next steps recommendations', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Next Steps')).toBeInTheDocument();
    expect(screen.getByText('Review Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Filter by Quality')).toBeInTheDocument();
  });

  it('shows additional sources recommendation for low validation rate', () => {
    const lowValidationSummary = { ...mockSummary, authors_validated: 120 }; // 60% validation rate
    render(<ValidationSummary {...defaultProps} summary={lowValidationSummary} />);
    
    expect(screen.getByText('Consider Additional Sources')).toBeInTheDocument();
    expect(screen.getByText(/Lower validation rate suggests/)).toBeInTheDocument();
  });

  it('does not show additional sources recommendation for high validation rate', () => {
    render(<ValidationSummary {...defaultProps} />); // 90% validation rate
    
    expect(screen.queryByText('Consider Additional Sources')).not.toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeSummary = {
      ...mockSummary,
      total_authors: 1500,
      authors_validated: 1350
    };
    
    render(<ValidationSummary {...defaultProps} summary={largeSummary} totalAuthorsProcessed={1500} />);
    
    // Check for specific numbers in context
    const authorsValidatedSection = screen.getByText('Authors Validated').closest('div');
    expect(authorsValidatedSection).toHaveTextContent('1,350');
    
    const totalAuthorsSection = screen.getByText('Total Authors Found').closest('div');
    expect(totalAuthorsSection).toHaveTextContent('1,500');
  });

  it('handles zero validation rate correctly', () => {
    const zeroValidationSummary = {
      ...mockSummary,
      total_authors: 100,
      authors_validated: 0
    };
    
    render(<ValidationSummary {...defaultProps} summary={zeroValidationSummary} />);
    
    expect(screen.getByText('0% success rate')).toBeInTheDocument();
  });

  it('handles perfect validation rate correctly', () => {
    const perfectValidationSummary = {
      ...mockSummary,
      total_authors: 100,
      authors_validated: 100
    };
    
    render(<ValidationSummary {...defaultProps} summary={perfectValidationSummary} />);
    
    expect(screen.getByText('100% success rate')).toBeInTheDocument();
  });

  it('displays average score with correct formatting', () => {
    render(<ValidationSummary {...defaultProps} />);
    
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('6.5/4')).toBeInTheDocument();
  });

  it('handles empty conditions applied array', () => {
    const emptySummary = {
      ...mockSummary,
      conditions_applied: []
    };
    
    render(<ValidationSummary {...defaultProps} summary={emptySummary} />);
    
    // Check for zero validation rules in context
    const validationRulesSection = screen.getByText('Validation Rules').closest('div');
    expect(validationRulesSection).toHaveTextContent('0');
  });
});