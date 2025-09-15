import { AuthUser } from './index';

// Extend Express Request interface
declare namespace Express {
  interface Request {
    requestId?: string;
    user?: AuthUser;
  }
}