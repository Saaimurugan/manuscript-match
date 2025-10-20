/**
 * Integration test for ScholarFinder API Service
 * Simple test to verify the service can be instantiated and configured
 */

import { describe, it, expect } from 'vitest';
import { ScholarFinderApiService, ScholarFinderErrorType } from '../ScholarFinderApiService';

describe('ScholarFinderApiService Integration', () => {
  it('should create service instance with default config', () => {
    const service = new ScholarFinderApiService();
    const config = service.getConfig();
    
    expect(config).toHaveProperty('baseURL');
    expect(config).toHaveProperty('timeout');
    expect(config).toHaveProperty('retries');
    expect(config).toHaveProperty('retryDelay');
  });

  it('should create service instance with custom config', () => {
    const customConfig = {
      timeout: 60000,
      retries: 5,
    };
    
    const service = new ScholarFinderApiService(customConfig);
    const config = service.getConfig();
    
    expect(config.timeout).toBe(60000);
    expect(config.retries).toBe(5);
  });

  it('should validate file format correctly', async () => {
    const service = new ScholarFinderApiService();
    
    // Test invalid file format
    const invalidFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    await expect(service.uploadManuscript(invalidFile)).rejects.toMatchObject({
      type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
      retryable: false,
    });
  });

  it('should validate file size correctly', async () => {
    const service = new ScholarFinderApiService();
    
    // Create a file that's too large (over 100MB)
    const largeContent = 'x'.repeat(101 * 1024 * 1024);
    const largeFile = new File([largeContent], 'large.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    await expect(service.uploadManuscript(largeFile)).rejects.toMatchObject({
      type: ScholarFinderErrorType.FILE_FORMAT_ERROR,
      retryable: false,
    });
  });

  it('should validate required parameters', async () => {
    const service = new ScholarFinderApiService();
    
    // Test empty job ID
    await expect(service.getMetadata('')).rejects.toMatchObject({
      type: ScholarFinderErrorType.METADATA_ERROR,
      retryable: false,
    });
    
    // Test empty keywords
    await expect(service.generateKeywordString('job-123', {
      primary_keywords_input: '',
      secondary_keywords_input: '',
    })).rejects.toMatchObject({
      type: ScholarFinderErrorType.KEYWORD_ERROR,
      retryable: false,
    });
    
    // Test empty databases
    await expect(service.searchDatabases('job-123', {
      selected_websites: [],
    })).rejects.toMatchObject({
      type: ScholarFinderErrorType.SEARCH_ERROR,
      retryable: false,
    });
    
    // Test short author name
    await expect(service.addManualAuthor('job-123', 'A')).rejects.toMatchObject({
      type: ScholarFinderErrorType.SEARCH_ERROR,
      retryable: false,
    });
  });

  it('should export error types correctly', () => {
    expect(ScholarFinderErrorType.UPLOAD_ERROR).toBe('UPLOAD_ERROR');
    expect(ScholarFinderErrorType.FILE_FORMAT_ERROR).toBe('FILE_FORMAT_ERROR');
    expect(ScholarFinderErrorType.METADATA_ERROR).toBe('METADATA_ERROR');
    expect(ScholarFinderErrorType.KEYWORD_ERROR).toBe('KEYWORD_ERROR');
    expect(ScholarFinderErrorType.SEARCH_ERROR).toBe('SEARCH_ERROR');
    expect(ScholarFinderErrorType.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ScholarFinderErrorType.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR');
    expect(ScholarFinderErrorType.TIMEOUT_ERROR).toBe('TIMEOUT_ERROR');
  });
});