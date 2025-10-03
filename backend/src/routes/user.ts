import { Router } from 'express';
import { UserController } from '@/controllers/UserController';
import { authenticate } from '@/middleware/auth';
import { apiRateLimiter } from '@/middleware/rateLimiter';
import { requestLogger, logActivity } from '@/middleware/requestLogger';

const router = Router();
const userController = new UserController();

// Apply rate limiting to all user routes
router.use(apiRateLimiter);

// Apply authentication to all user routes
router.use(authenticate);

// Apply request logging to all user routes
router.use(requestLogger({
  logAllRequests: true,
  includeBody: true,
  includeHeaders: false,
  maxBodySize: 1000
}));

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', 
  logActivity('USER_VIEW_PROFILE'),
  userController.getProfile
);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 * @body    { name?: string, phone?: string, department?: string, bio?: string }
 */
router.put('/profile', 
  logActivity('USER_UPDATE_PROFILE'),
  userController.updateProfile
);

/**
 * @route   PUT /api/user/password
 * @desc    Change user password
 * @access  Private
 * @body    { currentPassword: string, newPassword: string }
 */
router.put('/password', 
  logActivity('USER_CHANGE_PASSWORD'),
  userController.changePassword
);

/**
 * @route   POST /api/user/profile/image
 * @desc    Upload profile image
 * @access  Private
 * @body    { imageData: string, fileName: string }
 */
router.post('/profile/image', 
  logActivity('USER_UPLOAD_PROFILE_IMAGE'),
  userController.uploadProfileImage
);

export default router;