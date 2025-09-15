import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authenticate } from '@/middleware/auth';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { requestLogger, logActivity } from '@/middleware/requestLogger';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to all auth routes
router.use(authRateLimiter);

// Apply request logging to all auth routes
router.use(requestLogger({
  logAllRequests: true,
  excludePaths: ['/api/auth/verify'], // Don't log token verification requests
}));

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  logActivity('USER_REGISTRATION_ATTEMPT'),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', 
  logActivity('USER_LOGIN_ATTEMPT'),
  authController.login
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify JWT token and get current user
 * @access  Private
 */
router.get('/verify', 
  authenticate,
  authController.verify
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', 
  authenticate,
  logActivity('USER_LOGOUT'),
  authController.logout
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', 
  authenticate,
  logActivity('PASSWORD_CHANGE_ATTEMPT'),
  authController.changePassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  authenticate,
  authController.profile
);

export default router;