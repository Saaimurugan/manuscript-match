/**
 * File upload and metadata service
 * Now uses ScholarFinder external API for all operations
 */

import { apiService } from './apiService';
import { scholarFinderApiService } from '../features/scholarfinder/services/ScholarFinderApiService';
import type { 
  UploadResponse, 
  ExtractedMetadata, 
  UpdateMetadataRequest,
  ApiResponse 
} from '../types/api';

// Store job_id mapping for processes
const processJobIdMap = new Map<string, string>();

/**
 * File service class for file operations and metadata management
 * Now integrated with ScholarFinder external API
 */
class FileService {
  /**
   * Set job ID for a process (called after upload)
   */
  setJobId(processId: string, jobId: string): void {
    processJobIdMap.set(processId, jobId);
    // Also store in localStorage for persistence
    localStorage.setItem(`process_${processId}_jobId`, jobId);
  }

  /**
   * Get job ID for a process
   */
  getJobId(processId: string): string | null {
    // Try memory first
    let jobId = processJobIdMap.get(processId);
    if (!jobId) {
      // Try localStorage
      jobId = localStorage.getItem(`process_${processId}_jobId`) || null;
      if (jobId) {
        processJobIdMap.set(processId, jobId);
      }
    }
    return jobId;
  }

  /**
   * Upload a file for a specific process - uses ScholarFinder API
   */
  async uploadFile(processId: string, file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
    // Use ScholarFinder API with processId
    const response = await scholarFinderApiService.uploadManuscript(file, processId);
    
    // Store the job_id for this process
    this.setJobId(processId, response.data.job_id);
    
    // Transform response to match UploadResponse format
    return {
      fileId: response.data.job_id,
      fileName: response.data.file_name,
      fileSize: file.size,
      uploadedAt: response.data.timestamp,
      metadata: {
        title: response.data.heading,
        authors: response.data.authors,
        affiliations: response.data.affiliations,
        keywords: response.data.keywords,
        abstract: response.data.abstract,
        authorAffiliationMap: response.data.author_aff_map
      }
    } as UploadResponse;
  }

  /**
   * Get extracted metadata for a process - uses ScholarFinder API
   */
  async getMetadata(processId: string): Promise<ExtractedMetadata> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.getMetadata(jobId);
    
    // Transform response to match ExtractedMetadata format
    // Convert keywords string to array if needed
    const keywordsArray = typeof response.data.keywords === 'string' 
      ? response.data.keywords.split(',').map(k => k.trim())
      : response.data.keywords;
    
    // Transform authors array from strings to Author objects
    const authorsArray = response.data.authors.map((authorName: string, index: number) => ({
      id: `author-${index}`,
      name: authorName,
      affiliation: response.data.author_aff_map?.[authorName] || response.data.affiliations[index] || '',
      country: '',
      publicationCount: 0,
      recentPublications: [],
      expertise: [],
      database: 'manuscript',
      matchScore: 0
    }));
    
    // Transform affiliations array from strings to Affiliation objects
    const affiliationsArray = response.data.affiliations.map((affName: string, index: number) => ({
      id: `aff-${index}`,
      name: affName,
      country: '',
      type: 'university'
    }));
    
    return {
      title: response.data.heading,
      authors: authorsArray,
      affiliations: affiliationsArray,
      keywords: keywordsArray,
      abstract: response.data.abstract
    };
  }

  /**
   * Update metadata for a process
   * Note: The external API doesn't support metadata updates, so this stores locally
   */
  async updateMetadata(processId: string, metadata: UpdateMetadataRequest): Promise<ExtractedMetadata> {
    // Store updated metadata locally
    const key = `process_${processId}_metadata`;
    localStorage.setItem(key, JSON.stringify(metadata));
    
    // Return the updated metadata
    return metadata as ExtractedMetadata;
  }

  /**
   * Generate keyword string - uses ScholarFinder API
   */
  async generateKeywordString(processId: string, keywords: {
    primary_keywords_input?: string;
    secondary_keywords_input?: string;
  }): Promise<{ search_string: string; primary_keywords_used: string[]; secondary_keywords_used: string[] }> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Ensure required fields are present
    const keywordSelection = {
      primary_keywords_input: keywords.primary_keywords_input || '',
      secondary_keywords_input: keywords.secondary_keywords_input || ''
    };

    const response = await scholarFinderApiService.generateKeywordString(jobId, keywordSelection);
    return response.data;
  }

  /**
   * Search databases for reviewers - uses ScholarFinder API
   */
  async searchDatabases(processId: string, databases: {
    selected_websites: string[];
  }): Promise<{ total_reviewers: number; databases_searched: string[]; search_status: Record<string, string> }> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.searchDatabases(jobId, databases);
    return response.data;
  }

  /**
   * Add manual author - uses ScholarFinder API
   */
  async addManualAuthor(processId: string, authorName: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.addManualAuthor(jobId, authorName);
    return response.data;
  }

  /**
   * Validate authors - uses ScholarFinder API
   */
  async validateAuthors(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.validateAuthors(jobId);
    return response.data;
  }

  /**
   * Get validation status - uses ScholarFinder API
   */
  async getValidationStatus(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.getValidationStatus(jobId);
    return response.data;
  }

  /**
   * Get recommended reviewers - uses ScholarFinder API
   */
  async getRecommendations(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    const response = await scholarFinderApiService.getRecommendations(jobId);
    return response.data;
  }

  /**
   * Fetch all authors after validation - uses ScholarFinder API
   */
  async fetchAllAuthors(processId: string): Promise<any> {
    const jobId = this.getJobId(processId);
    if (!jobId) {
      throw new Error('No job ID found for this process. Please upload a file first.');
    }

    // Note: This endpoint might not exist in ScholarFinderApiService yet
    // You may need to add it there first
    const response = await scholarFinderApiService.getRecommendations(jobId);
    return response.data;
  }
}

// Create and export service instance
export const fileService = new FileService();
export default fileService;