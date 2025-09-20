/**
 * File validation utilities
 * Provides comprehensive file validation for uploads
 */

import { config } from './config';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedMimeTypes?: string[];
  minSize?: number;
}

/**
 * MIME type mappings for supported file extensions
 */
const MIME_TYPE_MAP: Record<string, string[]> = {
  'pdf': ['application/pdf'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'txt': ['text/plain'],
  'rtf': ['application/rtf', 'text/rtf'],
};

/**
 * Get expected MIME types for a file extension
 */
export const getExpectedMimeTypes = (extension: string): string[] => {
  return MIME_TYPE_MAP[extension.toLowerCase()] || [];
};

/**
 * Validate file extension
 */
export const validateFileExtension = (fileName: string, allowedTypes: string[]): FileValidationResult => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return {
      isValid: false,
      error: 'File must have a valid extension'
    };
  }
  
  if (!allowedTypes.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file type. Supported formats: ${allowedTypes.join(', ')}`
    };
  }
  
  return { isValid: true };
};

/**
 * Validate file size
 */
export const validateFileSize = (fileSize: number, options: { maxSize?: number; minSize?: number }): FileValidationResult => {
  const { maxSize = config.maxFileSize, minSize = 1 } = options;
  
  if (fileSize < minSize) {
    return {
      isValid: false,
      error: 'File appears to be empty or corrupted'
    };
  }
  
  if (fileSize > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const currentSizeMB = Math.round(fileSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size must be less than ${maxSizeMB}MB. Current size: ${currentSizeMB}MB`
    };
  }
  
  return { isValid: true };
};

/**
 * Validate MIME type
 */
export const validateMimeType = (file: File, allowedTypes: string[]): FileValidationResult => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return {
      isValid: false,
      error: 'Unable to determine file type'
    };
  }
  
  const expectedMimeTypes = getExpectedMimeTypes(extension);
  
  if (expectedMimeTypes.length === 0) {
    return {
      isValid: false,
      error: `Unsupported file type: ${extension}`
    };
  }
  
  // Check if the file's MIME type matches expected types
  if (!expectedMimeTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type mismatch. Expected ${extension} file but received ${file.type || 'unknown type'}`
    };
  }
  
  return { isValid: true };
};

/**
 * Validate file name
 */
export const validateFileName = (fileName: string): FileValidationResult => {
  const warnings: string[] = [];
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return {
      isValid: false,
      error: 'File name contains invalid characters'
    };
  }
  
  // Check file name length
  if (fileName.length > 255) {
    return {
      isValid: false,
      error: 'File name is too long (maximum 255 characters)'
    };
  }
  
  // Check for very long file names (warning)
  if (fileName.length > 100) {
    warnings.push('File name is quite long and may cause display issues');
  }
  
  // Check for special characters that might cause issues
  const specialChars = /[#%&{}\\<>*?/$!'":@+`|=]/;
  if (specialChars.test(fileName)) {
    warnings.push('File name contains special characters that might cause issues');
  }
  
  return { 
    isValid: true, 
    warnings: warnings.length > 0 ? warnings : undefined 
  };
};

/**
 * Comprehensive file validation
 */
export const validateFile = (file: File, options?: FileValidationOptions): FileValidationResult => {
  const {
    maxSize = config.maxFileSize,
    allowedTypes = config.supportedFileTypes,
    minSize = 1
  } = options || {};
  
  // Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // Validate file extension
  const extensionValidation = validateFileExtension(file.name, allowedTypes);
  if (!extensionValidation.isValid) {
    return extensionValidation;
  }
  
  // Validate file size
  const sizeValidation = validateFileSize(file.size, { maxSize, minSize });
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }
  
  // Validate MIME type
  const mimeValidation = validateMimeType(file, allowedTypes);
  if (!mimeValidation.isValid) {
    return mimeValidation;
  }
  
  // Collect all warnings
  const allWarnings = [
    ...(nameValidation.warnings || []),
    ...(extensionValidation.warnings || []),
    ...(sizeValidation.warnings || []),
    ...(mimeValidation.warnings || [])
  ];
  
  return {
    isValid: true,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get file type description
 */
export const getFileTypeDescription = (extension: string): string => {
  const descriptions: Record<string, string> = {
    'pdf': 'PDF Document',
    'doc': 'Microsoft Word Document (Legacy)',
    'docx': 'Microsoft Word Document',
    'txt': 'Plain Text Document',
    'rtf': 'Rich Text Format Document'
  };
  
  return descriptions[extension.toLowerCase()] || `${extension.toUpperCase()} File`;
};

/**
 * Check if file type supports metadata extraction
 */
export const supportsMetadataExtraction = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const supportedForExtraction = ['pdf', 'doc', 'docx'];
  
  return extension ? supportedForExtraction.includes(extension) : false;
};