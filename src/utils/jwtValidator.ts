/**
 * JWT Token Validation Utility
 * Provides safe JWT token validation with comprehensive error handling
 */

import { authLogger } from './authLogger';

export interface JWTValidationResult {
  isValid: boolean;
  payload?: any;
  error?: string;
  errorType?: 'INVALID_FORMAT' | 'DECODE_ERROR' | 'EXPIRED' | 'MALFORMED';
}

export interface JWTValidator {
  validateTokenFormat(token: string): boolean;
  safeDecodeToken(token: string): JWTValidationResult;
  isTokenExpired(payload: any): boolean;
  getTokenExpirationTime(payload: any): number | null;
}

/**
 * Safe base64 URL decode function that handles padding and invalid characters
 */
function safeBase64UrlDecode(str: string): string | null {
  try {
    // Add padding if needed
    let padded = str;
    while (padded.length % 4) {
      padded += '=';
    }
    
    // Replace URL-safe characters
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode using atob with error handling
    return atob(base64);
  } catch (error) {
    return null;
  }
}

/**
 * Validates JWT token format (three parts separated by dots)
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  
  // JWT must have exactly 3 parts: header.payload.signature
  if (parts.length !== 3) {
    return false;
  }

  // Each part must be non-empty
  return parts.every(part => part.length > 0);
}

/**
 * Safely decodes JWT token with comprehensive error handling
 */
export function safeDecodeToken(token: string): JWTValidationResult {
  const validationStartTime = Date.now();
  
  // First validate token format
  if (!validateTokenFormat(token)) {
    const result = {
      isValid: false,
      error: 'Invalid JWT token format',
      errorType: 'INVALID_FORMAT' as const
    };

    // Log validation failure
    authLogger.logTokenValidation('INVALID_FORMAT', {
      tokenPresent: !!token,
      errorMessage: result.error,
      tokenLength: token?.length,
      validationStartTime,
    });

    return result;
  }

  try {
    const parts = token.split('.');
    const payloadPart = parts[1];

    // Attempt to decode the payload
    const decodedPayload = safeBase64UrlDecode(payloadPart);
    
    if (decodedPayload === null) {
      const result = {
        isValid: false,
        error: 'Failed to decode JWT payload - invalid base64 encoding',
        errorType: 'DECODE_ERROR' as const
      };

      // Log decode error
      authLogger.logTokenValidation('DECODE_ERROR', {
        tokenPresent: true,
        errorMessage: result.error,
        tokenLength: token.length,
        validationStartTime,
      });

      return result;
    }

    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(decodedPayload);
    } catch (parseError) {
      const result = {
        isValid: false,
        error: 'Invalid JSON in JWT payload',
        errorType: 'MALFORMED' as const
      };

      // Log malformed token
      authLogger.logTokenValidation('MALFORMED', {
        tokenPresent: true,
        errorMessage: result.error,
        tokenLength: token.length,
        validationStartTime,
      });

      return result;
    }

    // Extract token timestamps
    const issuedAt = payload.iat ? new Date(payload.iat * 1000) : undefined;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;

    // Check if token is expired
    if (isTokenExpired(payload)) {
      const result = {
        isValid: false,
        payload,
        error: 'JWT token has expired',
        errorType: 'EXPIRED' as const
      };

      // Log expired token
      authLogger.logTokenValidation('EXPIRED', {
        tokenPresent: true,
        errorMessage: result.error,
        tokenLength: token.length,
        expiresAt,
        issuedAt,
        validationStartTime,
      });

      return result;
    }

    // Token is valid - log success
    authLogger.logTokenValidation('VALID', {
      tokenPresent: true,
      tokenLength: token.length,
      expiresAt,
      issuedAt,
      validationStartTime,
    });

    return {
      isValid: true,
      payload
    };

  } catch (error) {
    const result = {
      isValid: false,
      error: `JWT decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorType: 'DECODE_ERROR' as const
    };

    // Log unexpected decode error
    authLogger.logTokenValidation('DECODE_ERROR', {
      tokenPresent: true,
      errorMessage: result.error,
      tokenLength: token.length,
      validationStartTime,
    });

    return result;
  }
}

/**
 * Checks if JWT token payload indicates expiration
 */
export function isTokenExpired(payload: any): boolean {
  if (!payload || typeof payload !== 'object') {
    return true; // Consider invalid payload as expired
  }

  const exp = payload.exp;
  
  // If no expiration claim, consider it valid (some tokens don't have exp)
  if (typeof exp !== 'number') {
    return false;
  }

  // Compare with current time (exp is in seconds, Date.now() is in milliseconds)
  const currentTime = Math.floor(Date.now() / 1000);
  return exp < currentTime;
}

/**
 * Gets token expiration time from payload
 */
export function getTokenExpirationTime(payload: any): number | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const exp = payload.exp;
  
  if (typeof exp !== 'number') {
    return null;
  }

  // Convert from seconds to milliseconds
  return exp * 1000;
}

/**
 * JWT Validator class implementation
 */
export class JWTValidatorImpl implements JWTValidator {
  validateTokenFormat(token: string): boolean {
    return validateTokenFormat(token);
  }

  safeDecodeToken(token: string): JWTValidationResult {
    return safeDecodeToken(token);
  }

  isTokenExpired(payload: any): boolean {
    return isTokenExpired(payload);
  }

  getTokenExpirationTime(payload: any): number | null {
    return getTokenExpirationTime(payload);
  }
}

// Export default instance
export const jwtValidator = new JWTValidatorImpl();

// Export individual functions for direct use
export { validateTokenFormat as isValidJWTFormat };