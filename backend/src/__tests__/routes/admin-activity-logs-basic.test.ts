import request from 'supertest';
import { app } from '../../app';

describe('Admin Activity Log Routes - Basic', () => {
  describe('Route existence', () => {
    it('should have activity-logs route defined', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs')
        .expect(401); // Should get 401 without auth, not 404

      expect(response.status).toBe(401);
    });

    it('should have activity-logs export route defined', async () => {
      const response = await request(app)
        .get('/api/admin/activity-logs/export')
        .expect(401); // Should get 401 without auth, not 404

      expect(response.status).toBe(401);
    });
  });
});