import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validate, validateBody, validateQuery, validateParams, ValidationException } from '../../validation';

// Mock Express objects
const mockRequest = (data: any, property: 'body' | 'query' | 'params' = 'body') => ({
  [property]: data,
}) as Request;

const mockResponse = () => ({}) as Response;

const mockNext = jest.fn() as NextFunction;

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0).optional(),
      email: Joi.string().email().optional(),
    });

    it('should validate valid data and call next', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const req = mockRequest(validData);
      const res = mockResponse();
      const middleware = validate(testSchema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual(validData);
    });

    it('should strip unknown properties', () => {
      const dataWithUnknown = {
        name: 'John Doe',
        age: 30,
        unknownField: 'should be removed',
      };

      const expectedData = {
        name: 'John Doe',
        age: 30,
      };

      const req = mockRequest(dataWithUnknown);
      const res = mockResponse();
      const middleware = validate(testSchema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual(expectedData);
    });

    it('should throw ValidationException for invalid data', () => {
      const invalidData = {
        age: -5, // invalid age
        email: 'invalid-email', // invalid email
        // missing required name
      };

      const req = mockRequest(invalidData);
      const res = mockResponse();
      const middleware = validate(testSchema, 'body');

      expect(() => middleware(req, res, mockNext)).toThrow(ValidationException);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate query parameters', () => {
      const validQuery = {
        name: 'John Doe',
        age: '30',
      };

      const req = mockRequest(validQuery, 'query');
      const res = mockResponse();
      const middleware = validate(testSchema, 'query');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query).toEqual({
        name: 'John Doe',
        age: 30, // Should be converted to number
      });
    });

    it('should validate path parameters', () => {
      const validParams = {
        name: 'John Doe',
      };

      const req = mockRequest(validParams, 'params');
      const res = mockResponse();
      const middleware = validate(testSchema, 'params');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.params).toEqual(validParams);
    });
  });

  describe('validateBody', () => {
    it('should create body validation middleware', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      const validData = { name: 'John Doe' };
      const req = mockRequest(validData);
      const res = mockResponse();
      const middleware = validateBody(schema);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual(validData);
    });
  });

  describe('validateQuery', () => {
    it('should create query validation middleware', () => {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
      });

      const queryData = { page: '2', limit: '50' };
      const req = mockRequest(queryData, 'query');
      const res = mockResponse();
      const middleware = validateQuery(schema);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.query).toEqual({
        page: 2,
        limit: 50,
      });
    });
  });

  describe('validateParams', () => {
    it('should create params validation middleware', () => {
      const schema = Joi.object({
        id: Joi.string().uuid().required(),
      });

      const paramsData = { id: '123e4567-e89b-12d3-a456-426614174000' };
      const req = mockRequest(paramsData, 'params');
      const res = mockResponse();
      const middleware = validateParams(schema);

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.params).toEqual(paramsData);
    });
  });

  describe('ValidationException', () => {
    it('should create ValidationException with errors', () => {
      const errors = [
        {
          field: 'name',
          message: 'Name is required',
          value: undefined,
        },
        {
          field: 'email',
          message: 'Email must be valid',
          value: 'invalid-email',
        },
      ];

      const exception = new ValidationException(errors);

      expect(exception.name).toBe('ValidationException');
      expect(exception.message).toBe('Validation failed');
      expect(exception.statusCode).toBe(400);
      expect(exception.errors).toEqual(errors);
    });

    it('should be instance of Error', () => {
      const errors = [
        {
          field: 'name',
          message: 'Name is required',
        },
      ];

      const exception = new ValidationException(errors);

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(ValidationException);
    });
  });

  describe('Error handling with multiple validation errors', () => {
    it('should collect all validation errors', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().integer().min(0).required(),
        email: Joi.string().email().required(),
      });

      const invalidData = {
        age: -5,
        email: 'invalid-email',
        // missing name
      };

      const req = mockRequest(invalidData);
      const res = mockResponse();
      const middleware = validate(schema, 'body');

      try {
        middleware(req, res, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        const validationError = error as ValidationException;
        expect(validationError.errors).toHaveLength(3);
        
        const errorFields = validationError.errors.map(e => e.field);
        expect(errorFields).toContain('name');
        expect(errorFields).toContain('age');
        expect(errorFields).toContain('email');
      }

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Type coercion', () => {
    it('should coerce string numbers to numbers', () => {
      const schema = Joi.object({
        age: Joi.number().integer().required(),
        score: Joi.number().required(),
      });

      const stringData = {
        age: '25',
        score: '95.5',
      };

      const req = mockRequest(stringData);
      const res = mockResponse();
      const middleware = validate(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual({
        age: 25,
        score: 95.5,
      });
    });

    it('should coerce string booleans to booleans', () => {
      const schema = Joi.object({
        active: Joi.boolean().required(),
        verified: Joi.boolean().required(),
      });

      const stringData = {
        active: 'true',
        verified: 'false',
      };

      const req = mockRequest(stringData);
      const res = mockResponse();
      const middleware = validate(schema, 'body');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.body).toEqual({
        active: true,
        verified: false,
      });
    });
  });
});