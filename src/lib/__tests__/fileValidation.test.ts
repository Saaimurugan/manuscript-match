/**
 * File validation tests
 * Tests for file validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateFileExtension,
  validateFileSize,
  validateMimeType,
  validateFileName,
  formatFileSize,
  getFileTypeDescription,
  supportsMetadataExtraction,
  getExpectedMimeTypes,
} from '../fileValidation';

describe('File Validation', () => {
  describe('validateFileExtension', () => {
    it('should validate allowed file extensions', () => {
      const result = validateFileExtension('document.pdf', ['pdf', 'docx']);
      expect(result.isValid).toBe(true);
    });

    it('should reject disallowed file extensions', () => {
      const result = validateFileExtension('document.txt', ['pdf', 'docx']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files without extensions', () => {
      const result = validateFileExtension('document', ['pdf', 'docx']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid extension');
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limits', () => {
      const result = validateFileSize(1024 * 1024, { maxSize: 10 * 1024 * 1024, minSize: 1 });
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const result = validateFileSize(20 * 1024 * 1024, { maxSize: 10 * 1024 * 1024 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File size must be less than');
    });

    it('should reject empty files', () => {
      const result = validateFileSize(0, { minSize: 1 });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty or corrupted');
    });
  });

  describe('validateMimeType', () => {
    it('should validate correct MIME types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateMimeType(file, ['pdf']);
      expect(result.isValid).toBe(true);
    });

    it('should reject incorrect MIME types', () => {
      const file = new File(['content'], 'test.pdf', { type: 'text/plain' });
      const result = validateMimeType(file, ['pdf']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type mismatch');
    });

    it('should handle files without extensions', () => {
      const file = new File(['content'], 'test', { type: 'application/pdf' });
      const result = validateMimeType(file, ['pdf']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unable to determine file type');
    });
  });

  describe('validateFileName', () => {
    it('should validate normal file names', () => {
      const result = validateFileName('document.pdf');
      expect(result.isValid).toBe(true);
    });

    it('should reject file names with invalid characters', () => {
      const result = validateFileName('document<>.pdf');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject file names that are too long', () => {
      const longName = 'a'.repeat(260) + '.pdf';
      const result = validateFileName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should warn about long file names', () => {
      const longName = 'a'.repeat(105) + '.pdf';
      const result = validateFileName(longName);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('File name is quite long');
    });
  });

  describe('validateFile', () => {
    it('should validate a good file', () => {
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      const result = validateFile(file, { allowedTypes: ['pdf'], maxSize: 10 * 1024 * 1024 });
      expect(result.isValid).toBe(true);
    });

    it('should reject files that fail any validation', () => {
      const file = new File(['content'], 'document.txt', { type: 'text/plain' });
      const result = validateFile(file, { allowedTypes: ['pdf'], maxSize: 10 * 1024 * 1024 });
      expect(result.isValid).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });
  });

  describe('getFileTypeDescription', () => {
    it('should return correct descriptions', () => {
      expect(getFileTypeDescription('pdf')).toBe('PDF Document');
      expect(getFileTypeDescription('docx')).toBe('Microsoft Word Document');
      expect(getFileTypeDescription('unknown')).toBe('UNKNOWN File');
    });
  });

  describe('supportsMetadataExtraction', () => {
    it('should identify supported file types', () => {
      expect(supportsMetadataExtraction('document.pdf')).toBe(true);
      expect(supportsMetadataExtraction('document.docx')).toBe(true);
      expect(supportsMetadataExtraction('document.doc')).toBe(true);
    });

    it('should identify unsupported file types', () => {
      expect(supportsMetadataExtraction('document.txt')).toBe(false);
      expect(supportsMetadataExtraction('document.jpg')).toBe(false);
    });
  });

  describe('getExpectedMimeTypes', () => {
    it('should return correct MIME types', () => {
      expect(getExpectedMimeTypes('pdf')).toEqual(['application/pdf']);
      expect(getExpectedMimeTypes('docx')).toEqual(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
      expect(getExpectedMimeTypes('unknown')).toEqual([]);
    });
  });
});