import { Express } from 'express';
import app from '../../app';

export const testApp = app;

export function createTestApp(): Express {
  return app;
}