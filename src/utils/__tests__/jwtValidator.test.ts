import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateTokenFormat,
  safeDecodeToken,
  isTokenExpired,
  getTokenExpirationTime,
  jwtValidator,
  JWTValidatorImpl
} from '../jwtValidator';

describe('JWT Validator Utility', () => {
  describe('validateTokenFormat', () => {
    it('should return true for valid JWT format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(validateTokenFormat(validToken)).toBe(true);
    });

    it('should return false for tokens with less than 3 parts', () => {
      expect(validateTokenFormat('header.payload')).toBe(false);
      expect(validateTokenFormat('header')).toBe(false);
      expect(validateTokenFormat('')).toBe(false);
    });

    it('should return false for tokens with more than 3 parts', () => {
      expect(validateTokenFormat('header.payload.signature.extra')).toBe(false);
    });

    it('should return false for tokens with empty parts', () => {
      expect(validateTokenFormat('.payload.signature')).toBe(false);
      expect(validateTokenFormat('header..signature')).toBe(false);
      expect(validateTokenFormat('header.payload.')).toBe(false);
    });

    it('should return false for null or undefined tokens', () => {
      expect(validateTokenFormat(null as any)).toBe(false);
      expect(validateTokenFormat(undefined as any)).toBe(false);
    });

    it('should return false for non-string tokens', () => {
      expect(validateTokenFormat(123 as any)).toBe(false);
      expect(validateTokenFormat({} as any)).toBe(false);
      expect(validateTokenFormat([] as any)).toBe(false);
    });
  });

  describe('safeDecodeToken', () => {
    const createValidToken = (payload: any, exp?: number) => {
      const header = { alg: 'HS256', typ: 'JWT' };
      const payloadWithExp = exp ? { ...payload, exp } : payload;

      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payloadWithExp)).replace(/=/g, '');
      const signature = 'fake-signature';

      return `${encodedHeader}.${encodedPayload}.${signature}`;
    };

    it('should successfully decode valid JWT token', () => {
      const payload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 };
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const token = createValidToken(payload, futureExp);

      const result = safeDecodeToken(token);

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual({ ...payload, exp: futureExp });
      expect(result.error).toBeUndefined();
    });

    it('should return INVALID_FORMAT error for malformed tokens', () => {
      const result = safeDecodeToken('invalid.token');

      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('INVALID_FORMAT');
      expect(result.error).toBe('Invalid JWT token format');
    });

    it('should return DECODE_ERROR for invalid base64 encoding', () => {
      const invalidBase64Token = 'eyJhbGciOiJIUzI1NiJ9.invalid@base64!.signature';
      const result = safeDecodeToken(invalidBase64Token);

      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('DECODE_ERROR');
      expect(result.error).toContain('Failed to decode JWT payload');
    });

    it('should return MALFORMED error for invalid JSON in payload', () => {
      // Create token with invalid JSON payload
      const invalidJsonPayload = btoa('{ invalid json }').replace(/=/g, '');
      const token = `eyJhbGciOiJIUzI1NiJ9.${invalidJsonPayload}.signature`;

      const result = safeDecodeToken(token);

      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('MALFORMED');
      expect(result.error).toBe('Invalid JSON in JWT payload');
    });

    it('should return EXPIRED error for expired tokens', () => {
      const payload = { sub: '1234567890', name: 'John Doe' };
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const token = createValidToken(payload, pastExp);

      const result = safeDecodeToken(token);

      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('EXPIRED');
      expect(result.error).toBe('JWT token has expired');
      expect(result.payload).toEqual({ ...payload, exp: pastExp });
    });

    it('should handle tokens without expiration claim', () => {
      const payload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 };
      const token = createValidToken(payload); // No exp claim

      const result = safeDecodeToken(token);

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(payload);
    });

    it('should handle URL-safe base64 encoding', () => {
      // Create a token that would have + or / characters when base64 encoded
      const payload = { data: 'test>>data??with++special//chars' };
      const futureExp = Math.floor(Date.now() / 1000) + 3600;

      const header = { alg: 'HS256', typ: 'JWT' };
      const payloadWithExp = { ...payload, exp: futureExp };

      // Use URL-safe base64 encoding
      const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const encodedPayload = btoa(JSON.stringify(payloadWithExp)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const signature = 'fake-signature';

      const token = `${encodedHeader}.${encodedPayload}.${signature}`;
      const result = safeDecodeToken(token);

      expect(result.isValid).toBe(true);
      expect(result.payload).toEqual(payloadWithExp);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired tokens', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp: futureExp };

      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should return true for expired tokens', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp: pastExp };

      expect(isTokenExpired(payload)).toBe(true);
    });

    it('should return false for tokens without exp claim', () => {
      const payload = { sub: '1234567890', name: 'John Doe' };

      expect(isTokenExpired(payload)).toBe(false);
    });

    it('should return true for invalid payload types', () => {
      expect(isTokenExpired(null)).toBe(true);
      expect(isTokenExpired(undefined)).toBe(true);
      expect(isTokenExpired('string')).toBe(true);
      expect(isTokenExpired(123)).toBe(true);
    });

    it('should return false for non-numeric exp values', () => {
      expect(isTokenExpired({ exp: 'invalid' })).toBe(false);
      expect(isTokenExpired({ exp: null })).toBe(false);
      expect(isTokenExpired({ exp: undefined })).toBe(false);
    });

    it('should handle edge case of exp exactly equal to current time', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      const payload = { exp: currentTime };

      // Should be considered expired if exp equals current time
      expect(isTokenExpired(payload)).toBe(true);
    });
  });

  describe('getTokenExpirationTime', () => {
    it('should return expiration time in milliseconds for valid payload', () => {
      const expInSeconds = Math.floor(Date.now() / 1000) + 3600;
      const payload = { exp: expInSeconds };

      const result = getTokenExpirationTime(payload);

      expect(result).toBe(expInSeconds * 1000);
    });

    it('should return null for payload without exp claim', () => {
      const payload = { sub: '1234567890', name: 'John Doe' };

      expect(getTokenExpirationTime(payload)).toBeNull();
    });

    it('should return null for invalid payload types', () => {
      expect(getTokenExpirationTime(null)).toBeNull();
      expect(getTokenExpirationTime(undefined)).toBeNull();
      expect(getTokenExpirationTime('string')).toBeNull();
      expect(getTokenExpirationTime(123)).toBeNull();
    });

    it('should return null for non-numeric exp values', () => {
      expect(getTokenExpirationTime({ exp: 'invalid' })).toBeNull();
      expect(getTokenExpirationTime({ exp: null })).toBeNull();
      expect(getTokenExpirationTime({ exp: undefined })).toBeNull();
    });
  });

  describe('JWTValidatorImpl class', () => {
    let validator: JWTValidatorImpl;

    beforeEach(() => {
      validator = new JWTValidatorImpl();
    });

    it('should implement all JWTValidator interface methods', () => {
      expect(typeof validator.validateTokenFormat).toBe('function');
      expect(typeof validator.safeDecodeToken).toBe('function');
      expect(typeof validator.isTokenExpired).toBe('function');
      expect(typeof validator.getTokenExpirationTime).toBe('function');
    });

    it('should work identically to standalone functions', () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };

      expect(validator.validateTokenFormat(token)).toBe(validateTokenFormat(token));
      expect(validator.safeDecodeToken(token)).toEqual(safeDecodeToken(token));
      expect(validator.isTokenExpired(payload)).toBe(isTokenExpired(payload));
      expect(validator.getTokenExpirationTime(payload)).toBe(getTokenExpirationTime(payload));
    });
  });

  describe('jwtValidator default instance', () => {
    it('should be an instance of JWTValidatorImpl', () => {
      expect(jwtValidator).toBeInstanceOf(JWTValidatorImpl);
    });

    it('should have all required methods', () => {
      expect(typeof jwtValidator.validateTokenFormat).toBe('function');
      expect(typeof jwtValidator.safeDecodeToken).toBe('function');
      expect(typeof jwtValidator.isTokenExpired).toBe('function');
      expect(typeof jwtValidator.getTokenExpirationTime).toBe('function');
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle extremely long tokens gracefully', () => {
      const longString = 'a'.repeat(10000);
      const longToken = `${longString}.${longString}.${longString}`;

      const result = safeDecodeToken(longToken);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('DECODE_ERROR');
    });

    it('should handle tokens with special characters', () => {
      const specialToken = 'header!@#$.payload%^&*.signature()[]';

      const result = safeDecodeToken(specialToken);
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('DECODE_ERROR');
    });

    it('should handle empty string token', () => {
      const result = safeDecodeToken('');
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('INVALID_FORMAT');
    });

    it('should handle token with only dots', () => {
      const result = safeDecodeToken('...');
      expect(result.isValid).toBe(false);
      expect(result.errorType).toBe('INVALID_FORMAT');
    });
  });
});