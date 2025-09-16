import { Express } from 'express';
import app from '../../app';

export const testApp = app;

export async function createTestApp(): Promise<Express> {
  return app;
}