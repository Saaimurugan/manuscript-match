import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { requirePermission } from '@/middleware/permissions';
import { requestLogger, logActivity } from '@/middleware/requestLogger';
import { 
  adminRateLimiter, 
  sensitiveAdminRateLimiter, 
  adminSecurityMiddleware,
  securityMonitoring,
  ipAccessControl
} from '@/middleware/security';

const router = Router();
const adminController = new AdminController();

// Apply security monitoring to all admin routes
router.use(securityMonitoring());

// Apply rate limiting to all admin routes
router.use(adminRateLimiter);

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(requireAdmin);

// Apply admin-specific security middleware
router.use(adminSecurityMiddleware());

// Apply request logging to all admin routes
router.use(requestLogger({
  logAllRequests: true,
  excludePaths: ['/api/admin/stats'], // Don't log frequent stats requests
  includeBody: true,
  includeHeaders: true,
  maxBodySize: 2000
}));



/**
 * @route   GET /api/admin/logs
 * @desc    Get comprehensive user activity logs for administrators
 * @access  Admin only
 * @query   page, limit, userId, processId, action, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/logs', 
  logActivity('ADMIN_VIEW_ALL_LOGS'),
  adminController.getAllLogs
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', 
  logActivity('ADMIN_VIEW_STATS'),
  adminController.getAdminStats
);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get detailed user information with processes and activity
 * @access  Admin only
 */
router.get('/users/:userId', 
  logActivity('ADMIN_VIEW_USER_DETAILS'),
  adminController.getUserDetails
);

/**
 * @route   GET /api/admin/export/:type
 * @desc    Export admin data in various formats (CSV, XLSX)
 * @access  Admin only
 * @params  type: processes | logs | users
 * @query   format: csv | xlsx, startDate, endDate
 */
router.get('/export/:type', 
  logActivity('ADMIN_EXPORT_DATA'),
  adminController.exportAdminData
);

// Audit Management Routes

/**
 * @route   GET /api/admin/audit/verify
 * @desc    Verify audit trail integrity
 * @access  Admin only
 */
router.get('/audit/verify',
  requirePermission('system.monitor'),
  logActivity('ADMIN_VERIFY_AUDIT_TRAIL'),
  adminController.verifyAuditTrail
);

/**
 * @route   GET /api/admin/audit/stats
 * @desc    Get audit trail statistics
 * @access  Admin only
 */
router.get('/audit/stats',
  requirePermission('system.monitor'),
  logActivity('ADMIN_VIEW_AUDIT_STATS'),
  adminController.getAuditStatistics
);

/**
 * @route   POST /api/admin/audit/rotate
 * @desc    Manually trigger audit log rotation
 * @access  Admin only
 */
router.post('/audit/rotate',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_ROTATE_AUDIT_LOGS'),
  adminController.rotateAuditLogs
);

/**
 * @route   POST /api/admin/audit/cleanup
 * @desc    Clean up old audit archive files
 * @access  Admin only
 */
router.post('/audit/cleanup',
  sensitiveAdminRateLimiter,
  requirePermission('system.admin'),
  logActivity('ADMIN_CLEANUP_AUDIT_ARCHIVES'),
  adminController.cleanupAuditArchives
);

/**
 * @route   GET /api/admin/audit/health
 * @desc    Run comprehensive audit health check
 * @access  Admin only
 */
router.get('/audit/health',
  requirePermission('system.monitor'),
  logActivity('ADMIN_AUDIT_HEALTH_CHECK'),
  adminController.auditHealthCheck
);

// User Management Routes

/**
 * @route   POST /api/admin/users/invite
 * @desc    Invite a new user to the system
 * @access  Admin only
 * @body    { email: string, role: UserRole }
 */
router.post('/users/invite',
  sensitiveAdminRateLimiter,
  requirePermission('users.invite'),
  logActivity('ADMIN_INVITE_USER', { includeBody: true }),
  adminController.inviteUser
);

/**
 * @route   PUT /api/admin/users/:id/promote
 * @desc    Promote a user to admin status
 * @access  Admin only
 */
router.put('/users/:id/promote',
  sensitiveAdminRateLimiter,
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.manage'),
  logActivity('ADMIN_PROMOTE_USER', { includeParams: true }),
  adminController.promoteUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user from the system
 * @access  Admin only
 */
router.delete('/users/:id',
  sensitiveAdminRateLimiter,
  ipAccessControl({ blockSuspiciousIPs: true }),
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.delete'),
  logActivity('ADMIN_DELETE_USER', { includeParams: true }),
  adminController.deleteUser
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user information
 * @access  Admin only
 * @body    { email?: string, role?: UserRole, status?: UserStatus }
 */
router.put('/users/:id',
  requirePermission('users.update'),
  logActivity('ADMIN_UPDATE_USER'),
  adminController.updateUser
);

/**
 * @route   PUT /api/admin/users/:id/block
 * @desc    Block a user temporarily
 * @access  Admin only
 * @body    { reason?: string }
 */
router.put('/users/:id/block',
  sensitiveAdminRateLimiter,
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.block'),
  logActivity('ADMIN_BLOCK_USER', { includeParams: true, includeBody: true }),
  adminController.blockUser
);

/**
 * @route   PUT /api/admin/users/:id/unblock
 * @desc    Unblock a previously blocked user
 * @access  Admin only
 */
router.put('/users/:id/unblock',
  // TODO: Re-enable permission check once admin permissions are properly set up
  // requirePermission('users.manage'),
  logActivity('ADMIN_UNBLOCK_USER'),
  adminController.unblockUser
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page, limit, role, status, search, sortBy, sortOrder
 */
router.get('/users',
  requirePermission('users.read'),
  logActivity('ADMIN_VIEW_USERS'),
  adminController.getAllUsers
);

// Permission Management Routes

/**
 * @route   PUT /api/admin/users/:id/permissions
 * @desc    Assign custom permissions to a user
 * @access  Admin only
 * @body    { permissions: string[] }
 */
router.put('/users/:id/permissions',
  sensitiveAdminRateLimiter,
  requirePermission('permissions.assign'),
  logActivity('ADMIN_ASSIGN_USER_PERMISSIONS', { includeParams: true, includeBody: true }),
  adminController.assignUserPermissions
);

/**
 * @route   PUT /api/admin/roles/:role/permissions
 * @desc    Update permissions for a role
 * @access  Admin only
 * @body    { permissions: string[] }
 */
router.put('/roles/:role/permissions',
  sensitiveAdminRateLimiter,
  requirePermission('permissions.manage'),
  logActivity('ADMIN_UPDATE_ROLE_PERMISSIONS', { includeParams: true, includeBody: true }),
  adminController.updateRolePermissions
);

/**
 * @route   GET /api/admin/permissions
 * @desc    Get all available permissions
 * @access  Admin only
 */
router.get('/permissions',
  requirePermission('permissions.read'),
  logActivity('ADMIN_VIEW_PERMISSIONS'),
  adminController.getAllPermissions
);



// Activity Log Management Routes

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get activity logs with advanced filtering and pagination
 * @access  Admin only
 * @query   page, limit, userId, processId, action, resourceType, resourceId, ipAddress, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/activity-logs',
  logActivity('ADMIN_VIEW_ACTIVITY_LOGS'),
  adminController.getActivityLogs
);

/**
 * @route   GET /api/admin/activity-logs/export
 * @desc    Export activity logs in various formats (JSON, CSV, PDF)
 * @access  Admin only
 * @query   format, userId, processId, action, resourceType, resourceId, startDate, endDate, search
 */
router.get('/activity-logs/export',
  sensitiveAdminRateLimiter,
  logActivity('ADMIN_EXPORT_ACTIVITY_LOGS'),
  adminController.exportActivityLogs
);

/**
 * @route   GET /api/admin/users/:id/activity
 * @desc    Get user-specific activity logs with filtering and pagination
 * @access  Admin only
 * @query   page, limit, processId, action, resourceType, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/users/:id/activity',
  logActivity('ADMIN_VIEW_USER_ACTIVITY'),
  adminController.getUserActivityLogs
);

export default router;