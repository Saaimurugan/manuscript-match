/**
 * Example usage of permission middleware in routes
 * This file demonstrates how to integrate the permission middleware with Express routes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { 
  requirePermission,
  requirePermissions,
  requireAnyPermission,
  requireRoleOrHigher,
  checkUserBlocked,
  requireUserManagement,
  requireProcessManagement,
  requireSystemAdmin,
  RequirePermission,
  RequireRole
} from '../middleware/permissions';
import { UserRole } from '../types';

const router = Router();

// Example 1: Single permission requirement
router.get('/admin/users', 
  authenticate,
  checkUserBlocked,
  requirePermission('users.read'),
  (req, res) => {
    res.json({ message: 'User list accessed' });
  }
);

// Example 2: Multiple permissions requirement (ALL required)
router.post('/admin/users',
  authenticate,
  checkUserBlocked,
  requirePermissions(['users.create', 'users.invite']),
  (req, res) => {
    res.json({ message: 'User created' });
  }
);

// Example 3: Any permission requirement (ANY of the listed permissions)
router.put('/admin/users/:id',
  authenticate,
  checkUserBlocked,
  requireAnyPermission(['users.update', 'users.manage']),
  (req, res) => {
    res.json({ message: 'User updated' });
  }
);

// Example 4: Role-based access control
router.delete('/admin/users/:id',
  authenticate,
  checkUserBlocked,
  requireRoleOrHigher(UserRole.ADMIN),
  (req, res) => {
    res.json({ message: 'User deleted' });
  }
);

// Example 5: Using convenience middleware
router.get('/admin/processes',
  authenticate,
  checkUserBlocked,
  requireProcessManagement,
  (req, res) => {
    res.json({ message: 'Process management accessed' });
  }
);

// Example 6: System admin only
router.get('/admin/system/config',
  authenticate,
  checkUserBlocked,
  requireSystemAdmin,
  (req, res) => {
    res.json({ message: 'System configuration accessed' });
  }
);

// Example 7: Combining multiple middleware
router.post('/admin/system/reset',
  authenticate,
  checkUserBlocked,
  requireRoleOrHigher(UserRole.ADMIN),
  requirePermission('system.admin'),
  (req, res) => {
    res.json({ message: 'System reset initiated' });
  }
);

// Example Controller using decorators
class AdminController {
  @RequirePermission('users.read')
  async getUsers(req: any, res: any) {
    // Implementation here
    res.json({ users: [] });
  }

  @RequireRole(UserRole.ADMIN)
  async deleteUser(req: any, res: any) {
    // Implementation here
    res.json({ message: 'User deleted' });
  }

  @RequirePermission('processes.manage')
  async resetProcess(req: any, res: any) {
    // Implementation here
    res.json({ message: 'Process reset' });
  }
}

// Example route with controller
const adminController = new AdminController();

router.get('/admin/users/list',
  authenticate,
  checkUserBlocked,
  adminController.getUsers.bind(adminController)
);

router.delete('/admin/users/:id/delete',
  authenticate,
  checkUserBlocked,
  adminController.deleteUser.bind(adminController)
);

export default router;

/**
 * Common Permission Patterns:
 * 
 * 1. Basic Admin Route:
 *    authenticate -> checkUserBlocked -> requirePermission('specific.permission')
 * 
 * 2. Role-based Route:
 *    authenticate -> checkUserBlocked -> requireRoleOrHigher(UserRole.ADMIN)
 * 
 * 3. Multiple Permissions (ALL required):
 *    authenticate -> checkUserBlocked -> requirePermissions(['perm1', 'perm2'])
 * 
 * 4. Multiple Permissions (ANY required):
 *    authenticate -> checkUserBlocked -> requireAnyPermission(['perm1', 'perm2'])
 * 
 * 5. Resource Ownership:
 *    authenticate -> checkUserBlocked -> requireOwnershipOrPermission('userId', 'admin.permission')
 * 
 * 6. Convenience Middleware:
 *    authenticate -> checkUserBlocked -> requireUserManagement
 *    authenticate -> checkUserBlocked -> requireProcessManagement
 *    authenticate -> checkUserBlocked -> requireSystemAdmin
 */