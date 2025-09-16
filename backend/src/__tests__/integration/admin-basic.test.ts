import request from 'supertest';
import app from '@/app';
import jwt from 'jsonwebtoken';
import { config } from '@/config/environment';
import { UserRole } from '@/types';

describe('Admin Basic Integration Tests', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Create admin token
    adminToken = jwt.sign(
      {
        userId: 'admin-test-id',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Create regular user token
    userToken = jwt.sign(
      {
        userId: 'user-test-id',
        email: 'user@test.com',
        role: UserRole.USER,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  });

  describe('Authentication and Authorization', () => {
    it('should deny access to admin endpoints without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should deny access to admin endpoints for regular users', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
    });

    it('should allow access to admin endpoints for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be 401 or 403 (authentication/authorization errors)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('Admin Routes Exist', () => {
    it('should have admin processes endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have admin logs endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have admin stats endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });

    it('should have admin export endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/export/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'csv' });

      // Should not be 404 (route exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Input Validation', () => {
    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/admin/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: '0', limit: '200' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate export type', async () => {
      const response = await request(app)
        .get('/api/admin/export/invalid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .get('/api/admin/export/processes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ format: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});