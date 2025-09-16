import { Router } from 'express';
import { AdminController } from '@/controllers/AdminController';
import { authenticate, requireAdmin } from '@/middleware/auth';
import { requestLogger, logActivity } from '@/middleware/requestLogger';

const router = Router();
const adminController = new AdminController();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(requireAdmin);

// Apply request logging to all admin routes
router.use(requestLogger({
  logAllRequests: true,
  excludePaths: ['/api/admin/stats'] // Don't log frequent stats requests
}));

/**
 * @route   GET /api/admin/processes
 * @desc    Get all user processes with pagination and filtering
 * @access  Admin only
 * @query   page, limit, userId, status, startDate, endDate, search, sortBy, sortOrder
 */
router.get('/processes', 
  logActivity('ADMIN_VIEW_ALL_PROCESSES'),
  adminController.getAllProcesses
);

/**
 * @route   GET /api/admin/processes/:processId
 * @desc    Get detailed process information with full audit trail
 * @access  Admin only
 */
router.get('/processes/:processId', 
  logActivity('ADMIN_VIEW_PROCESS_DETAILS'),
  adminController.getProcessDetails
);

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

export default router;