import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  generateCSV,
  generateExcel,
  generateReport,
  createExportMetadata,
  exportReviewers
} from '../exportUtils';
import { Reviewer } from '../../types/api';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn()
}));

// Mock xlsx
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
    decode_range: vi.fn(() => ({ s: { c: 0, r: 0 }, e: { c: 5, r: 0 } })),
    encode_cell: vi.fn(() => 'A1')
  },
  writeFile: vi.fn()
}));

const mockReviewers: Reviewer[] = [
  {
    reviewer: 'Dr. John Smith',
    email: 'john.smith@university.edu',
    aff: 'University of Science',
    city: 'Boston',
    country: 'USA',
    Total_Publications: 150,
    English_Pubs: 145,
    'Publications (last 10 years)': 80,
    'Relevant Publications (last 5 years)': 45,
    'Publications (last 2 years)': 20,
    'Publications (last year)': 12,
    Clinical_Trials_no: 5,
    Clinical_study_no: 8,
    Case_reports_no: 3,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 2,
    coauthor: false,
    country_match: 'different',
    aff_match: 'different',
    conditions_met: 7,
    conditions_satisfied: '7 of 8 conditions met'
  },
  {
    reviewer: 'Dr. Jane Doe',
    email: 'jane.doe@research.org',
    aff: 'Research Institute',
    city: 'London',
    country: 'UK',
    Total_Publications: 200,
    English_Pubs: 200,
    'Publications (last 10 years)': 120,
    'Relevant Publications (last 5 years)': 60,
    'Publications (last 2 years)': 25,
    'Publications (last year)': 15,
    Clinical_Trials_no: 8,
    Clinical_study_no: 12,
    Case_reports_no: 2,
    Retracted_Pubs_no: 0,
    TF_Publications_last_year: 3,
    coauthor: false,
    country_match: 'different',
    aff_match: 'different',
    conditions_met: 8,
    conditions_satisfied: '8 of 8 conditions met'
  }
];

describe('exportUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExportMetadata', () => {
    it('creates export metadata correctly', () => {
      const metadata = createExportMetadata(
        mockReviewers,
        'csv',
        'Test Manuscript',
        'process-123'
      );

      expect(metadata).toEqual({
        exportDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        totalReviewers: 2,
        exportFormat: 'csv',
        manuscriptTitle: 'Test Manuscript',
        processId: 'process-123'
      });
    });

    it('handles optional parameters', () => {
      const metadata = createExportMetadata(mockReviewers, 'excel');

      expect(metadata).toEqual({
        exportDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        totalReviewers: 2,
        exportFormat: 'excel',
        manuscriptTitle: undefined,
        processId: undefined
      });
    });
  });

  describe('generateCSV', () => {
    it('generates CSV content correctly', () => {
      const metadata = createExportMetadata(mockReviewers, 'csv');
      const csvContent = generateCSV(mockReviewers, metadata);

      expect(csvContent).toContain('"Name","Email","Affiliation"');
      expect(csvContent).toContain('"Dr. John Smith","john.smith@university.edu"');
      expect(csvContent).toContain('"Dr. Jane Doe","jane.doe@research.org"');
      expect(csvContent).toContain('"University of Science"');
      expect(csvContent).toContain('"Research Institute"');
    });

    it('handles special characters in CSV', () => {
      const reviewerWithQuotes: Reviewer = {
        ...mockReviewers[0],
        reviewer: 'Dr. "John" Smith',
        aff: 'University of "Science"'
      };

      const metadata = createExportMetadata([reviewerWithQuotes], 'csv');
      const csvContent = generateCSV([reviewerWithQuotes], metadata);

      expect(csvContent).toContain('""John""');
      expect(csvContent).toContain('""Science""');
    });

    it('includes all required columns', () => {
      const metadata = createExportMetadata(mockReviewers, 'csv');
      const csvContent = generateCSV(mockReviewers, metadata);

      const expectedColumns = [
        'Name', 'Email', 'Affiliation', 'City', 'Country',
        'Total Publications', 'English Publications', 'Publications (Last 10 Years)',
        'Relevant Publications (Last 5 Years)', 'Publications (Last 2 Years)',
        'Publications (Last Year)', 'Clinical Trials', 'Clinical Studies',
        'Case Reports', 'Retracted Publications', 'TF Publications Last Year',
        'Co-author', 'Country Match', 'Affiliation Match',
        'Conditions Met', 'Conditions Satisfied'
      ];

      expectedColumns.forEach(column => {
        expect(csvContent).toContain(column);
      });
    });
  });

  describe('generateExcel', () => {
    it('creates Excel workbook with multiple sheets', () => {
      const metadata = createExportMetadata(mockReviewers, 'excel');
      const workbook = generateExcel(mockReviewers, metadata);

      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledTimes(3); // Summary, Detailed, Validation sheets
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledTimes(3);
    });

    it('includes summary data in first sheet', () => {
      const metadata = createExportMetadata(mockReviewers, 'excel', 'Test Manuscript');
      generateExcel(mockReviewers, metadata);

      const summaryCall = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[0][0];
      expect(summaryCall).toContainEqual(['Reviewer Shortlist Export Summary']);
      expect(summaryCall).toContainEqual(['Total Reviewers:', 2]);
      expect(summaryCall).toContainEqual(['Manuscript Title:', 'Test Manuscript']);
    });

    it('includes detailed reviewer data', () => {
      const metadata = createExportMetadata(mockReviewers, 'excel');
      generateExcel(mockReviewers, metadata);

      const detailedCall = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[1][0];
      expect(detailedCall[0]).toContain('Name');
      expect(detailedCall[0]).toContain('Email');
      expect(detailedCall[1]).toContain('Dr. John Smith');
      expect(detailedCall[2]).toContain('Dr. Jane Doe');
    });

    it('includes validation criteria sheet', () => {
      const metadata = createExportMetadata(mockReviewers, 'excel');
      generateExcel(mockReviewers, metadata);

      const validationCall = vi.mocked(XLSX.utils.aoa_to_sheet).mock.calls[2][0];
      expect(validationCall).toContainEqual(['Validation Criteria Applied']);
      expect(validationCall).toContainEqual(['Conditions Met Distribution:']);
    });
  });

  describe('generateReport', () => {
    it('generates markdown report with correct structure', () => {
      const metadata = createExportMetadata(mockReviewers, 'report', 'Test Manuscript');
      const report = generateReport(mockReviewers, metadata);

      expect(report).toContain('# Reviewer Shortlist Report');
      expect(report).toContain('**Total Reviewers:** 2');
      expect(report).toContain('**Manuscript Title:** Test Manuscript');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Reviewer Profiles');
      expect(report).toContain('## Validation Methodology');
    });

    it('sorts reviewers by validation score', () => {
      const metadata = createExportMetadata(mockReviewers, 'report');
      const report = generateReport(mockReviewers, metadata);

      // Dr. Jane Doe (8/8) should appear before Dr. John Smith (7/8)
      const janeIndex = report.indexOf('Dr. Jane Doe');
      const johnIndex = report.indexOf('Dr. John Smith');
      expect(janeIndex).toBeLessThan(johnIndex);
    });

    it('includes detailed reviewer profiles', () => {
      const metadata = createExportMetadata(mockReviewers, 'report');
      const report = generateReport(mockReviewers, metadata);

      expect(report).toContain('john.smith@university.edu');
      expect(report).toContain('University of Science');
      expect(report).toContain('Boston, USA');
      expect(report).toContain('Total Publications: 150');
      expect(report).toContain('Conditions Met: 7/8');
    });

    it('calculates statistics correctly', () => {
      const metadata = createExportMetadata(mockReviewers, 'report');
      const report = generateReport(mockReviewers, metadata);

      expect(report).toContain('**Average Validation Score:** 7.5/8');
      expect(report).toContain('**Countries Represented:** 2');
      expect(report).toContain('**Total Combined Publications:** 350');
    });
  });

  describe('exportReviewers', () => {
    it('calls correct export function for CSV', async () => {
      const metadata = createExportMetadata(mockReviewers, 'csv');
      
      await exportReviewers(mockReviewers, 'csv', metadata);

      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/reviewer-shortlist-.*\.csv/)
      );
    });

    it('calls correct export function for Excel', async () => {
      const metadata = createExportMetadata(mockReviewers, 'excel');
      
      await exportReviewers(mockReviewers, 'excel', metadata);

      expect(XLSX.writeFile).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringMatching(/reviewer-shortlist-.*\.xlsx/)
      );
    });

    it('calls correct export function for Report', async () => {
      const metadata = createExportMetadata(mockReviewers, 'report');
      
      await exportReviewers(mockReviewers, 'report', metadata);

      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/reviewer-report-.*\.md/)
      );
    });

    it('throws error for unsupported format', async () => {
      const metadata = createExportMetadata(mockReviewers, 'csv');
      
      await expect(
        exportReviewers(mockReviewers, 'unsupported' as any, metadata)
      ).rejects.toThrow('Unsupported export format: unsupported');
    });
  });
});