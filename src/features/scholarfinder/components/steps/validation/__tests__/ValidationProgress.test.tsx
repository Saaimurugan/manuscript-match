/**
 * ValidationProgress Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ValidationProgress } from '../ValidationProgress';

describe('ValidationProgress', () => {
  const defaultProps = {
    progressPercentage: 45,
    estimatedCompletionTime: '5 minutes',
    totalAuthorsProcessed: 150,
    validationCriteria: [
      'No co-authorship conflicts',
      'Minimum publication count',
      'Recent publication activity',
      'Geographic diversity'
    ]
  };

  it('renders progress information correctly', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText('Validation in Progress')).toBeInTheDocument();
    expect(screen.getByText('Progress: 45%')).toBeInTheDocument();
    expect(screen.getByText('~5 minutes remaining')).toBeInTheDocument();
  });

  it('displays total authors processed', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText('Authors Processed')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('shows validation criteria count', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText('Validation Criteria')).toBeInTheDocument();
    expect(screen.getByText('4 rules applied')).toBeInTheDocument();
  });

  it('displays all validation criteria as badges', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText('No co-authorship conflicts')).toBeInTheDocument();
    expect(screen.getByText('Minimum publication count')).toBeInTheDocument();
    expect(screen.getByText('Recent publication activity')).toBeInTheDocument();
    expect(screen.getByText('Geographic diversity')).toBeInTheDocument();
  });

  it('shows validation stages with correct status', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText('Data Collection')).toBeInTheDocument();
    expect(screen.getByText('Conflict Detection')).toBeInTheDocument();
    expect(screen.getByText('Quality Assessment')).toBeInTheDocument();
    expect(screen.getByText('Final Scoring')).toBeInTheDocument();
    expect(screen.getByText('Results Compilation')).toBeInTheDocument();
  });

  it('handles high progress percentage correctly', () => {
    render(<ValidationProgress {...defaultProps} progressPercentage={85} />);
    
    expect(screen.getByText('Progress: 85%')).toBeInTheDocument();
  });

  it('handles low progress percentage correctly', () => {
    render(<ValidationProgress {...defaultProps} progressPercentage={15} />);
    
    expect(screen.getByText('Progress: 15%')).toBeInTheDocument();
  });

  it('works without estimated completion time', () => {
    const propsWithoutTime = {
      ...defaultProps,
      estimatedCompletionTime: undefined
    };
    
    render(<ValidationProgress {...propsWithoutTime} />);
    
    expect(screen.getByText('Progress: 45%')).toBeInTheDocument();
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });

  it('formats large author counts correctly', () => {
    render(<ValidationProgress {...defaultProps} totalAuthorsProcessed={1500} />);
    
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('handles empty validation criteria', () => {
    render(<ValidationProgress {...defaultProps} validationCriteria={[]} />);
    
    expect(screen.getByText('0 rules applied')).toBeInTheDocument();
  });

  it('shows help text explaining the process', () => {
    render(<ValidationProgress {...defaultProps} />);
    
    expect(screen.getByText(/What's happening:/)).toBeInTheDocument();
    expect(screen.getByText(/The system is validating each potential reviewer/)).toBeInTheDocument();
  });

  describe('Time Formatting', () => {
    it('handles duration strings correctly', () => {
      render(<ValidationProgress {...defaultProps} estimatedCompletionTime="3 minutes" />);
      
      expect(screen.getByText('~3 minutes remaining')).toBeInTheDocument();
    });

    it('handles hour duration strings correctly', () => {
      render(<ValidationProgress {...defaultProps} estimatedCompletionTime="2 hours" />);
      
      expect(screen.getByText('~2 hours remaining')).toBeInTheDocument();
    });

    it('handles timestamp strings correctly', () => {
      const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
      render(<ValidationProgress {...defaultProps} estimatedCompletionTime={futureTime} />);
      
      expect(screen.getByText(/~10 minute/)).toBeInTheDocument();
    });

    it('handles past timestamps correctly', () => {
      const pastTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
      render(<ValidationProgress {...defaultProps} estimatedCompletionTime={pastTime} />);
      
      expect(screen.getByText('~Completing soon remaining')).toBeInTheDocument();
    });
  });
});