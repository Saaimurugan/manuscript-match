import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';

describe('Recommendation API Endpoints', () => {
  let authToken: string;

  beforeAll(() => {
    // Generate auth token
    authToken = jwt.sign(
      { userId: 'test-user-id', email: 'test@example.com' },
      process.env['JWT_SECRET'] || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/processes/:id/candidates', () => {
    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/candidates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/processes/${nonExistentId}/candidates`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/processes/:id/recommendations', () => {
    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/processes/${nonExistentId}/recommendations`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });

    it('should validate query parameters', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/processes/${nonExistentId}/recommendations`)
        .query({ minPublications: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/processes/:id/recommendations/filters', () => {
    it('should return 400 for invalid process ID', async () => {
      const response = await request(app)
        .get('/api/processes/invalid-id/recommendations/filters')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent process', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/processes/${nonExistentId}/recommendations/filters`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('NOT_FOUND');
    });
  });
});