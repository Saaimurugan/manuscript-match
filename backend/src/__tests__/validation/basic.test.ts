import {
  createUserSchema,
  createProcessSchema,
  createAuthorSchema,
  validateId,
  validateEmail,
} from '../../validation/schemas';
import { ProcessStatus } from '../../types';

describe('Basic Validation Tests', () => {
  describe('User Schema', () => {
    it('should validate valid user data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const { error } = createUserSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid user data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // too short
      };

      const { error } = createUserSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Process Schema', () => {
    it('should validate valid process data', () => {
      const validData = {
        title: 'My Research Process',
        status: ProcessStatus.CREATED,
      };

      const { error } = createProcessSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject empty title', () => {
      const invalidData = {
        title: '',
      };

      const { error } = createProcessSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Author Schema', () => {
    it('should validate valid author data', () => {
      const validData = {
        name: 'Dr. John Smith',
        email: 'john.smith@university.edu',
        publicationCount: 25,
      };

      const { error } = createAuthorSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate minimal author data', () => {
      const validData = {
        name: 'Dr. John Smith',
      };

      const { error } = createAuthorSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('Validation Helpers', () => {
    describe('validateId', () => {
      it('should validate valid UUID', () => {
        const validId = '123e4567-e89b-12d3-a456-426614174000';
        expect(() => validateId(validId)).not.toThrow();
      });

      it('should throw error for invalid UUID', () => {
        const invalidId = 'invalid-id';
        expect(() => validateId(invalidId)).toThrow();
      });
    });

    describe('validateEmail', () => {
      it('should validate valid email', () => {
        const validEmail = 'test@example.com';
        expect(() => validateEmail(validEmail)).not.toThrow();
      });

      it('should throw error for invalid email', () => {
        const invalidEmail = 'invalid-email';
        expect(() => validateEmail(invalidEmail)).toThrow();
      });
    });
  });
});