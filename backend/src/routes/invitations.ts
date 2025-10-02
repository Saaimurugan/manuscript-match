import { Router } from 'express';
import { InvitationController } from '../controllers/InvitationController';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const invitationController = new InvitationController();

/**
 * @route   GET /api/invitations/validate/:token
 * @desc    Validate an invitation token
 * @access  Public
 */
router.get('/validate/:token',
  apiRateLimiter,
  invitationController.validateInvitation
);

/**
 * @route   POST /api/invitations/accept
 * @desc    Accept an invitation and create user account
 * @access  Public
 * @body    { token: string, password: string, name?: string }
 */
router.post('/accept',
  apiRateLimiter,
  invitationController.acceptInvitation
);

/**
 * @route   GET /api/invitations/:token
 * @desc    Get invitation details by token
 * @access  Public
 */
router.get('/:token',
  apiRateLimiter,
  invitationController.getInvitationDetails
);

export default router;